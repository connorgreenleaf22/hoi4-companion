import fs from 'node:fs';import path from 'node:path';
import {seedLabFixture} from './lab-fixture';import {openStore} from '../../server/store';import type {Entry} from '../../src/types';
/** Synthetic, cached-source fixture. Never reads an installed game, profile, key or save. */
export function copyStrategyDraftFixture(original:string,target:string){
 seedLabFixture(original);const store=openStore(original);try{
  const tree:Entry={uid:'strategy-tree',id:'strategy-tree',kind:'focus_tree',title:'Synthetic strategy tree',description:'Fixture',source:'fixture.txt',line:1,hash:'f'.repeat(64),version:'nav01-fixture',data:{countries:['GER','FRA']}};
  store.insert(tree);store.insert({...tree,uid:'strategy-focus',id:'strategy-focus',kind:'focus',title:'Synthetic economic focus',data:{treeId:tree.id,days:70,prerequisites:[],exclusive:[],nodes:[]}});
  for(const id of ['nav-a','nav-b']){const profile=store.profile(id)!;store.saveProfile({...profile,tree:tree.uid});}
 }finally{store.db.close();}fs.copyFileSync(path.join(original,'companion.sqlite'),path.join(target,'companion.sqlite'));
}
