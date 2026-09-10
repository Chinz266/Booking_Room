import { cachedAppsScriptGet } from "@/lib/apps-script";

export async function GET() {
  try { return Response.json(await cachedAppsScriptGet("getRooms",{},300000)); }
  catch (error) { return Response.json({success:false,message:error instanceof Error?error.message:"โหลดข้อมูลไม่สำเร็จ"},{status:500}); }
}
