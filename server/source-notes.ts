import type {Entry} from '../src/types';

/** Claim-sized audit notes supplied by the focused 2026-11-03 source review. No wiki content import. */
export const sourceNotes=[
  {id:'tank_nsb_armor_upgrade',kind:'upgrade',hash:'ae740b01bc165c148bd481603a7b45fc1e56b4e83c9e646060bd572b5c191e13',claim:'Armor upgrade breakthrough coefficient',installed:'add_stats.breakthrough = 1.25',external:'The reviewed wiki table displays 1.2.',url:'https://hoi4.paradoxwikis.com/index.php?title=Tank_designer&oldid=103597',status:'precision-discrepancy',review:'Keep both values visible. Rounding or table precision may explain the difference; this does not establish a balance change.'},
  {id:'heavy_mg_4x',kind:'module',hash:'b077c40bd386b53ea3b6af97acee44247c07056c9476a143de48e7130c74b692',claim:'Ground attack mission scope',installed:'air_ground_attack = 1 is inside mission_type_stats.limit.attack_logistics.',external:'The reviewed wiki table labels the bonus on Close Air Support.',url:'https://hoi4.paradoxwikis.com/index.php?title=Aircraft_designer&oldid=105502',status:'conflicting-scope',review:'Do not apply this declaration as a universal or CAS bonus. Full role and mission stacking still needs an in-game comparison.'},
  {id:'new_mobile_warfare',kind:'doctrine',hash:'b420f8f7f67ccc34c46262bf71e13dd5dff52014b7d5f018410daea8374cb2d6',claim:'Current doctrine record model',installed:'The installed definition is a grand doctrine with tracks and milestones.',external:'Older doctrine-as-technology documentation describes a different model/context.',url:'https://hoi4.paradoxwikis.com/index.php?title=Doctrine_modding&oldid=96850',status:'model-context-difference',review:'Use the installed grand doctrine, track and reward definitions for this build. This note does not invalidate unrelated statements on the older page.'}
];
export function applySourceNotes(e:Entry){
  const notes=sourceNotes.filter(n=>n.id===e.id&&n.kind===e.kind);
  if(notes.length)e.data.sourceConflicts=notes.map(n=>({...n,verification:n.hash===e.hash?'source-cross-checked':'stale-source-note',reviewedAt:'2026-11-03',...(n.hash!==e.hash?{review:'The installed source hash changed after this audit. Recheck both assertions before relying on this note.'}:{})}));
  const unknowns:string[]=[];
  if(['module','upgrade','equipment'].includes(e.kind))unknowns.push('Reference declarations do not establish fully modified designer statistics, role/mission stacking, or final reliability units.');
  if(e.kind==='technology'&&e.data.nodes?.some((n:any)=>n.key==='enable_building'))unknowns.push('The declared building level is indexed. Final construction eligibility and additive/cap behavior have not been verified in game.');
  if(['event','event_stage','event_option'].includes(e.kind))unknowns.push('Event stages, targets and delay declarations are indexed; engine scheduling, random outcomes and exact campaign timing are unverified.');
  if(e.kind==='idea')unknowns.push('Category base cost and modifiers are source declarations. Final charged price and campaign applicability can depend on other effects.');
  if(e.data.anonymousIdentity)unknowns.push('This record uses a parent-qualified positional identity. Revalidate saved references after its definition changes.');
  if(unknowns.length)e.data.unknowns=unknowns;
}
