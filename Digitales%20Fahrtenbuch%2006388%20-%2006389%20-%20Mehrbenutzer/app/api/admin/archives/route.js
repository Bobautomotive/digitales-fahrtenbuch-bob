
import {sb,adminOk} from "../../../../lib/db";
export async function GET(req){
  if(!adminOk(req)) return Response.json({error:"Nicht autorisiert"},{status:401});
  try{
    const a=await sb("book_archives?select=id,plate,cycle,closed_at,entries&order=closed_at.desc");
    return Response.json({archives:a});
  }catch(e){return Response.json({error:e.message},{status:500})}
}
