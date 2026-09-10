import { AdminPanel } from "@/components/admin-panel";
import { PageHeading } from "@/components/page-heading";
export default function AdminPage(){return <main><PageHeading eyebrow="ADMIN" title="จัดการคำขอจอง" description="สำหรับผู้ดูแลระบบเพื่ออนุมัติ ปฏิเสธ หรือยกเลิกรายการ"/><section className="page-content shell"><AdminPanel/></section></main>}
