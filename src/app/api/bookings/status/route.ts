import { appsScriptPost, invalidateAppsScriptCache } from "@/lib/apps-script";
import { verifyAdminSession } from "@/lib/admin-auth";
const actions:Record<string,string> = {approved:"approveBooking",rejected:"rejectBooking",cancelled:"cancelBooking"};

export async function POST(request:Request) {
  try {
    if (!(await verifyAdminSession())) return Response.json({success:false,message:"กรุณาเข้าสู่ระบบ"},{status:401});
    const {id,status,reason} = await request.json();
    if (!id || !actions[status]) return Response.json({success:false,message:"ข้อมูลสถานะไม่ถูกต้อง"},{status:400});
    if(status==="rejected"&&!String(reason||"").trim()) return Response.json({success:false,message:"กรุณาระบุเหตุผลที่ปฏิเสธ"},{status:400});
    const result = await appsScriptPost({action:actions[status],adminKey:process.env.APPS_SCRIPT_ADMIN_KEY,data:{id,reason:String(reason||"").trim(),actor:"admin"}});
    if(result.success)invalidateAppsScriptCache("getBookings");
    return Response.json(result,{status:result.success?200:400});
  } catch (error) { return Response.json({success:false,message:error instanceof Error?error.message:"อัปเดตไม่สำเร็จ"},{status:500}); }
}
