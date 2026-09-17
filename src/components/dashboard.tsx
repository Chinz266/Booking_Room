"use client";
import { roomCode } from "@/lib/rooms";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { DashboardSummary } from "@/lib/dashboard";

type Summary = DashboardSummary & { lineConfigured?: boolean };
const initialMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).slice(0, 7);
export function Dashboard({ admin }: { admin: boolean }) {
  const [month, setMonth] = useState(initialMonth);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/dashboard?month=${month}`, { signal: controller.signal }).then(r => r.json()).then(j => {
      if (!j.success) throw new Error(j.message);
      setSummary(j.data); setError("");
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, refresh]);
  function reload() { setLoading(true); setError(""); setRefresh(r => r + 1); }
  const statusNames = { pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ", cancelled: "ยกเลิก" };
  return <div className="dashboard">
    <div className="dashboard-toolbar"><div className="field"><label htmlFor="dashboard-month">เดือนที่ใช้ห้อง</label><input id="dashboard-month" type="month" value={month} onChange={e => { if (e.target.value) { setMonth(e.target.value); setLoading(true); setError(""); } }} /></div><div className="hero-actions"><button className="button button-secondary" onClick={reload} disabled={loading}>รีเฟรชข้อมูล</button><Link href={admin ? "/admin" : "/booking"} className="button button-primary">{admin ? "จัดการคำขอจอง →" : "จองห้องใหม่ →"}</Link></div></div>
    <p className="field-help">นับตามวันที่ใช้ห้องในเดือนที่เลือก · {admin ? "ข้อมูลทุกบัญชี" : "เฉพาะรายการของคุณ"}</p>
    {error ? <div className="error-panel" role="alert">{error}<button className="button button-secondary" onClick={reload}>ลองใหม่</button></div> : loading ? <div className="loading-panel" role="status">กำลังสรุปข้อมูล…</div> : summary && <>
      <div className="stat-grid">{[["คำขอทั้งหมด", summary.counts.total, "รายการ"], ["รออนุมัติ", summary.counts.pending, "รายการ"], ["อนุมัติแล้ว", summary.counts.approved, "รายการ"], ["ชั่วโมงที่อนุมัติ", summary.hours, "ชั่วโมง"]].map(([label, value, unit]) => <article className="stat-card" key={label}><span>{label}</span><strong>{value}<small>{unit}</small></strong></article>)}</div>
      <p className="field-help">ชั่วโมงที่อนุมัติคำนวณจากระยะเวลาการจอง รวมรายการในอนาคต ไม่ใช่การเช็กเข้าใช้จริง</p>
      {!summary.counts.total ? <div className="empty-panel">ยังไม่มีรายการจองในเดือนนี้ ลองเลือกเดือนอื่นหรือเริ่มจองห้อง</div> : <>
        <div className="dashboard-columns"><section className="dashboard-panel"><h2>ห้องที่มีคำขอจอง</h2><p>จำนวนคำขอทุกสถานะ และชั่วโมงที่อนุมัติ</p>{summary.rooms.map(row => <div className="metric-row" key={row.room}><div><strong>ห้อง {roomCode(row.room)}</strong><span>{row.category} · {row.hours} ชม. ที่อนุมัติ</span></div><b>{row.count} ครั้ง</b><meter min={0} max={Math.max(...summary.rooms.map(r => r.count), 1)} value={row.count} aria-label={`ห้อง ${roomCode(row.room)} ${row.count} คำขอ`} /></div>)}</section>
          <section className="dashboard-panel"><h2>สถานะคำขอ</h2>{Object.entries(statusNames).map(([key, label]) => <div className="status-summary" key={key}><span className={`status-dot ${key}`} />{label}<strong>{summary.counts[key as keyof typeof statusNames]}</strong></div>)}<h3>ประเภทผู้จอง</h3>{[["นักศึกษา", summary.requester.student], ["บุคลากร", summary.requester.staff], ["ไม่ระบุ (รายการเดิม)", summary.requester.unspecified]].map(([label, value]) => <div className="status-summary" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section></div>
        <div className="dashboard-columns"><section className="dashboard-panel"><h2>สาขาวิชา / หน่วยงาน</h2>{summary.departments.map(row => <div className="status-summary" key={row.name}><span>{row.name}</span><strong>{row.count} ครั้ง</strong></div>)}</section><section className="dashboard-panel"><h2>คำขอตามวันที่ใช้ห้อง</h2><div className="daily-chart">{summary.daily.map(day => <div className="daily-bar" key={day.date}><span>{Number(day.date.slice(-2))}</span><meter min={0} max={Math.max(...summary.daily.map(d => d.count), 1)} value={day.count} aria-label={`${day.date}: ${day.count} คำขอ`} /><strong>{day.count}</strong></div>)}</div></section></div>
      </>}
      {admin && <div className="line-status"><strong>แจ้งเตือน LINE กลุ่มผู้ดูแล</strong><p>{summary.lineConfigured ? "ตั้งค่าการส่งแล้ว · ส่งเมื่อมีคำขอใหม่ อนุมัติ ปฏิเสธ หรือยกเลิก" : "ยังไม่ได้เชื่อมต่อ · ต้องตั้งค่า LINE Channel Access Token และรหัสกลุ่มผู้ดูแล"}</p><small>สถานะนี้แสดงการตั้งค่า การส่งจริงขึ้นอยู่กับสิทธิ์ของบอตและโควตา LINE</small></div>}
    </>}
  </div>;
}
