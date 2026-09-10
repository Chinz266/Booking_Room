import "server-only";
import { createHmac,timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "cs_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function secret() {
  if (!process.env.SESSION_SECRET) throw new Error("ยังไม่ได้ตั้งค่า SESSION_SECRET");
  return process.env.SESSION_SECRET;
}

function safeEqual(left:string,right:string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a,b);
}

function sign(value:string) { return createHmac("sha256",secret()).update(value).digest("base64url"); }

export function credentialsAreValid(username:string,password:string) {
  const expectedUser = process.env.ADMIN_USERNAME || ""; const expectedPassword = process.env.ADMIN_PASSWORD || "";
  return Boolean(expectedUser && expectedPassword && safeEqual(username,expectedUser) && safeEqual(password,expectedPassword));
}

export async function createAdminSession() {
  const payload = Buffer.from(JSON.stringify({role:"admin",expires:Date.now()+SESSION_SECONDS*1000})).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  (await cookies()).set(COOKIE_NAME,token,{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:SESSION_SECONDS});
}

export async function verifyAdminSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [payload,signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature,sign(payload))) return false;
  try { const data = JSON.parse(Buffer.from(payload,"base64url").toString("utf8")); return data.role === "admin" && Number(data.expires) > Date.now(); }
  catch { return false; }
}

export async function deleteAdminSession() { (await cookies()).delete(COOKIE_NAME); }
