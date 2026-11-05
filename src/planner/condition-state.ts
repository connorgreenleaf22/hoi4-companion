import type {RequirementResult} from '../types';
/** Four display states over the existing conservative truth model; no new campaign assertions. */
export function conditionState(result:RequirementResult):'satisfied'|'unsatisfied'|'unknown'|'unsupported'{
 if(result.truth==='yes')return 'satisfied';if(result.truth==='no')return 'unsatisfied';
 if(result.scope?.length||result.op&&result.op!=='='||result.role==='outcome')return 'unsupported';
 if(result.children.length)return result.children.some(c=>conditionState(c)==='unsupported')?'unsupported':'unknown';
 return ['AND','OR','NOT','always','tag','original_tag','has_dlc','has_completed_focus','date','focus'].includes(result.key)?'unknown':'unsupported';
}
export const conditionText={satisfied:'Satisfied in this context',unsatisfied:'Unsatisfied in this context',unknown:'Unknown — missing state',unsupported:'Unsupported condition'};
