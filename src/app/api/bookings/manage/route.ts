import { queueBookingNotification } from "@/lib/line";
import { currentUser } from "@/lib/auth";
import { appsScriptPost, invalidateAppsScriptCache } from "@/lib/apps-script";
import { checkRateLimit, requestIdentity } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(`manage-booking:${requestIdentity(request)}`, 12, 10 * 60 * 1000);
    if (!rate.allowed) return Response.json({ success: false, message: "ตรวจสอบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่" }, { status: 429 });
    const user = await currentUser(); if (!user) return Response.json({ success: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const { id, action = "lookup" } = await request.json();
    if (!id) return Response.json({ success: false, message: "กรุณากรอกรหัสการจอง" }, { status: 400 });
    const scriptAction = action === "cancel" ? "cancelOwnBooking" : "getMyBooking";
    const result = await appsScriptPost({ action: scriptAction, adminKey: process.env.APPS_SCRIPT_ADMIN_KEY, data: { id: String(id).trim().toUpperCase(), user_id: user.id, role: user.role, actor: user.username } });
    if (result.success && action === "cancel") { invalidateAppsScriptCache("getBookings"); queueBookingNotification(result.data, "cancelled"); }
    return Response.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return Response.json({ success: false, message: error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ" }, { status: 500 });
  }
}

export const maxDuration = 60;
