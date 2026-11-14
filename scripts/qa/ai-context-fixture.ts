import fs from 'node:fs';import path from 'node:path';
import {copyStrategyDraftFixture} from './strategy-draft-fixture';
import {openStore} from '../../server/store';import type {Entry,Node} from '../../src/types';

export const germanyObjective='Give me a Germany 1936 campaign strategy with infantry and medium tanks, research and production. Prioritize fun, then winning, then efficiency. Current campaign state is unknown.';
export const contextMarkers={requirement:'LAST_REQUIREMENT_MARKER_Ω',gap:'UNKNOWN_CONTEXT_GUARD',privateNote:'PRIVATE_CAMPAIGN_NOTE_NOT_FOR_CONTEXT'};
/** Only generated fixture definitions; no installed source or personal data. */
export function copyAiContextFixture(original:string,target:string){
 copyStrategyDraftFixture(original,target);const store=openStore(original);
 try{
  const tree=store.entry('strategy-tree')!;
  const focus=(uid:string,count:number):Entry=>{
   const conditions:Node[]=Array.from({length:count},(_,i)=>({key:'has_idea',value:`idea_${uid}_${i}_${'x'.repeat(450)}${i===count-1?contextMarkers.requirement:''}`,line:i+10}));
   conditions.push({key:contextMarkers.gap+'_'+uid,value:'yes',line:count+10});
   return {...tree,uid,id:'GER_'+uid,kind:'focus',title:'Infantry medium tanks research production '+uid,description:'Generated size/dependency fixture; no gameplay claim.',data:{treeId:tree.id,days:70,prerequisites:[['GER_budget_root']],exclusive:[],nodes:[{key:'available',value:conditions,line:2}]}};
  };
  store.insert({...tree,uid:'budget-root',id:'GER_budget_root',kind:'focus',title:'Required synthetic root',data:{treeId:tree.id,days:70,prerequisites:[],exclusive:[],nodes:[]}});
  store.insert(focus('00-huge',440));
  for(let i=1;i<=18;i++)store.insert(focus('budget-'+String(i).padStart(2,'0'),24));
  store.insert({...tree,uid:'budget-tools',id:'basic_machine_tools',kind:'technology',title:'Synthetic basic tools',data:{nodes:[{key:'research_cost',value:'1',line:1},{key:'start_year',value:'1936',line:2}]}});
  const profile=store.profile('nav-a')!;store.saveProfile({...profile,notes:{...profile.notes,fixturePrivate:contextMarkers.privateNote}});
  const meta=store.getSetting<any>('meta',{});store.setSetting('meta',{...meta,counts:Object.fromEntries(store.db.prepare('SELECT kind,count(*) AS n FROM entries GROUP BY kind').all().map(row=>[row.kind,Number(row.n)]))});
 }finally{store.db.close();}
 fs.copyFileSync(path.join(original,'companion.sqlite'),path.join(target,'companion.sqlite'));
}
