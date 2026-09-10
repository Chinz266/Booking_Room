import type { Booking } from "@/lib/types";
import { cachedAppsScriptGet } from "@/lib/apps-script";

export async function GET(request:Request) {
  try {
    const date = new URL(request.url).searchParams.get("date") || "";
    const [roomResult,bookingResult] = await Promise.all([
      cachedAppsScriptGet("getRooms",{},300000),
      cachedAppsScriptGet("getBookings",{room:"",booking_date:date},10000),
    ]);
    const visibleBookings = (bookingResult.data||[]).filter((item:Booking)=>["pending","approved"].includes(item.status)).map((item:Booking)=>({id:item.id,room:item.room,booking_date:item.booking_date,start_time:item.start_time,end_time:item.end_time,status:item.status}));
    return Response.json({success:true,data:{rooms:roomResult.data||[],bookings:visibleBookings}});
  } catch(error) {
    return Response.json({success:false,message:error instanceof Error?error.message:"โหลดข้อมูลไม่สำเร็จ"},{status:500});
  }
}
