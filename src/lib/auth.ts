import "server-only";
import {createHmac,timingSafeEqual,randomBytes,scryptSync} from "node:crypto";
import {cookies} from "next/headers";
import {appsScriptPost} from "./apps-script";
export type Account={id:string;username:string;name:string;student_id:string;role:"admin"|"user";active:boolean;version:string;email?:string;requester_type?:"student"|"staff";department?:string};
function secret(){if(!process.env.SESSION_SECRET)throw new Error("ยังไม่ได้ตั้งค่า SESSION_SECRET");return process.env.SESSION_SECRET;}
function sign(s:string){return createHmac("sha256",secret()).update(s).digest("base64url");}
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function passwordHash(password:string){const salt=randomBytes(16).toString("hex");return salt+":"+scryptSync(password,salt,64).toString("hex");}
export function passwordMatches(password:string,hash:string){const [salt,digest]=hash.split(":");return Boolean(salt&&digest&&equal(scryptSync(password,salt,64).toString("hex"),digest));}
export async function backend(action:string,data:unknown={}){const result=await appsScriptPost({action,adminKey:process.env.APPS_SCRIPT_ADMIN_KEY,data});if(!result.success)throw new Error(result.message||"ไม่สามารถเชื่อมต่อระบบสมาชิก กรุณาอัปเดต Apps Script");return result.data;}
export async function createSession(user:Account){const payload=Buffer.from(JSON.stringify({id:user.id,version:user.version,expires:Date.now()+28800000})).toString("base64url");(await cookies()).set("cs_session",payload+"."+sign(payload),{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:28800});}
export async function currentUser():Promise<Account|null>{const token=(await cookies()).get("cs_session")?.value;if(!token)return null;const parts=token.split(".");if(parts.length!==2||!equal(parts[1],sign(parts[0])))return null;let p;try{p=JSON.parse(Buffer.from(parts[0],"base64url").toString());}catch{return null;}if(!p.id||p.expires<=Date.now())return null;if(p.id==="bootstrap-admin"){if(p.version!==sign(process.env.ADMIN_PASSWORD||""))return null;return {id:p.id,username:process.env.ADMIN_USERNAME||"admin",name:"ผู้ดูแลระบบ",student_id:"",role:"admin",active:true,version:p.version};}const u=await backend("accountSession",{id:p.id});if(!u||!u.active||u.version!==p.version)return null;return u;}
export async function bootstrap(){const u:Account={id:"bootstrap-admin",username:process.env.ADMIN_USERNAME||"admin",name:"ผู้ดูแลระบบ",student_id:"",role:"admin",active:true,version:sign(process.env.ADMIN_PASSWORD||"")};await createSession(u);return u;}
export async function logout(){const jar=await cookies();jar.delete("cs_session");jar.delete("cs_admin_session");}

