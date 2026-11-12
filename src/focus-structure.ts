import type {Node} from './types';

/** Repeated top-level exclusion blocks are cumulative; never flatten nested conditional syntax. */
export function focusExclusions(nodes:Node[]|undefined,fallback:string[]=[]):string[]{
 if(!nodes)return fallback;
 return [...new Set(nodes.filter(n=>n.key==='mutually_exclusive'&&(!n.op||n.op==='=')&&Array.isArray(n.value)).flatMap(n=>(n.value as Node[]).filter(c=>c.key==='focus'&&(!c.op||c.op==='=')&&typeof c.value==='string').map(c=>c.value as string)))];
}
