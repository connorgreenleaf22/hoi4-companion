import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { Entry } from '../src/types';

export const SCHEMA_VERSION=3;
export const schemaSQL=`
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sources(path TEXT PRIMARY KEY,hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS entries(uid TEXT PRIMARY KEY,id TEXT,kind TEXT,title TEXT,description TEXT,source TEXT,payload TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS entries_kind ON entries(kind);
  CREATE INDEX IF NOT EXISTS entries_id ON entries(id);
  CREATE INDEX IF NOT EXISTS entries_source ON entries(source);
  CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(uid UNINDEXED,id,title,description,tokenize='unicode61 remove_diacritics 2');
  CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS profile_tombstones(id TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS aliases(alias TEXT NOT NULL,entity_key TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(alias,entity_key));
  CREATE INDEX IF NOT EXISTS aliases_entity ON aliases(entity_key);
  CREATE TABLE IF NOT EXISTS entity_definitions(uid TEXT PRIMARY KEY,entity_key TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS definitions_entity ON entity_definitions(entity_key);
  CREATE TABLE IF NOT EXISTS relationships(id TEXT PRIMARY KEY,from_uid TEXT NOT NULL,to_uid TEXT,type TEXT NOT NULL,payload TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS relationships_from ON relationships(from_uid);
  CREATE INDEX IF NOT EXISTS relationships_to ON relationships(to_uid);
`;
export const logicalKey=(e:Entry)=>e.entityKey||`vanilla:${e.kind}:${e.data.semanticScope||e.data.treeId||e.data.parentKey||''}${e.data.anonymousIdentity?'@source:'+e.hash:''}:${e.id}`;
export function stampEntry(e:Entry){
  e.entityKey=logicalKey(e);
  e.verification??='extracted';
  e.evidence??=[{class:e.data.editorial?'editorial':e.source.startsWith('documentation/')?'bundled-doc':'installed-script',source:e.source,line:e.line,hash:e.hash,gameVersion:e.version,rule:'knowledge-foundation-5'}];
  return e;
}
export class MigrationRequired extends Error {
  constructor(public directory:string){super('Close all other HOI4 Companion desktop and browser services, then migrate this database with a verified backup. Use --migrate --closed-apps or the desktop migration prompt.');}
}
export function ensureSchema(db:DatabaseSync,directory:string){
  const version=Number(db.prepare('PRAGMA user_version').get()?.user_version||0);
  if(version>SCHEMA_VERSION)throw new Error(`Database schema ${version} is newer than supported schema ${SCHEMA_VERSION}. Use the newer app; no downgrade was attempted.`);
  const existing=!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'").get();
  if(existing&&version<SCHEMA_VERSION)throw new MigrationRequired(directory);
  if(version===SCHEMA_VERSION)return;
  db.exec('BEGIN IMMEDIATE');
  try{db.exec(schemaSQL);db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
const sha=(file:string)=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function inspect(file:string){
  const db=new DatabaseSync(file,{readOnly:true});
  try{
    const integrity=String(db.prepare('PRAGMA integrity_check').get()?.integrity_check);
    if(integrity!=='ok')throw new Error(`Database integrity check failed: ${integrity}`);
    const hasProfiles=!!db.prepare("SELECT name FROM sqlite_master WHERE name='profiles'").get();
    return {integrity,schema:Number(db.prepare('PRAGMA user_version').get()?.user_version||0),profiles:hasProfiles?Number(db.prepare('SELECT COUNT(*) AS n FROM profiles').get()?.n):0};
  }finally{db.close();}
}
function requireQuiescent(file:string){
  const db=new DatabaseSync(file);try{
    db.exec('PRAGMA busy_timeout=1000; PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE; COMMIT;');
    const result=db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();
    if(result&&Number(result.busy)!==0)throw new Error('Database is in use. Close every Companion service before migration or recovery.');
  }finally{db.close();}
}
/** Caller must close every Companion service. Backup is copied only after checkpoint and database close. */
export function migrateStore(directory:string,options:{closedApps:boolean;beforeCommit?:()=>void}){
  if(options.closedApps!==true)throw new Error('Close all Companion services and explicitly confirm closedApps before migration.');
  const file=path.join(directory,'companion.sqlite');
  if(!fs.existsSync(file))throw new Error('No existing database to migrate.');
  const before=inspect(file);
  if(before.schema>SCHEMA_VERSION)throw new Error('A newer database cannot be migrated by this app.');
  if(before.schema===SCHEMA_VERSION)return {migrated:false,backup:null,schema:SCHEMA_VERSION};
  requireQuiescent(file);
  const backupDir=path.join(directory,'migration-backups');fs.mkdirSync(backupDir,{recursive:true});
  const backup=path.join(backupDir,`companion-schema-${before.schema}-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}.sqlite`);
  fs.copyFileSync(file,backup,fs.constants.COPYFILE_EXCL);
  const evidence={backup,sha256:sha(backup),createdAt:new Date().toISOString(),...inspect(backup),targetSchema:SCHEMA_VERSION,closedAppsConfirmed:true};
  fs.writeFileSync(`${backup}.json`,JSON.stringify(evidence,null,2));
  if(evidence.sha256!==sha(file)||evidence.profiles!==before.profiles)throw new Error('Backup verification failed; migration was not started.');
  const db=new DatabaseSync(file);
  try{
    db.exec('PRAGMA busy_timeout=1000; PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE;');
    db.exec(schemaSQL);
    const put=db.prepare('INSERT OR REPLACE INTO aliases VALUES(?,?,?)');const definition=db.prepare('INSERT OR REPLACE INTO entity_definitions VALUES(?,?)');
    for(const row of db.prepare('SELECT uid,payload FROM entries').all()){
      const e=stampEntry(JSON.parse(row.payload as string));
      db.prepare('UPDATE entries SET payload=? WHERE uid=?').run(JSON.stringify(e),e.uid);
      put.run(e.uid,e.entityKey!,JSON.stringify({id:e.id,title:e.title,kind:e.kind,source:e.source}));definition.run(e.uid,e.entityKey!);
    }
    options.beforeCommit?.();
    db.exec(`PRAGMA user_version=${SCHEMA_VERSION}; COMMIT;`);
  }catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}finally{db.close();}
  const after=inspect(file);if(after.profiles!==before.profiles)throw new Error('Migration profile count changed. Restore the verified backup before use.');
  return {migrated:true,backup,schema:SCHEMA_VERSION,evidence,after};
}
export function restoreStore(directory:string,backup:string,options:{closedApps:boolean}){
  if(options.closedApps!==true)throw new Error('Close all Companion services before recovery.');
  const manifest=JSON.parse(fs.readFileSync(`${backup}.json`,'utf8'));
  if(sha(backup)!==manifest.sha256)throw new Error('Backup hash does not match its manifest. Recovery stopped.');
  const check=inspect(backup);if(check.integrity!=='ok')throw new Error('Backup is not readable.');
  const file=path.join(directory,'companion.sqlite');requireQuiescent(file);
  const beforeRestore=path.join(directory,`companion-before-restore-${randomUUID()}.sqlite`);fs.copyFileSync(file,beforeRestore,fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(`${beforeRestore}.json`,JSON.stringify({backup:beforeRestore,sha256:sha(beforeRestore),createdAt:new Date().toISOString(),...inspect(beforeRestore),closedAppsConfirmed:true},null,2));
  fs.copyFileSync(backup,file);return {restored:true,beforeRestore,...inspect(file)};
}
