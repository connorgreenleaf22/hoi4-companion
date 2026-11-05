let lastIndexRevision='';
export async function api<T=any>(route:string,body?:unknown,method?:string):Promise<T>{
  const response=await fetch(`/api/v1/${route}`,{method:method||(body===undefined?'GET':'POST'),headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const revision=response.headers.get('X-HOI4-Index-Revision')||'';
  if(revision&&revision!==lastIndexRevision){const changed=!!lastIndexRevision;lastIndexRevision=revision;if(changed&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('hoi4:index-revision',{detail:revision}));}
  const value=await response.json();
  if(!response.ok){const error=new Error(value.error||'Request failed.') as Error&{status:number;data:any;current?:import('./types').Profile|null};error.status=response.status;error.data=value;if('current' in value)error.current=value.current;throw error;}
  return value;
}
export function download(name:string,value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
