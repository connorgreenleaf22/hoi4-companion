// One pinned ECMAScript edge-whitespace policy, shared with SQL trim().
// NEL, zero-width space, word joiner and interior characters are deliberately not removed.
export const declaredYearWhitespaceCodePoints=[0x0009,0x000a,0x000b,0x000c,0x000d,0x0020,0x00a0,0x1680,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,0x2008,0x2009,0x200a,0x2028,0x2029,0x202f,0x205f,0x3000,0xfeff] as const;
const edgeWhitespace=new Set<string>(declaredYearWhitespaceCodePoints.map(cp=>String.fromCodePoint(cp)));
function trimYearText(value:string){
  let start=0,end=value.length;
  while(start<end&&edgeWhitespace.has(value[start]))start++;
  while(end>start&&edgeWhitespace.has(value[end-1]))end--;
  return value.slice(start,end);
}
/** Declared year only; missing/invalid values do not imply a campaign date or applicability. */
export function declaredYear(data:{year?:unknown;stats?:{start_year?:unknown}}):number|undefined{
  let value=data.year??data.stats?.start_year;
  if(typeof value==='string')try{value=JSON.parse(trimYearText(value));}catch{return undefined;}
  return typeof value==='number'&&Number.isFinite(value)&&Number.isInteger(value)?value:undefined;
}
