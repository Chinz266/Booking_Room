import type { Booking } from "./types";
import { roomCategory } from "./rooms";

export function summarizeBookings(bookings: Booking[], month: string) {
  const selected = bookings.filter(b => b.booking_date?.startsWith(`${month}-`));
  const counts = { total: selected.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  const rooms = new Map<string, { room: string; category: string; count: number; hours: number }>();
  const departments = new Map<string, number>();
  const requester = { student: 0, staff: 0, unspecified: 0 };
  const daily = new Map<string, number>();
  let hours = 0;
  for (const b of selected) {
    if (b.status === "pending" || b.status === "approved" || b.status === "rejected" || b.status === "cancelled") counts[b.status]++;
    requester[b.requester_type === "student" || b.requester_type === "staff" ? b.requester_type : "unspecified"]++;
    const department = String(b.department ?? "").trim() || "ไม่ระบุ (รายการเดิม)";
    departments.set(department, (departments.get(department) || 0) + 1);
    daily.set(b.booking_date, (daily.get(b.booking_date) || 0) + 1);
    const room = String(b.room);
    const row = rooms.get(room) || { room, category: roomCategory(room), count: 0, hours: 0 };
    row.count++;
    if (b.status === "approved") {
      const minutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
      const duration = (minutes(b.end_time) - minutes(b.start_time)) / 60;
      if (Number.isFinite(duration) && duration > 0) { row.hours += duration; hours += duration; }
    }
    rooms.set(room, row);
  }
  return {
    counts, hours: Math.round(hours * 10) / 10, requester,
    rooms: [...rooms.values()].sort((a, b) => b.count - a.count || a.room.localeCompare(b.room)).map(r => ({ ...r, hours: Math.round(r.hours * 10) / 10 })),
    departments: [...departments].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    daily: [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
  };
}
export type DashboardSummary = ReturnType<typeof summarizeBookings>;
