"use client";
import { useEffect,useState } from "react";
import type { ApiResponse,Booking } from "@/lib/types";
import { StatusBadge } from "./status-badge";

const thaiDate = (value:string) => value ? new Intl.DateTimeFormat("th-TH",{dateStyle:"medium"}).format(new Date(`${value}T00:00:00`)) : "-";

export function ScheduleList() {
  const [items,setItems] = useState<Booking[]>([]); const [date,setDate] = useState(""); const [room,setRoom] = useState(""); const [loading,setLoading] = useState(true); const [error,setError] = useState("");
  useEffect(()=>{let cancelled=false;const q=new URLSearchParams();if(date)q.set("booking_date",date);if(room)q.set("room",room);fetch(`/api/bookings?${q}`).then((r)=>r.json()).then((result:ApiResponse<Booking[]>)=>{if(!result.success)throw new Error(result.message);if(!cancelled)setItems(result.data||[]);}).catch((err)=>{if(!cancelled)setError(err.message||"โหลดข้อมูลไม่สำเร็จ")}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true};},[date,room]);
  const changeDate = (value:string) => { setLoading(true); setError(""); setDate(value); };
  const changeRoom = (value:string) => { setLoading(true); setError(""); setRoom(value); };
  return <><div className="toolbar"><input type="date" aria-label="กรองตามวันที่" value={date} onChange={(e)=>changeDate(e.target.value)} /><select aria-label="กรองตามห้อง" value={room} onChange={(e)=>changeRoom(e.target.value)}><option value="">ทุกห้อง</option>{[704,706,707,708,709,801,806,807].map((n)=><option key={n}>{n}</option>)}</select></div>{loading?<div className="loading-panel">กำลังโหลดตาราง…</div>:error?<div className="error-panel">{error}</div>:items.length===0?<div className="empty-panel">ยังไม่มีรายการจองตามเงื่อนไขนี้</div>:<div className="booking-list">{items.map((item)=><article className="booking-row" key={item.id}><strong className="booking-room">ห้อง {item.room}</strong><div><strong>{thaiDate(item.booking_date)}</strong><div className="booking-meta">{item.start_time}–{item.end_time} น.</div></div><div><strong>{item.purpose}</strong><div className="booking-meta">รหัส {item.id}</div></div><StatusBadge status={item.status} /></article>)}</div>}</>;
}
