import { appsScriptPost,invalidateAppsScriptCache } from "@/lib/apps-script";
import { checkRateLimit,requestIdentity } from "@/lib/rate-limit";

export async function POST(request:Request) {
  try {
    const rate = checkRateLimit(`manage-booking:${requestIdentity(request)}`,12,10*60*1000);
    if (!rate.allowed) return Response.json({success:false,message:"ตรวจสอบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"},{status:429});
    const {id,student_id,action="lookup"} = await request.json();
    if (!id || !student_id) return Response.json({success:false,message:"กรุณากรอกรหัสการจองและรหัสนักศึกษา"},{status:400});
    const scriptAction = action === "cancel" ? "cancelOwnBooking" : "getMyBooking";
    const result = await appsScriptPost({action:scriptAction,data:{id:String(id).trim().toUpperCase(),student_id:String(student_id).trim()}});
    if(result.success&&action==="cancel")invalidateAppsScriptCache("getBookings");
    return Response.json(result,{status:result.success?200:400});
  } catch(error) {
    return Response.json({success:false,message:error instanceof Error?error.message:"ดำเนินการไม่สำเร็จ"},{status:500});
  }
}
