import {queueBookingNotification} from "@/lib/line";
import {currentUser,backend} from "@/lib/auth";
import { appsScriptPost, cachedAppsScriptGet, invalidateAppsScriptCache } from "@/lib/apps-script";
import { verifyAdminSession } from "@/lib/admin-auth";
import type { Booking } from "@/lib/types";
import { checkRateLimit,requestIdentity } from "@/lib/rate-limit";

export async function GET(request:Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") || "public";
    const user=await currentUser();
    if(scope==="admin"&&user?.role!=="admin")return Response.json({success:false,message:"เฉพาะผู้ดูแลระบบ"},{status:403});
    if(scope==="mine"){if(!user)return Response.json({success:false,message:"กรุณาเข้าสู่ระบบ"},{status:401});return Response.json({success:true,data:await backend("ownedBookings",{user_id:user.id,role:user.role})});}
    const result = await cachedAppsScriptGet("getBookings",{room:url.searchParams.get("room")||"",booking_date:url.searchParams.get("booking_date")||""},10000);
    const bookings:Booking[] = result.data || [];
    if (scope === "admin") {
      if (!(await verifyAdminSession())) return Response.json({success:false,message:"กรุณาเข้าสู่ระบบ"},{status:401});
      return Response.json({success:true,data:bookings});
    }
    const visible = bookings.filter((item)=>["pending","approved"].includes(item.status)).map((item)=>({id:item.id,room:item.room,booking_date:item.booking_date,start_time:item.start_time,end_time:item.end_time,purpose:item.purpose,status:item.status}));
    return Response.json({success:true,data:visible});
  } catch (error) { return Response.json({success:false,message:error instanceof Error?error.message:"โหลดข้อมูลไม่สำเร็จ"},{status:500}); }
}

export async function POST(request:Request) {
  try {
    const rate = checkRateLimit(`booking:${requestIdentity(request)}`,8,10*60*1000);
    if (!rate.allowed) return Response.json({success:false,message:"ส่งคำขอหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"},{status:429,headers:{"Retry-After":String(rate.retryAfter)}});
    const user=await currentUser();if(!user)return Response.json({success:false,message:"กรุณาเข้าสู่ระบบก่อนจอง"},{status:401});
    const data = await request.json();
    if (!["student","staff"].includes(data.requester_type) || typeof data.department!=="string" || !data.department.trim() || data.department.trim().length>120) return Response.json({success:false,message:"กรุณาเลือกประเภทผู้จองและระบุสาขาวิชา / หน่วยงาน (ไม่เกิน 120 ตัวอักษร)"},{status:400});
    if(data.requester_type==="student"&&(typeof data.student_id!=="string"||!data.student_id.trim()||data.student_id.length>30))return Response.json({success:false,message:"กรุณาระบุรหัสนักศึกษา"},{status:400});
    try { const capability=await cachedAppsScriptGet("getCapabilities",{},60000); if(capability.data?.bookingProfile!==1)throw new Error(); }
    catch { return Response.json({success:false,message:"ผู้ดูแลต้องอัปเดต Apps Script เวอร์ชันใหม่ก่อน เพื่อบันทึกประเภทผู้จองและสาขาวิชา"},{status:503}); }
    const result = await appsScriptPost({action:"createBooking",adminKey:process.env.APPS_SCRIPT_ADMIN_KEY,data:{...data,user_id:user.id,name:user.role==="user"?user.name:data.name,student_id:data.requester_type==="student"?data.student_id:"",department:data.department.trim()}}); if(result.success){invalidateAppsScriptCache("getBookings");queueBookingNotification(result.data,"created");} return Response.json(result,{status:result.success?201:400});
  }
  catch (error) { return Response.json({success:false,message:error instanceof Error?error.message:"บันทึกไม่สำเร็จ"},{status:500}); }
}

export const maxDuration = 60;
