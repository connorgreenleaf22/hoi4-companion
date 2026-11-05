import type { Node } from '../src/types';

// Repeated keys and anonymous list items remain ordered; source line numbers survive parsing.
export function parseScript(text: string,options:{recover?:boolean;warnings?:string[]}={}): Node[] {
  const tokens: {value:string;line:number}[] = [];
  let i=0, line=1;
  while(i<text.length) {
    const c=text[i];
    if(c==='\n') {line++;i++;continue;}
    if(/\s|\uFEFF/.test(c)){i++;continue;}
    if(c==='#'){while(i<text.length && text[i]!=='\n')i++;continue;}
    const startLine=line;
    if(c==='"') {
      i++;let value='';
      while(i<text.length && text[i]!=='"') {
        if(text[i]==='\\' && i+1<text.length) {const n=text[++i];value+=n==='n'?'\n':n; i++;}
        else {if(text[i]==='\n')line++;value+=text[i++];}
      }
      if(i>=text.length) throw new Error(`Unclosed string at line ${startLine}`);
      i++;tokens.push({value,line:startLine});continue;
    }
    if('{}=<>!'.includes(c)) {
      let value=c;i++;if(text[i]==='='){value+='=';i++;}
      tokens.push({value,line:startLine});continue;
    }
    const start=i;while(i<text.length && !/[\s{}=<>!#]/.test(text[i]))i++;
    tokens.push({value:text.slice(start,i),line:startLine});
  }
  let p=0;
  function block(nested=false):Node[]{
    const out:Node[]=[];
    while(p<tokens.length) {
      if(tokens[p].value==='}') {if(!nested){if(options.recover){options.warnings?.push(`Ignored unmatched closing brace at line ${tokens[p].line}`);p++;continue;}throw new Error(`Unexpected } at line ${tokens[p].line}`);}p++;return out;}
      const t=tokens[p++];
      if(t.value==='{'){out.push({key:'',value:block(true),line:t.line});continue;}
      if(p<tokens.length && ['=','>','<','>=','<=','!=','?='].includes(tokens[p].value)) {
        const op=tokens[p++].value;
        if(p>=tokens.length)throw new Error(`Missing value at line ${t.line}`);
        const value=tokens[p++];
        out.push({key:t.value,op,value:value.value==='{'?block(true):value.value,line:t.line});
      } else out.push({key:'',value:t.value,line:t.line});
    }
    if(nested){if(options.recover)options.warnings?.push('Closed an unfinished block at end of file');else throw new Error('Unclosed block');}
    return out;
  }
  return block();
}
export const children=(nodes:Node[],key:string):Node[]=>nodes.filter(n=>n.key===key);
export const block=(nodes:Node[],key:string):Node[]=>{const n=nodes.find(n=>n.key===key);return Array.isArray(n?.value)?n.value:[];};
export const scalar=(nodes:Node[],key:string,fallback=''):string=>{const n=nodes.find(n=>n.key===key);return typeof n?.value==='string'?n.value:fallback;};
export function collect(nodes:Node[],key:string):string[]{return nodes.flatMap(n=>n.key===key && typeof n.value==='string'?[n.value]:Array.isArray(n.value)?collect(n.value,key):[]);}
export function formatScript(nodes:Node[],depth=0):string {
  return nodes.map(n=>`${'  '.repeat(depth)}${n.key?`${n.key} ${n.op||'='} `:''}${Array.isArray(n.value)?`{\n${formatScript(n.value,depth+1)}\n${'  '.repeat(depth)}}`:n.value.includes(' ')?JSON.stringify(n.value):n.value}`).join('\n');
}
export function numeric(nodes:Node[],constants:Map<string,string>=new Map()):Record<string,number>{
  return Object.fromEntries(nodes.filter(n=>n.key && typeof n.value==='string').flatMap(n=>{
    let v=n.value as string; if(v.startsWith('@'))v=constants.get(v)??v;
    return v.trim()!=='' && Number.isFinite(Number(v))?[[n.key,Number(v)]]:[];
  }));
}
export function plain(nodes:Node[]):Record<string,string>{return Object.fromEntries(nodes.filter(n=>n.key && typeof n.value==='string').map(n=>[n.key,n.value as string]));}
