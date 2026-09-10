"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [["/","หน้าหลัก"],["/booking","จองห้อง"],["/schedule","ตารางห้อง"],["/my-bookings","รายการของฉัน"],["/admin","ผู้ดูแลระบบ"]];

export function Navigation() {
  const pathname = usePathname();
  const active = (href:string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <header className="site-header"><div className="shell nav-wrap"><Link href="/" className="brand"><span className="brand-mark">CS</span><span>ROOM BOOKING</span></Link><nav className="nav-links" aria-label="เมนูหลัก">{links.map(([href,label]) => <Link key={href} href={href} className={`nav-link ${active(href)?"active":""} ${href==="/admin"?"admin-link":""}`}>{label}</Link>)}</nav></div><nav className="mobile-nav" aria-label="เมนูมือถือ">{links.map(([href,label]) => <Link key={href} href={href} className={`nav-link ${active(href)?"active":""}`}>{label}</Link>)}</nav></header>;
}
