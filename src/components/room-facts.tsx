import { roomDetails } from "@/lib/rooms";
export function RoomFacts({ number }: { number: string | number }) {
  const details = roomDetails(number);
  if (!details) return <div className="room-facts"><span>ยังไม่ระบุความจุ</span></div>;
  return <div className="room-facts"><strong className="capacity-badge">รองรับ {details.capacity} คน <small>({details.capacity} ที่นั่ง)</small></strong><p>{details.name}</p><small>อ้างอิงคำสั่งผู้รับผิดชอบห้อง · หน้า {details.page}</small>{details.capacity === 1 && <p className="capacity-note"></p>}</div>;
}
