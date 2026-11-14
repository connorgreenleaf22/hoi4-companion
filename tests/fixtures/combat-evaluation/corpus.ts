import type {Entry} from '../../../src/types';
import {entries as baseEntries,meta,fixtureSource,reference,scenario,candidates} from '../design-evaluation/corpus';
import inputs from './inputs.json';
export {meta,reference,scenario,candidates};
export const combatEntries:Entry[]=baseEntries.map(e=>{
  const extra=inputs.entries.find(i=>i.uid===e.uid);
  return extra?{...structuredClone(e),data:{...structuredClone(e.data),...structuredClone(extra.data),stats:{...e.data.stats,...extra.data.stats}}}:structuredClone(e);
});
combatEntries.push(...inputs.entries.filter(e=>!combatEntries.some(b=>b.uid===e.uid)) as Entry[]);
export const combatSource=(records=structuredClone(combatEntries),metadata=structuredClone(meta))=>fixtureSource(records,metadata);
export const combatPairs=[
  {left:'i9',right:'i9-a1',purpose:'Defensive infantry versus infantry with line artillery'},
  {left:'i9',right:'i9-a2',purpose:'Lower-cost infantry versus a proposed infantry offensive candidate; role is a manual label, not validated effectiveness'},
  {left:'t6-m4',right:'t5-m5',purpose:'Medium/motorized ratios at equal nominal width'}
];
export const supportReferences=inputs.entries.filter(e=>['artillery','engineer','recon'].includes(e.id)).map(e=>({reference:'definition:'+e.uid,kind:'unit' as const}));
