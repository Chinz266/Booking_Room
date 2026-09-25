"use client";
import { DeleteBookingButton } from "./delete-booking-button";
import {roomCode} from "@/lib/rooms";
import { FormEvent,useCallback,useEffect,useState } from "react";
import type { ApiResponse,Booking } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function AdminPanel() {
  const [authenticated,setAuthenticated] = useState<boolean|null>(null);
  const [credentials,setCredentials] = useState({username:"",password:""});
  const [items,setItems] = useState<Booking[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [filters,setFilters] = useState({query:"",status:"",date:""});

  const loadBookings = useCallback(async()=>{
    const response = await fetch("/api/bookings?scope=admin");
    const result:ApiResponse<Booking[]> = await response.json();
    if (!result.success) throw new Error(result.message);
    setItems(result.data||[]);
  },[]);

  useEffect(()=>{
    let cancelled=false;
    fetch("/api/admin/session").then((r)=>r.json()).then(async(result)=>{
      if(cancelled)return;
      setAuthenticated(Boolean(result.success));
      if(result.success) await loadBookings();
    }).catch(()=>{if(!cancelled)setAuthenticated(false)});
    return()=>{cancelled=true};
  },[loadBookings]);

  async function login(event:FormEvent){
    event.preventDefault();setLoading(true);setError("");
    try{const response=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(credentials)});const result=await response.json();if(!result.success)throw new Error(result.message);setAuthenticated(true);setCredentials({username:"",password:""});await loadBookings();}
    catch(e){setError(e instanceof Error?e.message:"เข้าสู่ระบบไม่สำเร็จ");}finally{setLoading(false);}
  }

  async function logout(){await fetch("/api/admin/logout",{method:"POST"});setAuthenticated(false);setItems([]);setError("");}

  async function refresh(){setLoading(true);setError("");try{await loadBookings();}catch(e){setError(e instanceof Error?e.message:"โหลดข้อมูลไม่สำเร็จ");}finally{setLoading(false);}}

  async function change(id:string,status:string){let reason="";if(status==="rejected"){reason=window.prompt("ระบุเหตุผลที่ปฏิเสธ")?.trim()||"";if(!reason)return;}setLoading(true);setError("");try{const response=await fetch("/api/bookings/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status,reason})});const result=await response.json();if(!result.success)throw new Error(result.message);if(result.data?.id){setItems(current=>current.map(item=>item.id===result.data.id?{...item,...result.data}:item));}else{await loadBookings();}}catch(e){setError(e instanceof Error?e.message:"อัปเดตไม่สำเร็จ");}finally{setLoading(false);}}

  if(authenticated===null) return <div className="loading-panel">กำลังตรวจสอบการเข้าสู่ระบบ…</div>;
  if(!authenticated) return <form className="panel login-card" onSubmit={login}><div className="login-mark">ICT</div><h2>เข้าสู่ระบบผู้ดูแล</h2><p className="login-description">กรอกบัญชีผู้ดูแลเพื่อจัดการคำขอจองห้อง</p><div className="field"><label htmlFor="admin-user">ชื่อผู้ใช้</label><input id="admin-user" autoComplete="username" required value={credentials.username} onChange={(e)=>setCredentials({...credentials,username:e.target.value})} /></div><div className="field"><label htmlFor="admin-password">รหัสผ่าน</label><input id="admin-password" type="password" autoComplete="current-password" required value={credentials.password} onChange={(e)=>setCredentials({...credentials,password:e.target.value})} /></div><button className="button button-primary login-button" disabled={loading}>{loading?"กำลังเข้าสู่ระบบ…":"เข้าสู่ระบบ"}</button>{error&&<p className="form-message error">{error}</p>}</form>;

  const shown=items.filter((item)=>{const q=filters.query.trim().toLowerCase();return(!q||[item.id,item.name,item.student_id,item.room,roomCode(item.room),item.purpose,item.department,item.requester_type].some((value)=>String(value||"").toLowerCase().includes(q)))&&(!filters.status||item.status===filters.status)&&(!filters.date||item.booking_date===filters.date)}).sort((a,b)=>(a.status==="pending"?0:1)-(b.status==="pending"?0:1)||`${a.booking_date}${a.start_time}`.localeCompare(`${b.booking_date}${b.start_time}`));
  return <>{error&&<p className="form-message error">{error}</p>}<div className="admin-toolbar"><div><strong>รายการคำขอทั้งหมด</strong><span>แสดง {shown.length} จาก {items.length} รายการ</span></div><div className="admin-actions"><button className="button button-secondary button-small" onClick={refresh} disabled={loading}>รีเฟรช</button><button className="button button-secondary button-small" onClick={logout}>ออกจากระบบ</button></div></div><div className="admin-filters"><input aria-label="ค้นหารายการ" placeholder="ค้นหาชื่อ รหัส ห้อง หรือวัตถุประสงค์" value={filters.query} onChange={(e)=>setFilters({...filters,query:e.target.value})}/><select aria-label="กรองสถานะ" value={filters.status} onChange={(e)=>setFilters({...filters,status:e.target.value})}><option value="">ทุกสถานะ</option><option value="pending">รออนุมัติ</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ปฏิเสธ</option><option value="cancelled">ยกเลิก</option></select><input aria-label="กรองวันที่" type="date" value={filters.date} onChange={(e)=>setFilters({...filters,date:e.target.value})}/></div>{shown.length===0?<div className="empty-panel">ไม่พบรายการตามเงื่อนไข</div>:<div className="booking-list">{shown.map((item)=><article className="booking-row admin-row" key={item.id}><strong className="booking-room">ห้อง {roomCode(item.room)}</strong><div><strong>{item.name}</strong><div className="booking-meta">{item.student_id} · {item.id}</div><div className="booking-meta">{item.requester_type==="staff"?"บุคลากร":item.requester_type==="student"?"นักศึกษา":"ไม่ระบุประเภท"}{item.department?` · ${item.department}`:""}</div></div><div><strong>{item.booking_date}</strong><div className="booking-meta">{item.start_time}–{item.end_time} · {item.purpose}</div>{item.status_reason&&<div className="status-reason">เหตุผล: {item.status_reason}</div>}</div><StatusBadge status={item.status}/><div className="admin-actions">{item.status==="cancelled"&&<DeleteBookingButton id={item.id} onDeleted={()=>setItems(current=>current.filter(b=>b.id!==item.id))}/>} {item.status==="pending"&&<><button className="button button-primary button-small" onClick={()=>change(item.id,"approved")} disabled={loading}>อนุมัติ</button><button className="button button-danger button-small" onClick={()=>change(item.id,"rejected")} disabled={loading}>ปฏิเสธ</button></>}{["pending","approved"].includes(item.status)&&<button className="button button-secondary button-small" onClick={()=>change(item.id,"cancelled")} disabled={loading}>ยกเลิก</button>}</div></article>)}</div>}</>;
}
