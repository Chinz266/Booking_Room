"use client";
import { DeleteBookingButton } from "./delete-booking-button";
import { roomCode } from "@/lib/rooms";
import { useEffect, useState } from "react";
import type { Booking } from "@/lib/types";
import { StatusBadge } from "./status-badge";
export function OwnedBookings() { const [items, setItems] = useState<Booking[]>([]), [message, setMessage] = useState("กำลังโหลดรายการของคุณ…"); useEffect(() => { const load = () => { fetch("/api/bookings?scope=mine").then(r => r.json()).then(j => { if (!j.success) throw new Error(j.message); setItems(j.data || []); setMessage(j.data?.length ? "" : "ยังไม่มีรายการจอง"); }).catch(e => setMessage(e.message)); }; load(); window.addEventListener("bookings-changed",load); return ()=>window.removeEventListener("bookings-changed",load); }, []); return <section><h2>รายการที่คุณมีสิทธิ์เข้าถึง</h2>{message && <p role="status">{message}</p>}<div className="booking-list">{items.map(b => <article key={b.id} className="booking-row"><strong>ห้อง {roomCode(b.room)}</strong><div>{b.booking_date}<br />{b.start_time}–{b.end_time}</div><div>รหัสการจอง<br /><strong>{b.id}</strong></div><StatusBadge status={b.status} />{b.status === "cancelled" && <DeleteBookingButton id={b.id} onDeleted={()=>setItems(current=>current.filter(item=>item.id!==b.id))}/>}</article>)}</div></section> }
