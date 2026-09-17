import {currentUser} from "@/lib/auth";
import {redirect} from "next/navigation";
import {AdminTools} from "@/components/admin-tools";
import { AdminPanel } from "@/components/admin-panel";
import { PageHeading } from "@/components/page-heading";
export default async function AdminPage(){const user=await currentUser();if(!user)redirect("/login");if(user.role!=="admin")redirect("/my-bookings");return <main><PageHeading eyebrow="ADMIN" title="จัดการคำขอจอง" description="สำหรับผู้ดูแลระบบเพื่ออนุมัติ ปฏิเสธ หรือยกเลิกรายการ"/><section className="page-content shell"><AdminPanel/><AdminTools/></section></main>}
