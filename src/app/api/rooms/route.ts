import {describeRoom} from "@/lib/rooms";
import type {Room} from "@/lib/types";
import { cachedAppsScriptGet } from "@/lib/apps-script";

export async function GET() {
  try { const result=await cachedAppsScriptGet("getRooms",{},300000); return Response.json({...result,data:(result.data||[]).map((room:Room)=>describeRoom(room))}); }
  catch (error) { return Response.json({success:false,message:error instanceof Error?error.message:"โหลดข้อมูลไม่สำเร็จ"},{status:500}); }
}
