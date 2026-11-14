import fs from 'node:fs';import path from 'node:path';
import {openStore} from '../../server/store';import {validateProfile} from '../../server/api';import type {Entry} from '../../src/types';
/** Synthetic legacy saved templates only. Never reads a user's database or game files. */
export function seedLabFixture(directory:string){
  const store=openStore(directory);
  try{
    const insert=(kind:string,id:string,data:any={})=>{const e:Entry={uid:kind+':fixture:'+id,id,kind,title:id,description:'Synthetic NAV-01 fixture',source:'fixture.txt',line:1,hash:'f'.repeat(64),version:'nav01-fixture',data};store.insert(e);};
    for(const id of ['GER','FRA'])insert('country',id,{countries:[id]});
    insert('unit','infantry',{stats:{combat_width:2,manpower:1000,supply_consumption:.06,max_organisation:60},need:{infantry_equipment:100}});
    insert('unit','engineer',{support:true,stats:{combat_width:0,manpower:500,supply_consumption:.02,max_organisation:20},need:{infantry_equipment:10}});
    insert('equipment','infantry_equipment_1',{stats:{build_cost_ic:.5},resolvedStats:{build_cost_ic:.5},productionSupport:{supported:true}});
    store.setSetting('meta',{root:'synthetic',version:'nav01-fixture',gameVersion:'nav01-fixture',indexRevision:'nav01-index',importerRevision:5,dbSchemaVersion:3,indexedAt:'2026-11-12T00:00:00Z',counts:{country:2,unit:2,equipment:1},files:1,warnings:[],dlcs:[],mods:[],defines:{BASE_FACTORY_SPEED_MIL:4.5}});
    // An absent installation retains the cached fixture in the actual packaged runtime.
    store.setSetting('gameRoot',path.join(directory,'absent-fixture-installation'));
    for(const [id,country] of [['nav-a','GER'],['nav-b','FRA']])store.saveProfile(validateProfile({id,name:id,country,tree:'',startDate:'1936-01-01',historical:true,goals:'Keep legacy goal',queue:[],completed:[],notes:{legacy:'Unicode Ω 日本語'},bookmarks:['missing-old-reference'],templates:[{name:'Legacy saved',rows:[{id:'infantry',count:8}]}],dlcs:[],dlcConfirmed:false}));
    store.setSetting('selectedProfileId','nav-a');
  }finally{store.db.close();}
}
export function copyLabFixture(original:string,target:string){seedLabFixture(original);fs.copyFileSync(path.join(original,'companion.sqlite'),path.join(target,'companion.sqlite'));}
