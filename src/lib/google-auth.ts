import "server-only";
import {createHmac, randomBytes} from "node:crypto";
import {cookies} from "next/headers";
import {OAuth2Client} from "google-auth-library";
import {equal} from "./auth";

export const FLOW_COOKIE = "cs_google_flow";
export const PROFILE_COOKIE = "cs_google_profile";
export type GoogleIdentity = {sub:string; email:string; name:string};
export function googleConfigured(){return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);}
export function googleClient(){
  if(!googleConfigured())throw new Error("Google login is not configured");
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI);
}
function mac(value:string){
  if(!process.env.SESSION_SECRET)throw new Error("Missing session secret");
  return createHmac("sha256",process.env.SESSION_SECRET).update("google:"+value).digest("base64url");
}
export function sealGoogleCookie(kind:string,data:unknown){const value=Buffer.from(JSON.stringify({kind,data,expires:Date.now()+600000})).toString("base64url");return value+"."+mac(value);}
export function readGoogleCookie<T>(kind:string,token:string|undefined):T|null{
  if(!token)return null;
  const [value,signature,...extra]=token.split(".");
  if(extra.length||!signature||!equal(mac(value),signature))return null;
  try{const p=JSON.parse(Buffer.from(value,"base64url").toString());return p.kind===kind&&Number.isFinite(p.expires)&&p.expires>Date.now()?p.data:null;}catch{return null;}
}
export async function setGoogleCookie(kind:string,data:unknown){(await cookies()).set(kind,sealGoogleCookie(kind,data),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});}
export function randomGoogleValue(){return randomBytes(32).toString("base64url");}
export async function pendingGoogleIdentity(){return readGoogleCookie<GoogleIdentity>(PROFILE_COOKIE,(await cookies()).get(PROFILE_COOKIE)?.value);}
export function validGoogleIdentity(p:{sub?:string;email?:string;email_verified?:boolean;nonce?:string}|undefined,nonce:string):p is {sub:string;email:string;email_verified:true;nonce:string}{return Boolean(p?.sub&&p.sub.length<=255&&p.email&&p.email.length<=254&&p.email_verified===true&&p.nonce===nonce);}
