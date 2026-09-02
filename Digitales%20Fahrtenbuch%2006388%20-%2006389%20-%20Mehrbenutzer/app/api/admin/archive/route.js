
import {sb,adminOk} from "../../../../lib/db";
export async function DELETE(req){
  if(!adminOk(req)) return Response.json({error:"Nicht autorisiert"},{status:401});
  try{
    const {id}=await req.json();
    await sb(`book_archives?id=eq.${id}`,{method:"DELETE"});
    return Response.json({ok:true});
  }catch(e){return Response.json({error:e.message},{status:500})}
}
