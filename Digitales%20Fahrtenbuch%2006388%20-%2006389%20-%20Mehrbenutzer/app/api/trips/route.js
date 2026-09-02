
import {sb} from "../../../lib/db";
export async function POST(req){
  try{
    const b=await req.json();
    const required=["plate","date","timeFrom","timeTo","start","destination","purpose","driver","vin"];
    for(const k of required) if(!String(b[k]??"").trim()) return Response.json({error:`${k} fehlt`},{status:400});
    const vin=String(b.vin).toUpperCase().replace(/[^A-Z0-9]/g,"");
    if(vin.length!==17) return Response.json({error:"FIN muss 17 Stellen haben"},{status:400});
    const result=await sb("rpc/create_trip",{method:"POST",body:{
      p_plate:b.plate,p_date:b.date,p_time_from:b.timeFrom,p_time_to:b.timeTo,
      p_start:b.start,p_destination:b.destination,p_purpose:b.purpose,
      p_driver:b.driver,p_address:b.address||"",p_vin:vin,p_brand:b.brand||""
    }});
    return Response.json({trip:Array.isArray(result)?result[0]:result});
  }catch(e){
    const status=/voll|full/i.test(e.message)?409:500;
    return Response.json({error:e.message},{status})
  }
}
