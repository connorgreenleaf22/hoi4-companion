export const normalizeName=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function near(a:string,b:string):boolean{
 if(a.length<4||Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const differences=[...a].map((c,i)=>c===b[i]?-1:i).filter(i=>i>=0);if(differences.length===2&&differences[1]===differences[0]+1&&a[differences[0]]===b[differences[1]]&&a[differences[1]]===b[differences[0]])return true;}
 let previous=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,previous[j]+1,previous[j-1]+Number(a[i-1]!==b[j-1]));previous=row;}
 return previous[b.length]<=1;
}
export function matchName(query:string,entry:{id:string;title:string;aliases?:string[]},allowSpelling=true){
 const q=normalizeName(query);if(!q)return null;
 let best:{score:number;matchedName:string;spelling:boolean}|null=null;
 for(const [index,name] of [entry.id,entry.title,...entry.aliases||[]].entries()){
  const n=normalizeName(name),tokens=q.split(' '),words=n.split(' ');let score=0,spelling=false;
  if(n===q)score=index===0?130:index===1?125:120;
  else if(n.startsWith(q))score=100;
  else if(n.includes(q))score=90;
  else if(tokens.every(t=>words.some(w=>w.startsWith(t))))score=80;
  else if(allowSpelling&&tokens.every(t=>words.some(w=>w.startsWith(t)||near(t,w)))){score=45;spelling=true;}
  if(score&&(!best||score>best.score))best={score,matchedName:name,spelling};
 }
 return best;
}
