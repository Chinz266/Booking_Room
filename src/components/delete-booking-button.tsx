"use client";
import { useState } from "react";
export function DeleteBookingButton({id,onDeleted}:{id:string;onDeleted:()=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function remove(){
  if(!window.confirm("ยืนยันลบรายการจองนี้ออกจากฐานข้อมูลถาวร? กู้คืนผ่านหน้าเว็บไม่ได้ ระบบจะเก็บเฉพาะประวัติการดำเนินการไว้ตรวจสอบ"))return;
  setBusy(true);setError("");
  try {const r=await fetch("/api/bookings/manage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action:"delete"})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"ลบไม่สำเร็จ");onDeleted();window.dispatchEvent(new Event("bookings-changed"));}
  catch(e){setError(e instanceof Error?e.message:"ลบไม่สำเร็จ");}finally{setBusy(false);}
 }
 return <div><button type="button" className="button button-danger button-small" disabled={busy} onClick={remove}>{busy?"กำลังลบ…":"ลบรายการ"}</button>{error&&<p role="alert" className="form-message error">{error}</p>}</div>;
}
