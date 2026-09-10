import { appsScriptPost, cachedAppsScriptGet, invalidateAppsScriptCache } from "@/lib/apps-script";
import { verifyAdminSession } from "@/lib/admin-auth";
import type { Booking } from "@/lib/types";
import { checkRateLimit,requestIdentity } from "@/lib/rate-limit";

export async function GET(request:Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") || "public";
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
    const data = await request.json(); const result = await appsScriptPost({action:"createBooking",data}); if(result.success)invalidateAppsScriptCache("getBookings"); return Response.json(result,{status:result.success?201:400});
  }
  catch (error) { return Response.json({success:false,message:error instanceof Error?error.message:"บันทึกไม่สำเร็จ"},{status:500}); }
}
