import "server-only";
import { after } from "next/server";
import { randomUUID } from "node:crypto";
import type { Booking } from "./types";

export function lineConfigured() { return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && /^C[0-9a-f]{32}$/i.test(process.env.LINE_ADMIN_GROUP_ID || "")); }
export function queueBookingNotification(booking: Booking | undefined, event: string) {
  if (!booking || !lineConfigured()) return;
  // Only called after a successful persisted mutation; notification failure never reverses a booking.
  after(async () => {
    const labels: Record<string, string> = { created: "มีคำขอจองห้องใหม่", approved: "อนุมัติการจองแล้ว", rejected: "ปฏิเสธการจอง", cancelled: "ยกเลิกการจอง" };
    const text = ["ICT ROOM BOOKING", labels[event] || "อัปเดตการจอง", `รหัส: ${booking.id}`, `ห้อง ${booking.room} · ${booking.booking_date}`, `เวลา ${booking.start_time}–${booking.end_time} น.`, `ผู้จอง: ${booking.name || "ไม่ระบุ"}`, `ประเภท: ${booking.requester_type === "staff" ? "บุคลากร" : booking.requester_type === "student" ? "นักศึกษา" : "ไม่ระบุ"}`, `สาขาวิชา / หน่วยงาน: ${booking.department || "ไม่ระบุ"}`, `วัตถุประสงค์: ${booking.purpose || "ไม่ระบุ"}`, booking.status_reason ? `หมายเหตุ: ${booking.status_reason}` : ""].filter(Boolean).join("\n").slice(0, 4500);
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`, "X-Line-Retry-Key": randomUUID() },
        body: JSON.stringify({ to: process.env.LINE_ADMIN_GROUP_ID, messages: [{ type: "text", text }] }),
        cache: "no-store", signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) console.error("LINE notification failed", { status: response.status, bookingId: booking.id });
    } catch { console.error("LINE notification unavailable", { bookingId: booking.id }); }
  });
}
