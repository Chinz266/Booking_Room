import { BookingForm } from "@/components/booking-form";
import { PageHeading } from "@/components/page-heading";
export default async function BookingPage({searchParams}:PageProps<"/booking">){const query=await searchParams;const room=typeof query.room==="string"?query.room:"";const date=typeof query.date==="string"?query.date:"";return <main><PageHeading eyebrow="จองห้อง" title="ส่งคำขอจองห้อง" description="ทำตาม 3 ขั้นตอน ระบบจะตรวจสอบช่วงเวลาซ้อนก่อนบันทึก"/><section className="page-content shell"><BookingForm defaultRoom={room} defaultDate={date}/></section></main>}
