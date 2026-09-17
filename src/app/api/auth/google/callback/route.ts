import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {backend,createSession,equal} from "@/lib/auth";
import {FLOW_COOKIE,PROFILE_COOKIE,googleClient,readGoogleCookie,setGoogleCookie,validGoogleIdentity} from "@/lib/google-auth";
export const maxDuration=60;
export async function GET(request:Request){
  const jar=await cookies(),url=new URL(request.url);
  const flow=readGoogleCookie<{state:string;nonce:string;verifier:string}>(FLOW_COOKIE,jar.get(FLOW_COOKIE)?.value);
  jar.delete(FLOW_COOKIE);
  const fail=(code:string)=>NextResponse.redirect(new URL("/login?google="+code,url.origin));
  if(!flow||!equal(flow.state,url.searchParams.get("state")||""))return fail("retry");
  if(url.searchParams.has("error"))return fail("cancelled");
  const code=url.searchParams.get("code");if(!code)return fail("retry");
  try{
    const client=googleClient();
    const {tokens}=await client.getToken({code,codeVerifier:flow.verifier});
    if(!tokens.id_token)return fail("failed");
    const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_CLIENT_ID});
    const p=ticket.getPayload();
    if(!validGoogleIdentity(p,flow.nonce))return fail("failed");
    const identity={sub:p.sub,email:p.email,name:(p.name||"").slice(0,120)};
    // Identity is verified on the server; never link accounts by an email match.
    let account;
    try{account=await backend("accountGoogle",identity);}catch{return fail("backend");}
    if(account){if(!account.active)return fail("disabled");await createSession(account);jar.delete(PROFILE_COOKIE);return NextResponse.redirect(new URL(account.role==="admin"?"/admin":"/my-bookings",url.origin));}
    await setGoogleCookie(PROFILE_COOKIE,identity);
    return NextResponse.redirect(new URL("/complete-profile",url.origin));
  }catch{return fail("failed");}
}
