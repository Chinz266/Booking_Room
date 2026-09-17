import {cookies} from "next/headers";
import {backend,createSession} from "@/lib/auth";
import {pendingGoogleIdentity,PROFILE_COOKIE} from "@/lib/google-auth";
import {checkRateLimit,requestIdentity} from "@/lib/rate-limit";
export const maxDuration=60;
export async function POST(request:Request){
  if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({success:false,message:"คำขอไม่ถูกต้อง"},{status:403});
  const identity=await pendingGoogleIdentity();
  if(!identity)return Response.json({success:false,message:"หมดเวลา กรุณาเข้าสู่ระบบด้วย Google อีกครั้ง"},{status:401});
  if(!checkRateLimit("google-profile:"+requestIdentity(request),10,600000).allowed)return Response.json({success:false,message:"กรุณารอสักครู่แล้วลองใหม่"},{status:429});
  try{
    const b=await request.json();const name=String(b.name||"").trim(),department=String(b.department||"").trim(),requester_type=String(b.requester_type||""),student_id=requester_type==="staff"?"":String(b.student_id||"").trim();
    if(!name||name.length>120||!department||department.length>120||!["student","staff"].includes(requester_type)||(requester_type==="student"&&!/^\d{5,30}$/.test(student_id)))return Response.json({success:false,message:"กรุณากรอกข้อมูลให้ครบ และตรวจสอบรหัสนักศึกษา"},{status:400});
    const u=await backend("accountGoogle",{...identity,profile:{name,department,requester_type,student_id}});
    if(!u?.active)return Response.json({success:false,message:"บัญชีถูกระงับ กรุณาติดต่อผู้ดูแล"},{status:403});
    await createSession(u);(await cookies()).delete(PROFILE_COOKIE);
    return Response.json({success:true,role:u.role});
  }catch{return Response.json({success:false,message:"บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อหรืออัปเดต Apps Script"},{status:503});}
}
