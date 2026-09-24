import { roomDetails } from "@/lib/rooms";
export function RoomFacts({ number }: { number: string | number }) {
  const details = roomDetails(number);
  if (!details) return <div className="room-facts"><span>ยังไม่ระบุความจุ</span></div>;
  return <div className="room-facts"><strong className="capacity-badge">รองรับ {details.capacity} คน</strong></div>;
}
