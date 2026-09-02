
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.warn("Supabase env vars missing")}

export async function sb(path,{method="GET",body,headers={}}={}){
  const res=await fetch(`${url}/rest/v1/${path}`,{
    method,
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      "Content-Type":"application/json",
      Prefer:"return=representation",
      ...headers
    },
    body:body===undefined?undefined:JSON.stringify(body),
    cache:"no-store"
  });
  const text=await res.text();
  let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok) throw new Error(data?.message||data?.hint||text||`Supabase ${res.status}`);
  return data;
}
export function adminOk(req){
  const supplied=req.headers.get("x-admin-password")||"";
  return supplied===process.env.ADMIN_PASSWORD;
}
