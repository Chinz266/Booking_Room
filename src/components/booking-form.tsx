"use client";
import Link from "next/link";
import { RoomFacts } from "./room-facts";
import { roomCategory, roomDescription, roomCode, roomFloor, roomCapacityLabel } from "@/lib/rooms";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ApiResponse, Room } from "@/lib/types";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const initial = { room: "", booking_date: "", start_time: "", end_time: "", name: "", student_id: "", purpose: "", requester_type: "student", department: "" };

function displayDate(value: string) {
  if (!value) return "ยังไม่ได้เลือก";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(`${value}T00:00:00`));
}

export function BookingForm({ defaultRoom = "", defaultDate = "" }: { defaultRoom?: string; defaultDate?: string }) {
  const [profile, setProfile] = useState<{ name: string; student_id: string; role: string } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({ ...initial, room: defaultRoom, booking_date: defaultDate });
  useEffect(() => { fetch("/api/auth/session").then(r => r.json()).then(j => { if (j.data) { setProfile(j.data); setForm(f => ({ ...f, name: j.data.name, student_id: j.data.student_id, requester_type: j.data.requester_type || (j.data.student_id ? "student" : "staff"), department: j.data.department || "" })); } }).catch(() => { }); }, []);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; id?: string } | null>(null);
  useEffect(() => { fetch("/api/rooms").then((r) => r.json()).then((result: ApiResponse<Room[]>) => { if (!result.success) throw new Error(result.message); setRooms(result.data || []) }).catch((e) => setMessage({ type: "error", text: e instanceof Error ? e.message : "โหลดรายชื่อห้องไม่สำเร็จ" })); }, []);
  const selectedRoom = useMemo(() => rooms.find((room) => String(room.room_number) === form.room), [rooms, form.room]);
  const update = (name: string, value: string) => { setForm((current) => ({ ...current, [name]: value })); setMessage(null) };

  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setMessage(null);
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "ส่งคำขอไม่สำเร็จ");
      setMessage({ type: "success", text: "ส่งคำขอจองห้องเรียบร้อยแล้ว", id: result.data?.id });
      setForm({ ...initial, room: form.room, requester_type: form.requester_type, department: form.department, name: profile?.name || "", student_id: profile?.student_id || "" });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "ส่งคำขอไม่สำเร็จ" }); }
    finally { setSubmitting(false); }
  }

  return <div className="booking-workspace">
    <form className="booking-form" onSubmit={submit}>
      <section className="form-section">
        <div className="step-title"><span>1</span><div><h2>เลือกห้อง</h2><p>เลือกห้องที่ต้องการใช้งาน</p></div></div>
        <div className="field"><label htmlFor="room">ห้องที่ต้องการ</label><select id="room" required value={form.room} onChange={(e) => update("room", e.target.value)}><option value="">เลือกห้อง</option>{rooms.filter(room => room.status === "available").map((room) => <option key={room.id} value={room.room_number}>{roomCategory(room.room_number)} {roomCode(room.room_number)} · {roomCapacityLabel(room.room_number)}</option>)}</select></div>{selectedRoom && <div className="room-selection-note"><strong>{roomCategory(selectedRoom.room_number)} · ชั้น {roomFloor(selectedRoom.room_number)}</strong><p>{roomDescription(selectedRoom.room_number)}</p><RoomFacts number={selectedRoom.room_number} /></div>}
      </section>

      <section className="form-section">
        <div className="step-title"><span>2</span><div><h2>เลือกวันและเวลา</h2><p>ระบุช่วงเวลาที่ต้องการใช้ห้อง</p></div></div>
        <div className="form-grid"><div className="field full"><label htmlFor="date">วันที่ใช้งาน</label><input id="date" type="date" min={today} required value={form.booking_date} onChange={(e) => update("booking_date", e.target.value)} /></div><div className="field"><label htmlFor="start">เวลาเริ่ม</label><input id="start" type="time" required value={form.start_time} onChange={(e) => update("start_time", e.target.value)} /></div><div className="field"><label htmlFor="end">เวลาสิ้นสุด</label><input id="end" type="time" required value={form.end_time} onChange={(e) => update("end_time", e.target.value)} /></div></div>
        <p className="field-help">ช่วงเวลาที่รออนุมัติหรืออนุมัติแล้วจะถือว่าห้องไม่ว่าง</p>
      </section>

      <section className="form-section">
        <div className="step-title"><span>3</span><div><h2>ข้อมูลผู้จอง</h2><p>ใช้สำหรับตรวจสอบและติดตามคำขอ</p></div></div>
        <fieldset className="requester-options"><legend>ประเภทผู้จอง</legend>{[["student", "นักศึกษา"], ["staff", "บุคลากร"]].map(([value, label]) => <label key={value} className={form.requester_type === value ? "selected" : ""}><input type="radio" name="requester_type" value={value} checked={form.requester_type === value} onChange={() => update("requester_type", value)} />{label}</label>)}</fieldset><div className="form-grid"><div className="field"><label htmlFor="name">ชื่อ–นามสกุล</label><input id="name" readOnly={profile?.role === "user"} autoComplete="name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="เช่น สมชาย ใจดี" /></div>{form.requester_type === "student" && <div className="field"><label htmlFor="student-id">รหัสนักศึกษา</label><input id="student-id" inputMode="numeric" required maxLength={30} value={form.student_id} onChange={(e) => update("student_id", e.target.value)} placeholder="เช่น 65000001" /></div>}<div className="field full"><label htmlFor="department">{form.requester_type === "staff" ? "สาขาวิชา / หน่วยงาน" : "สาขาวิชา"}</label><input id="department" required maxLength={120} value={form.department} onChange={e => update("department", e.target.value)} placeholder="เช่น วิทยาการคอมพิวเตอร์" /></div><div className="field full"><label htmlFor="purpose">วัตถุประสงค์การใช้ห้อง</label><textarea id="purpose" required maxLength={300} value={form.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder="เช่น ประชุมงานกลุ่มวิชาโครงงาน" /></div></div>
      </section>

      {message?.type === "error" && <div className="form-message error" role="alert"><strong>ยังส่งคำขอไม่ได้</strong><span>{message.text}</span></div>}
      {message?.type === "success" && <div className="success-box" role="status"><span className="success-check">✓</span><div><strong>{message.text}</strong>{message.id && <p>รหัสการจอง: <b>{message.id}</b></p>}<p className="secret-help">กรุณาบันทึกรหัสการจองไว้สำหรับตรวจสอบสถานะหรือยกเลิก</p><Link href="/my-bookings">ไปตรวจสอบสถานะ →</Link></div></div>}
      <button className="button button-primary submit-button" disabled={submitting}>{submitting ? "กำลังตรวจสอบและส่งคำขอ…" : "ตรวจสอบและส่งคำขอจอง"}</button>
    </form>

    <aside className="booking-summary">
      <p className="summary-label">สรุปการจอง</p><h2>{selectedRoom ? `${roomCategory(selectedRoom.room_number)} ${roomCode(selectedRoom.room_number)}` : "ยังไม่ได้เลือกห้อง"}</h2>
      {selectedRoom && <p className="summary-capacity">รองรับ: {roomCapacityLabel(selectedRoom.room_number)}</p>}<dl><div><dt>วันที่</dt><dd>{displayDate(form.booking_date)}</dd></div><div><dt>เวลา</dt><dd>{form.start_time && form.end_time ? `${form.start_time} – ${form.end_time} น.` : "ยังไม่ได้เลือก"}</dd></div><div><dt>ผู้จอง</dt><dd>{form.name || "ยังไม่ได้กรอก"}</dd></div><div><dt>ประเภทผู้จอง</dt><dd>{form.requester_type === "staff" ? "บุคลากร" : "นักศึกษา"}</dd></div><div><dt>สาขาวิชา / หน่วยงาน</dt><dd>{form.department || "ยังไม่ได้กรอก"}</dd></div></dl>
      <div className="summary-note"><strong>หลังส่งคำขอ</strong><p>ระบบจะแสดงรหัสการจองสำหรับตรวจสอบสถานะหรือยกเลิกผ่านบัญชีที่เข้าสู่ระบบ</p></div>
    </aside>
  </div>;
}
