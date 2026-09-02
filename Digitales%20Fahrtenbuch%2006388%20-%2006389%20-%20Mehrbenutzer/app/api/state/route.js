
import {sb} from "../../../lib/db";
export async function GET(){
  try{
    const cycles=await sb("book_cycles?status=eq.open&select=id,plate,cycle,status,created_at&order=plate.asc");
    const out=[];
    for(const c of cycles){
      const vehicles=await sb(`book_vehicles?cycle_id=eq.${c.id}&select=number,vin`);
      const trips=await sb(`trips?cycle_id=eq.${c.id}&select=id,number,date,time_from,time_to,start,destination,purpose,driver,address,vin,brand,created_at&order=date.desc,created_at.desc`);
      out.push({...c,vehicles,trips});
    }
    return Response.json({books:out});
  }catch(e){return Response.json({error:e.message},{status:500})}
}
