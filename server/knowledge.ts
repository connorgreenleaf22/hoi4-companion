import { createHash } from 'node:crypto';
import type { Entry, Node, Relationship, TargetRef } from '../src/types';
import { block, scalar } from './parser';

const values=(nodes:Node[])=>nodes.flatMap(n=>typeof n.value==='string'?[n.value]:[]);
const gates=new Set(['allowed','allow','available','visible','trigger','potential','enable','limit','bypass','cancel','allow_branch','target_trigger','level_requirements']);
const ai=new Set(['ai_will_do','ai_will_use','ai_strategy','ai_strategy_plan','ai_weight','ai_chance']);

/** Category symbols are references to exact declarations, not simulated compatibility results. */
export function buildCategoryEntries(entries:Entry[]):Entry[]{
  const symbols=new Map<string,{entry:Entry;node:Node;path:string}[]>();
  for(const entry of entries)if(['module','equipment'].includes(entry.kind)){
    const record=(id:string,node:Node,path:string)=>{if(!id)return;const refs=symbols.get(id)||[];if(!refs.some(r=>r.entry.uid===entry.uid&&r.node.line===node.line&&r.path===path))refs.push({entry,node,path});symbols.set(id,refs);};
    const scan=(nodes:Node[],scope:string[])=>{for(const n of nodes){const b=Array.isArray(n.value)?n.value:[];const here=[...scope,n.key];if(n.key==='category'&&typeof n.value==='string')record(n.value,n,here.join('/'));if(n.key==='allowed_module_categories'){for(const c of b)if(typeof c.value==='string')record(c.value,c,here.join('/'));else for(const value of c.value)if(typeof value.value==='string')record(value.value,value,[...here,c.key].join('/'));}if(b.length)scan(b,here);}};
    scan(entry.data.nodes||[],[]);
  }
  return [...symbols].sort(([a],[b])=>a.localeCompare(b)).map(([id,refs])=>{
    const declarations=refs.map(r=>({uid:r.entry.uid,source:r.entry.source,line:r.node.line,hash:r.entry.hash,path:r.path}));const digest=createHash('sha256').update(JSON.stringify(declarations)).digest('hex');
    return {uid:`module_category:companion/derived/module_categories:${id}`,entityKey:`vanilla:module_category::${id}`,id,kind:'module_category',title:id.replaceAll('_',' '),description:'Declared module category. Follow incoming links to modules and slot/category constraints.',source:'companion/derived/module_categories',line:1,version:refs[0].entry.version,hash:digest,verification:'extracted' as const,evidence:refs.map(r=>({class:'installed-script' as const,source:r.entry.source,line:r.node.line,hash:r.entry.hash,gameVersion:r.entry.version,rule:'exact-module-category-symbol-v5'})),data:{declarationOnly:true,declarations,aliases:[id,id.replaceAll('_',' ')],unknowns:['This is an exact declared category symbol. Category membership and slot acceptance do not establish compatibility of an entire design.'],nodes:[],script:''}};
  });
}

/** Extract declarations, retaining the containing expression and scope. This is not a game evaluator. */
export function buildRelationships(entries:Entry[]):Relationship[]{
  const result:Relationship[]=[];
  const dlcs=new Map(entries.filter(e=>e.kind==='dlc').map(e=>[e.title,e.id]));
  const byUid=new Map(entries.map(e=>[e.uid,e]));
  const focusById=new Map<string,Entry[]>();
  for(const e of entries)if(['focus','shared_focus','joint_focus'].includes(e.kind))focusById.set(e.id,[...(focusById.get(e.id)||[]),e]);
  const childrenByUid=new Map<string,Entry[]>();
  for(const e of entries)if(e.data.parentUid)childrenByUid.set(e.data.parentUid,[...(childrenByUid.get(e.data.parentUid)||[]),e]);
  for(const entry of entries){
    const baseNodes:Node[]=entry.data.nodes||[];
    const inherited:Node[]=entry.data.inheritedConditions||[];
    const initial=baseNodes.filter(n=>gates.has(n.key));
    const key=entry.entityKey||`vanilla:${entry.kind}:${entry.data.semanticScope||entry.data.treeId||entry.data.parentKey||''}:${entry.id}`;
    let ordinal=0;
    const focusTarget=(id:string):TargetRef=>{const choices=focusById.get(id)||[];const local=choices.filter(e=>e.data.treeId===entry.data.treeId&&e.data.treeId);const global=choices.filter(e=>!e.data.treeId);const matched=local.length?local:global;return matched.length===1?{id,kind:matched[0].kind,entityKey:matched[0].entityKey}:{id,scope:local.length?entry.data.treeId:undefined};};
    function edge(type:string,targetRef:TargetRef,node:Node,scope:string[],condition:Node[]=[],details:Node[]=[] ,unsupported=false){
      if(!targetRef.id)return;
      result.push({id:createHash('sha256').update(`${entry.uid}\0${ordinal++}\0${type}\0${targetRef.id}\0${scope.join('/')}`).digest('hex'),from:entry.uid,fromKey:key,type,targetRef,resolution:unsupported?'unsupported':'unresolved',reason:unsupported?'declaration-target-not-an-entity':undefined,candidates:[],condition:[...inherited,...initial,...condition],scope,group:scope.join('/'),evidence:{class:entry.evidence?.[0]?.class||'installed-script',source:entry.source,line:node.line,hash:entry.hash,gameVersion:entry.version,rule:'knowledge-declarations-v5'},details});
    }
    if(entry.data.parentUid){const parent=byUid.get(entry.data.parentUid);if(parent){edge('belongs-to',{id:parent.id,kind:parent.kind,entityKey:parent.entityKey}, {key:'parent',value:parent.id,line:entry.line},['parent']);}}
    // Parent-to-child edges use exact logical keys, rather than title searches or prefix limits.
    for(const child of childrenByUid.get(entry.uid)||[])edge('has-'+child.kind.replaceAll('_','-'),{id:child.id,kind:child.kind,entityKey:child.entityKey},{key:child.kind,value:child.id,line:child.line},[child.kind]);
    if(entry.kind==='idea'&&entry.data.group)edge('belongs-to',{id:entry.data.group,kind:'idea_category'},{key:'group',value:entry.data.group,line:entry.line},['idea-category']);
    if(['decision','formable'].includes(entry.kind)&&entry.data.category)edge('belongs-to',{id:entry.data.category,kind:'decision_category'},{key:'category',value:entry.data.category,line:entry.line},['decision-category']);

    function scan(nodes:Node[],scope:string[],conditions:Node[],aiContext=false){
      const seen=new Map<string,number>();
      for(const n of nodes){
        const count=(seen.get(n.key)||0)+1;seen.set(n.key,count);
        const here=[...scope,`${n.key||'item'}[${count}]`];
        const inAI=aiContext||ai.has(n.key);
        const b=Array.isArray(n.value)?n.value:[];
        const v=typeof n.value==='string'?n.value:'';
        // Complete branch AST retains repeated AND/OR/NOT, unknown scripted calls and comparisons.
        const conditional=['if','else_if','else','random_list','random','hidden_effect','random_owned_controlled_state','random_country'].includes(n.key)||/^\d{4}\.\d{1,2}\.\d{1,2}/.test(n.key)||(scope.at(-1)?.startsWith('random_list[')&&/^\d+(?:\.\d+)?$/.test(n.key));
        // Preserve branch selectors rather than duplicate unrelated effect bodies on every edge.
        const selectors=b.filter(c=>gates.has(c.key)||['chance','factor','modifier'].includes(c.key));
        const previousBranches=nodes.slice(0,nodes.indexOf(n)).filter(c=>['if','else_if'].includes(c.key)&&Array.isArray(c.value)).map(c=>({...c,value:(c.value as Node[]).filter(x=>x.key==='limit')}));
        const marker:Node={...n,value:[...(['else','else_if'].includes(n.key)?[{key:'preceding_branches',value:previousBranches,line:n.line}]:[]),...selectors]};
        const nextConditions=conditional?[...conditions,marker]:conditions;
        const emit=(type:string,id:string,kind?:string,details:Node[]=b,unsupported=false)=>edge(type,{id,kind},n,here,nextConditions,details,unsupported);
        if(n.key==='has_dlc')emit((!inAI&&(scope.some(s=>gates.has(s.split('[')[0]))||gates.has(n.key)))?'requires-dlc':'mentions-dlc',dlcs.get(v)||v,'dlc',[n]);
        if(n.key==='enable_equipments')for(const id of values(b))emit('enables-equipment',id,'equipment');
        if(n.key==='enable_equipment_modules')for(const id of values(b))emit('enables-module',id,'module');
        if(n.key==='enable_subunits')for(const id of values(b))emit('enables-unit',id,'unit');
        if(n.key==='enable_building')emit('enables-building',scalar(b,'building'),'building',b);
        if(n.key==='leads_to_tech')emit('research-path',v,'technology',[n]);
        if(n.key==='has_tech')emit('requires-technology',v,'technology',[n]);
        if(n.key==='is_special_project_completed')emit('requires-project',v.replace(/^sp:/,''),'project',[n]);
        if(n.key==='archetype'||n.key==='parent')emit(n.key==='archetype'?'uses-archetype':'equipment-parent',v,'equipment',[n]);
        if(n.key==='module_slots'&&v==='inherit')emit('inherits-module-slots',scalar(baseNodes,'archetype')||scalar(baseNodes,'parent'),'equipment',[n]);
        if(n.key==='upgrades')for(const id of values(b))emit('uses-upgrade',id,'upgrade');
        if(n.key==='enable_tactic')emit('enables-tactic',v,'tactic',[n]);
        if(n.key==='countered_by'&&entry.kind==='tactic')emit('countered-by',v,'tactic',[n]);
        if(n.key==='tracks')for(const id of values(b))emit('uses-doctrine-track',id,'doctrine_track');
        if(n.key==='track')emit('belongs-to',v,'doctrine_track',[n]);
        if(n.key==='folder'&&['doctrine','doctrine_track'].includes(entry.kind))emit('belongs-to',v,'doctrine_folder',[n]);
        if(n.key==='recruit_character')emit('recruits-character',v||scalar(b,'character'),'character',b.length?b:[n]);
        if(['activate_character','set_country_leader','promote_character'].includes(n.key))emit('activates-character',v||scalar(b,'character'),'character',b.length?b:[n]);
        if(['add_country_leader_role','add_corps_commander_role','add_field_marshal_role','add_naval_commander_role','add_advisor_role','activate_advisor'].includes(n.key))emit('activates-character-role',v||scalar(b,'character'),'character',b.length?b:[n]);
        if(['add_ideas','remove_ideas'].includes(n.key))for(const id of v?[v]:values(b))emit(n.key==='add_ideas'?'grants-spirit':'removes-spirit',id,'idea',b.length?b:[n]);
        if(n.key==='swap_ideas'){emit('removes-spirit',scalar(b,'remove_idea'),'idea',b);emit('grants-spirit',scalar(b,'add_idea'),'idea',b);}
        if(['country_event','news_event','state_event','unit_leader_event','operative_leader_event'].includes(n.key)&&b.length)emit('triggers-event',scalar(b,'id'),'event',b);
        if(n.key==='traits'&&['character_role','character_instance'].includes(entry.kind))for(const id of values(b))emit('has-trait',id,'trait');
        if(n.key==='category'&&entry.kind==='module'&&!scope.some(s=>s.startsWith('module_count_limit[')||s.startsWith('category_count_limit[')))emit('module-category',v,'module_category',[n]);
        if(n.key==='can_convert_from'&&b.length)emit('converts-from',scalar(b,'module'),'module',b);
        if(n.key==='module_count_limit'){if(scalar(b,'module'))emit('limits-module',scalar(b,'module'),'module',b);if(scalar(b,'category'))emit('limits-category',scalar(b,'category'),'module_category',b);}
        if(n.key==='category_count_limit')emit('limits-category',scalar(b,'category'),'module_category',b);
        if(n.key==='allowed_module_categories'){
          for(const slot of b)if(Array.isArray(slot.value))for(const category of values(slot.value))edge('slot-accepts-category',{id:category,kind:'module_category'},slot,[...here,slot.key],nextConditions,[slot]);
        }
        if(n.key==='module_slots'&&b.length){for(const slot of b)if(Array.isArray(slot.value)){
          edge('declares-slot',{id:slot.key,kind:'module_slot'},slot,[...here,slot.key],nextConditions,[slot],true);
          for(const category of values(block(slot.value,'allowed_module_categories')))edge('slot-accepts-category',{id:category,kind:'module_category'},slot,[...here,slot.key],nextConditions,[slot]);
        }}
        if(n.key==='default_modules')for(const slot of b)if(typeof slot.value==='string')edge('defaults-module',{id:slot.value,kind:'module'},slot,[...here,slot.key],nextConditions,[slot]);
        if(n.key==='prerequisite'&&b.length)for(const f of b)if(f.key==='focus'&&typeof f.value==='string')edge('prerequisite-group',focusTarget(f.value),f,here,nextConditions,b);
        if(n.key==='mutually_exclusive'&&b.length)for(const f of b)if(f.key==='focus'&&typeof f.value==='string')edge('excludes',focusTarget(f.value),f,here,nextConditions,b);
        if(n.key==='has_completed_focus'&&v)edge('requires-completed-focus',focusTarget(v),n,here,nextConditions,[n]);
        if(n.key==='complete_national_focus'&&v)edge('completes-focus',focusTarget(v),n,here,nextConditions,[n]);
        if(n.key==='shared_focus'&&v)emit('includes-shared-focus',v,'shared_focus',[n]);
        if(n.key==='relative_position_id')emit('position-relative-to',v,undefined,[n]);
        // Subrecord scripts have their own from identity; avoid duplicate or unscoped claims at the parent.
        if(b.length&&!(entry.data.childContainers||[]).includes(n.key))scan(b,here,nextConditions,inAI);
      }
    }
    scan(baseNodes,entry.data.sourceScope||[],[]);
    if(inherited.length)scan(inherited,['inherited'],[]);
  }
  return result;
}
