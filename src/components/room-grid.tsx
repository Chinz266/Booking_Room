"use client";
import Link from "next/link";
import {RoomFacts} from "./room-facts";
import {roomCategory,roomDescription,roomTypes,roomCode,roomFloor} from "@/lib/rooms";
import { useEffect,useRef,useState } from "react";
import type { ApiResponse,Booking,Room } from "@/lib/types";

const defaultRooms:Room[] = [704,706,707,708,709,801,806,807].map((number,index)=>({id:index+1,room_number:number,room_name:`ห้อง ${number}`,status:"available"}));
const initialDate = new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Bangkok"}).format(new Date());
type Availability = { rooms:Room[]; bookings:Booking[] };

function dateLabel(value:string) {
  if(value===initialDate) return "วันนี้";
  return new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${value}T00:00:00`));
}

export function RoomGrid() {
  const [rooms,setRooms] = useState<Room[]>(defaultRooms);
  const [bookings,setBookings] = useState<Booking[]>([]);
  const [date,setDate] = useState(initialDate);
  const [loading,setLoading] = useState(true);
  const [category,setCategory] = useState("");
  const [error,setError] = useState("");
  const browserCache = useRef(new Map<string,Availability>());

  useEffect(()=>{
    let cancelled=false;
    fetch(`/api/availability?date=${date}`).then((response)=>response.json()).then((result:ApiResponse<Availability>)=>{
      if(!result.success||!result.data)throw new Error(result.message||"โหลดข้อมูลไม่สำเร็จ");
      browserCache.current.set(date,result.data);
      if(!cancelled){setRooms(result.data.rooms);setBookings(result.data.bookings);}
    }).catch((reason)=>{if(!cancelled)setError(reason instanceof Error?reason.message:"โหลดข้อมูลไม่สำเร็จ")}).finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[date]);

  function changeDate(value:string) {
    if(!value)return; setDate(value); setError("");
    const cached = browserCache.current.get(value);
    if(cached){setRooms(cached.rooms);setBookings(cached.bookings);setLoading(false);}
    else {setBookings([]);setLoading(true);}
  }

  return <div className="availability-view">
    <div className="availability-toolbar"><div><strong>ตรวจสอบห้องว่าง</strong><span>เลือกวันที่เพื่อดูช่วงเวลาที่ถูกจอง</span></div><div className="date-control"><label htmlFor="availability-date">วันที่</label><input id="availability-date" type="date" value={date} min={initialDate} onChange={(event)=>changeDate(event.target.value)}/>{date!==initialDate&&<button type="button" onClick={()=>changeDate(initialDate)}>กลับมาวันนี้</button>}</div></div>
    <div className="category-tabs" aria-label="ประเภทห้อง">{["",...roomTypes].map(type=><button type="button" key={type} aria-pressed={category===type} className={category===type?"selected":""} onClick={()=>setCategory(type)}>{type||"ทุกห้อง"}<span>{rooms.filter(r=>!type||roomCategory(r.room_number)===type).length}</span></button>)}</div>
    <div className="availability-result-line"><p className="date-result">สถานะห้องสำหรับ <strong>{dateLabel(date)}</strong></p>{loading&&<span className="refreshing"><i/>กำลังอัปเดตข้อมูล…</span>}</div>
    {error&&<div className="inline-error">โหลดสถานะล่าสุดไม่สำเร็จ กรุณาลองเปลี่ยนวันที่อีกครั้ง</div>}
    <div className="room-grid">{rooms.filter(room=>!category||roomCategory(room.room_number)===category).map((room)=>{
      const busy=bookings.filter((item)=>String(item.room)===String(room.room_number)).sort((a,b)=>a.start_time.localeCompare(b.start_time));
      const unavailable=room.status!=="available";
      const statusClass=loading||error?"loading":busy.length||unavailable?"busy":"free";
      return <article className={`room-card ${!loading&&(busy.length||unavailable)?"has-bookings":"is-free"}`} key={room.id}>
        <div className="room-card-top"><span className="room-icon">{roomFloor(room.room_number)}F</span><span className={`availability-badge ${statusClass}`}>{error?"ยังตรวจสอบไม่ได้":loading?"กำลังตรวจสอบ":unavailable?"ปิดใช้งาน":busy.length?`ไม่ว่าง ${busy.length} ช่วง`:"ว่างทั้งวัน"}</span></div>
        <span className="room-category">{roomCategory(room.room_number)}</span><strong className="room-number">ห้อง {roomCode(room.room_number)}</strong><span className="room-floor">อาคาร 34 · ชั้น {roomFloor(room.room_number)}</span>
        <RoomFacts number={room.room_number}/><p className="room-description">{roomDescription(room.room_number)}</p><div className="busy-times">{error?<p>กรุณาลองโหลดสถานะอีกครั้ง</p>:loading?<div className="time-skeleton"><span/><span/></div>:unavailable?<p>ห้องนี้ยังไม่เปิดรับการจอง</p>:busy.length?<><span>เวลาที่ไม่ว่าง</span>{busy.slice(0,3).map((item)=><p key={item.id}><b>{item.start_time}–{item.end_time}</b>&nbsp;น.</p>)}{busy.length>3&&<small>และอีก {busy.length-3} ช่วงเวลา</small>}</>:<p className="all-day-free"><b>เลือกเวลาได้ตามต้องการ</b><span>ยังไม่มีรายการจองในวันที่เลือก</span></p>}</div>
        <Link className={`button room-button ${unavailable||loading||!!error?"disabled":""}`} aria-disabled={unavailable||loading||!!error} href={unavailable||loading||!!error?"#":`/booking?room=${room.room_number}&date=${date}`}>{error?"รอตรวจสอบสถานะ":loading?"กำลังตรวจสอบเวลา":unavailable?"ยังไม่เปิดให้จอง":`จองห้อง ${roomCode(room.room_number)}`}</Link>
      </article>})}</div>
  </div>;
}
