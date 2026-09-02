
import {adminOk} from "../../../../lib/db";
export async function POST(req){
  return adminOk(req)?Response.json({ok:true}):Response.json({error:"Passwort falsch"},{status:401});
}
