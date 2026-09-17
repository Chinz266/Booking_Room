import {OwnedBookings} from "@/components/owned-bookings";
import {currentUser} from "@/lib/auth";
import {redirect} from "next/navigation";
import { MyBookings } from "@/components/my-bookings";
import { PageHeading } from "@/components/page-heading";
export default async function MyBookingsPage(){if(!await currentUser())redirect("/login");return <main><PageHeading eyebrow="MY BOOKINGS" title="ตรวจสอบการจอง" description="ดูสถานะ เหตุผล และยกเลิกด้วยรหัสการจองหลังเข้าสู่ระบบ"/><section className="page-content shell"><MyBookings/><OwnedBookings/></section></main>}
