import {currentUser} from "@/lib/auth";
export async function GET(){try{return Response.json({success:true,data:await currentUser()});}catch{return Response.json({success:false,message:"ระบบสมาชิกยังไม่พร้อม กรุณาตรวจ Apps Script"},{status:503});}}
