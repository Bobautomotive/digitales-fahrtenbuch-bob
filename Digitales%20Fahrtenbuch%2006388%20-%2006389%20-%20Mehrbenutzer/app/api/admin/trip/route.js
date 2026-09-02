
import {sb,adminOk} from "../../../../lib/db";
export async function PATCH(req){
  if(!adminOk(req)) return Response.json({error:"Nicht autorisiert"},{status:401});
  try{
    const b=await req.json();
    const vin=String(b.vin).toUpperCase().replace(/[^A-Z0-9]/g,"");
    if(vin.length!==17)return Response.json({error:"FIN muss 17 Stellen haben"},{status:400});
    const r=await sb("rpc/admin_update_trip",{method:"POST",body:{
      p_trip_id:b.id,p_date:b.date,p_time_from:b.timeFrom,p_time_to:b.timeTo,p_start:b.start,
      p_destination:b.destination,p_purpose:b.purpose,p_driver:b.driver,p_address:b.address||"",
      p_vin:vin,p_brand:b.brand||""
    }});
    return Response.json({trip:Array.isArray(r)?r[0]:r});
  }catch(e){return Response.json({error:e.message},{status:500})}
}
export async function DELETE(req){
  if(!adminOk(req)) return Response.json({error:"Nicht autorisiert"},{status:401});
  try{
    const {id}=await req.json();
    await sb(`trips?id=eq.${id}`,{method:"DELETE"});
    return Response.json({ok:true});
  }catch(e){return Response.json({error:e.message},{status:500})}
}
