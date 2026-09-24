import "server-only";
import { revalidateTag } from "next/cache";

function getUrl() {
  const value = process.env.APPS_SCRIPT_URL;
  if (!value) throw new Error("ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL");
  return value;
}

export async function appsScriptGet(action:string, params:Record<string,string> = {}) {
  const url = new URL(getUrl());
  url.searchParams.set("action",action);
  if (action === "getBookings") url.searchParams.set("adminKey",process.env.APPS_SCRIPT_ADMIN_KEY || "");
  Object.entries(params).forEach(([key,value]) => value && url.searchParams.set(key,value));
  const response = await fetch(url,{ cache:"no-store", redirect:"follow", signal:AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Apps Script ตอบกลับผิดพลาด");
  const result = await response.json();
  if (result.success !== true) throw new Error(result.message || "โหลดข้อมูลไม่สำเร็จ");
  return result;
}

async function cachedRawGet(action:string,params:Record<string,string> = {},ttlMs=10000) {
  const url = new URL(getUrl());
  url.searchParams.set("action",action);
  if (action === "getBookings") url.searchParams.set("adminKey",process.env.APPS_SCRIPT_ADMIN_KEY || "");
  Object.entries(params).forEach(([key,value])=>value&&url.searchParams.set(key,value));
  const response = await fetch(url,{next:{revalidate:Math.max(1,Math.ceil(ttlMs/1000)),tags:[`apps-script-${action}`]},redirect:"follow", signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error("Apps Script ตอบกลับผิดพลาด");
  const result = await response.json();
  if (result.success !== true) throw new Error(result.message || "โหลดข้อมูลไม่สำเร็จ");
  return result;
}

export function invalidateAppsScriptCache(action:string) {
  revalidateTag(`apps-script-${action}`,{expire:0});
}

export async function appsScriptPost(payload:unknown) {
  const response = await fetch(getUrl(),{ method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(payload), cache:"no-store", redirect:"follow", signal:AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Apps Script ตอบกลับผิดพลาด");
  return response.json();
}

export async function cachedAppsScriptGet(action:string,params:Record<string,string> = {},ttlMs=10000) {
  // Share one short-lived server cache across room/date filters. Never sent directly to the browser.
  if(action==="getBookings" && Object.keys(params).every(key=>key==="room"||key==="booking_date") && Object.values(params).some(Boolean)) {
    const result=await cachedRawGet(action,{},ttlMs);
    return {...result,data:(result.data||[]).filter((item:Record<string,unknown>)=>(!params.room||String(item.room)===params.room)&&(!params.booking_date||String(item.booking_date)===params.booking_date))};
  }
  return cachedRawGet(action,params,ttlMs);
}
