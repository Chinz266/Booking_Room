import Link from "next/link";
import { RoomGrid } from "@/components/room-grid";

export default function Home() {
  return <main>
    <section className="home-intro shell">
      <div>
        <p className="eyebrow">ระบบจองห้อง · วิทยาการคอมพิวเตอร์</p>
        <h1>เลือกห้อง ตรวจเวลา<br />แล้วส่งคำขอได้เลย</h1>
        <p className="home-lead">ดูห้องทั้งหมด เลือกวันและเวลาที่ต้องการ ระบบจะตรวจสอบการจองซ้อนให้อัตโนมัติ</p>
        <div className="hero-actions"><Link className="button button-primary" href="/booking">เริ่มจองห้อง</Link><Link className="button button-secondary" href="/schedule">ดูตารางการจอง</Link></div>
      </div>
      <div className="how-it-works" aria-label="ขั้นตอนการจอง">
        <div><span>1</span><p><strong>เลือกห้อง</strong><small>มีทั้งหมด 8 ห้อง</small></p></div>
        <div><span>2</span><p><strong>เลือกวันและเวลา</strong><small>ระบบตรวจเวลาซ้อนให้</small></p></div>
        <div><span>3</span><p><strong>รอผู้ดูแลอนุมัติ</strong><small>ติดตามสถานะได้ตลอด</small></p></div>
      </div>
    </section>

    <section className="home-rooms shell">
      <div className="content-heading"><div><p className="eyebrow">เลือกห้อง</p><h2>เริ่มจากห้องที่ต้องการใช้</h2></div><Link href="/schedule" className="text-link">ดูช่วงเวลาที่มีการจอง →</Link></div>
      <RoomGrid />
    </section>

    <section className="home-help"><div className="shell help-grid">
      <div><span className="help-icon">?</span><div><strong>เคยส่งคำขอแล้ว?</strong><p>ใช้รหัสการจองและรหัสนักศึกษาเพื่อตรวจสอบสถานะหรือยกเลิก</p></div></div>
      <Link className="button button-secondary" href="/my-bookings">ตรวจสอบรายการของฉัน</Link>
    </div></section>
  </main>;
}
