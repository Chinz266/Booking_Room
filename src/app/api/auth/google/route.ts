import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {googleConfigured,googleClient,randomGoogleValue,setGoogleCookie,FLOW_COOKIE,PROFILE_COOKIE} from "@/lib/google-auth";
import {checkRateLimit,requestIdentity} from "@/lib/rate-limit";
export async function GET(request:Request){
  if(!googleConfigured())return NextResponse.redirect(new URL("/login?google=unavailable",request.url));
  if(!checkRateLimit("google:"+requestIdentity(request),15,600000).allowed)return NextResponse.redirect(new URL("/login?google=retry",request.url));
  const state=randomGoogleValue(),nonce=randomGoogleValue(),verifier=randomGoogleValue();
  (await cookies()).delete(PROFILE_COOKIE);
  await setGoogleCookie(FLOW_COOKIE,{state,nonce,verifier});
  const url=googleClient().generateAuthUrl({scope:["openid","email","profile"],state,nonce,prompt:"select_account"});
  const target=new URL(url);target.searchParams.set("code_challenge",createHash("sha256").update(verifier).digest("base64url"));target.searchParams.set("code_challenge_method","S256");
  return NextResponse.redirect(target);
}
