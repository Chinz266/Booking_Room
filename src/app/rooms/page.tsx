import { PageHeading } from "@/components/page-heading";
import { RoomGrid } from "@/components/room-grid";
export default function RoomsPage(){return <main><PageHeading eyebrow="ห้องเรียน" title="ตรวจสอบห้องว่าง" description="เลือกวันที่เพื่อดูว่าห้องไหนว่างและไม่ว่างช่วงเวลาใด"/><section className="page-content shell"><RoomGrid/></section></main>}
