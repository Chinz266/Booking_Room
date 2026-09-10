import { PageHeading } from "@/components/page-heading";
import { ScheduleList } from "@/components/schedule-list";
export default function SchedulePage(){return <main><PageHeading eyebrow="SCHEDULE" title="ตารางการใช้ห้อง" description="ดูช่วงเวลาที่มีคำขอจองและรายการที่อนุมัติแล้ว"/><section className="page-content shell"><ScheduleList/></section></main>}
