
import {sb,adminOk} from "../../../../lib/db";
export async function POST(req){
  if(!adminOk(req)) return Response.json({error:"Nicht autorisiert"},{status:401});
  try{
    const {plate}=await req.json();
    const r=await sb("rpc/open_new_book",{method:"POST",body:{p_plate:plate}});
    return Response.json({book:Array.isArray(r)?r[0]:r});
  }catch(e){return Response.json({error:e.message},{status:400})}
}
