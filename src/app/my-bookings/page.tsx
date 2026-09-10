import { MyBookings } from "@/components/my-bookings";
import { PageHeading } from "@/components/page-heading";
export default function MyBookingsPage(){return <main><PageHeading eyebrow="MY BOOKINGS" title="ตรวจสอบการจอง" description="ดูสถานะ เหตุผล และยกเลิกด้วยรหัสการจองและรหัสนักศึกษา"/><section className="page-content shell"><MyBookings/></section></main>}
