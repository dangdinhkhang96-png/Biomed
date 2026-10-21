export type TeamUser={id:string;username:string;name:string;role:'admin'|'member';active:boolean;must_change:boolean};
const KEY='tbyt-team-session';
export function clearTeamSession(){try{sessionStorage.removeItem(KEY);}catch{}}
export function saveTeamToken(token:string){sessionStorage.setItem(KEY,token);}
export async function teamApi<T>(action:string,body?:unknown):Promise<T>{
 let token='';try{token=sessionStorage.getItem(KEY)||'';}catch{}
 const response=await fetch('/api/team/'+action,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json() as {error?:string};
 if(!response.ok)throw new Error(data.error||'Không kết nối được máy chủ.');
 return data as T;
}
