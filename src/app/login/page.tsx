import {LoginForm} from "@/components/login-form";
import {googleConfigured} from "@/lib/google-auth";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:PageProps<"/login">){
  const query=await searchParams;
  const messages:Record<string,string>={unavailable:"ยังไม่เปิดใช้งาน Google กรุณาใช้บัญชีเดิมก่อน",retry:"คำขอหมดอายุ กรุณากดเข้าสู่ระบบด้วย Google อีกครั้ง",cancelled:"ยกเลิกการเข้าสู่ระบบด้วย Google แล้ว",disabled:"บัญชีถูกระงับ กรุณาติดต่อผู้ดูแล",failed:"เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่",backend:"ระบบสมาชิกยังไม่พร้อม กรุณาแจ้งผู้ดูแลให้อัปเดต Apps Script"};
  return <main className="shell page-content"><LoginForm googleEnabled={googleConfigured()} googleMessage={typeof query.google==="string"?messages[query.google]||"":""}/></main>;
}
