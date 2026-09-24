import type { Room } from "./types";

export const roomTypes = ["ห้องประชุม", "ห้องคอมพิวเตอร์", "ห้องเรียน"] as const;
const categories: Record<string, string> = {
  "704": "ห้องประชุม", "801": "ห้องประชุม",
  "706": "ห้องคอมพิวเตอร์", "707": "ห้องคอมพิวเตอร์", "806": "ห้องคอมพิวเตอร์", "807": "ห้องคอมพิวเตอร์",
  "708": "ห้องเรียน", "709": "ห้องเรียน",
};
// Transcribed from the supplied room responsibility order, PDF pages 7–8.
// Keep storage IDs unchanged: existing bookings use 704, etc.
const documentRooms: Record<string, { capacity: number; name: string; page: number }> = {
  "704": { capacity: 8, name: "ห้องประธานบัณฑิตศึกษา", page: 7 },
  "706": { capacity: 40, name: "ห้องปฏิบัติการคอมพิวเตอร์", page: 7 },
  "707": { capacity: 40, name: "ห้องปฏิบัติการคอมพิวเตอร์", page: 7 },
  "708": { capacity: 30, name: "ห้องไมโครคอมพิวเตอร์", page: 7 },
  "709": { capacity: 15, name: "ห้องปฏิบัติการเครือข่าย", page: 7 },
  "801": { capacity: 20, name: "ห้องประชุมสาขาฯ", page: 8 },
  "806": { capacity: 30, name: "ห้องปฏิบัติการคอมพิวเตอร์", page: 8 },
  "807": { capacity: 30, name: "ห้องปฏิบัติการคอมพิวเตอร์", page: 8 },
};
function localNumber(number: string | number) { return String(number).trim().replace(/^34-/, ""); }
export function roomDetails(number: string | number) { return documentRooms[localNumber(number)]; }
export function roomCode(number: string | number) { const local=localNumber(number); return documentRooms[local] ? `34-${local}` : String(number); }
export function roomFloor(number: string | number) { return localNumber(number).slice(0,1); }
export function roomCapacityLabel(number: string | number) { const details=roomDetails(number); return details ? `${details.capacity} คน` : "ยังไม่ระบุความจุ"; }
export function roomCategory(number: string | number) { return categories[localNumber(number)] || "ห้องทั่วไป"; }
export function roomDescription(number: string | number) {
  const category = roomCategory(number);
  return category === "ห้องประชุม" ? "สำหรับประชุม วางแผนงาน และนำเสนอผลงาน" : category === "ห้องคอมพิวเตอร์" ? "สำหรับเรียนปฏิบัติการและทำงานด้านคอมพิวเตอร์" : category === "ห้องเรียน" ? "สำหรับการเรียนการสอนและกิจกรรมกลุ่ม" : "เลือกวันและเวลาเพื่อตรวจสอบการใช้งาน";
}
export function describeRoom(room: Room) {
  return { ...room, room_type: roomCategory(room.room_number), description: roomDescription(room.room_number), room_code: roomCode(room.room_number), capacity: roomDetails(room.room_number)?.capacity, document_name: roomDetails(room.room_number)?.name, source_page: roomDetails(room.room_number)?.page };
}
