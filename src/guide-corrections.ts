import type {CapturedChecklist} from './types';

/** Editorial corrections are separate from installed-file/index freshness. Reading
 * an older capture must never silently rewrite its wording, sources or ticks. */
export function capturedGuideCorrections(checklist:Pick<CapturedChecklist,'assumptions'|'items'>):string[]{
  const origins=[...checklist.assumptions,...checklist.items.flatMap(item=>item.sources.map(source=>source.rule))];
  const hasOldUSA=origins.some(origin=>/^Original guide usa-fascist r1;/.test(origin)||/^Guide usa-fascist r1,/.test(origin)||/^Guide usa-fascist, revision 1,/.test(origin));
  return hasOldUSA?["Guide correction: USA guide r1 treated event .2's compound NOT as a verified timing rule. That interpretation is unverified. Review the current USA guide before relying on the 280/180-day condition; this saved wording and its ticks are retained."]:[];
}
