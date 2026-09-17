import { cachedAppsScriptGet } from "@/lib/apps-script";
import { backend, currentUser } from "@/lib/auth";
import { summarizeBookings } from "@/lib/dashboard";
import { lineConfigured } from "@/lib/line";

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ success: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const month = new URL(request.url).searchParams.get("month") || "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return Response.json({ success: false, message: "กรุณาเลือกเดือน" }, { status: 400 });
    const bookings = user.role === "admin" ? (await cachedAppsScriptGet("getBookings", {}, 10000)).data : await backend("ownedBookings", { user_id: user.id, role: user.role });
    return Response.json({ success: true, data: { ...summarizeBookings(bookings || [], month), scope: user.role, lineConfigured: user.role === "admin" ? lineConfigured() : undefined } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ success: false, message: "โหลดสรุปไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 }); }
}
