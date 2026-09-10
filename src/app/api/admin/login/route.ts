import { createAdminSession,credentialsAreValid } from "@/lib/admin-auth";
import { checkRateLimit,requestIdentity } from "@/lib/rate-limit";

export async function POST(request:Request) {
  try {
    const rate = checkRateLimit(`admin-login:${requestIdentity(request)}`,5,10*60*1000);
    if (!rate.allowed) return Response.json({success:false,message:`ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ ${Math.ceil(rate.retryAfter/60)} นาที`},{status:429,headers:{"Retry-After":String(rate.retryAfter)}});
    const {username,password} = await request.json();
    if (!credentialsAreValid(String(username||""),String(password||""))) return Response.json({success:false,message:"ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"},{status:401});
    await createAdminSession();
    return Response.json({success:true});
  } catch { return Response.json({success:false,message:"เข้าสู่ระบบไม่สำเร็จ"},{status:500}); }
}
