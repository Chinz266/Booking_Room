/* eslint-disable @typescript-eslint/no-require-imports -- Node VM tests for TypeScript server modules. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const crypto=require('node:crypto');
function load(file,modules={},globals={}){
 const exports={};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:name=>{if(name in modules)return modules[name];throw new Error('Unexpected dependency '+name);},Response,Request,URL,Buffer,AbortSignal,console,...globals});
 return exports;
}
const rooms=load('src/lib/rooms.ts');
const summary=load('src/lib/dashboard.ts',{'./rooms':rooms});
const booking={id:'B1',room:'704',booking_date:'2026-09-20',start_time:'09:00',end_time:'10:30',status:'approved',requester_type:'staff',department:'CS'};
test('dashboard counts month and approved hours without inferring legacy identities',()=>{
 const result=summary.summarizeBookings([booking,{...booking,status:'pending',requester_type:undefined,department:undefined},{...booking,status:'cancelled',requester_type:'student'},{...booking,booking_date:'2026-10-01'}],'2026-09');
 assert.equal(result.counts.total,3);assert.equal(result.hours,1.5);assert.equal(result.requester.unspecified,1);assert.equal(result.rooms[0].category,'ห้องประชุม');assert.equal(result.daily.length,1);
 assert.equal(summary.summarizeBookings([],'2026-09').hours,0);
});
test('dashboard endpoint requires login and gets scope from session, not URL',async()=>{
 let user=null;let received;
 const api=load('src/app/api/dashboard/route.ts',{'@/lib/auth':{currentUser:async()=>user,backend:async(action,args)=>{received=args;return [booking];}},'@/lib/apps-script':{cachedAppsScriptGet:async()=>({data:[booking]})},'@/lib/dashboard':summary,'@/lib/line':{lineConfigured:()=>true}});
 const request=new Request('http://localhost/api/dashboard?month=2026-09&scope=admin');
 assert.equal((await api.GET(request)).status,401);
 user={id:'user-a',role:'user'};
 const response=await api.GET(request);const body=await response.json();
 assert.equal(received.role,'user');assert.equal(received.user_id,'user-a');assert.equal(body.data.lineConfigured,undefined);
 assert.equal(JSON.stringify(body).includes('student_id'),false);
 assert.equal((await api.GET(new Request('http://localhost/api/dashboard?month=invalid'))).status,400);
 user={id:'admin-a',role:'admin'};assert.equal((await (await api.GET(request)).json()).data.lineConfigured,true);
});
test('LINE is disabled without config and failure cannot reject successful booking',async()=>{
 const env={};const jobs=[];const errors=[];let payload;
 const line=load('src/lib/line.ts',{'server-only':{},'next/server':{after:job=>jobs.push(job)},'node:crypto':crypto},{process:{env},fetch:async(url,options)=>{payload=JSON.parse(options.body);return new Response('',{status:500});},console:{error:(...args)=>errors.push(args)}});
 line.queueBookingNotification(booking,'created');assert.equal(jobs.length,0);
 env.LINE_CHANNEL_ACCESS_TOKEN='test-token';env.LINE_ADMIN_GROUP_ID='C'+'a'.repeat(32);
 line.queueBookingNotification({...booking,name:'Test',student_id:'private-student-id'},'created');assert.equal(jobs.length,1);
 await jobs[0]();assert.equal(payload.to,env.LINE_ADMIN_GROUP_ID);assert.equal(payload.messages[0].text.includes('private-student-id'),false);assert.equal(errors.length,1);
});
test('LINE webhook rejects forged signatures and accepts signed verify requests',async()=>{
 const env={LINE_CHANNEL_SECRET:'test-secret'};
 const api=load('src/app/api/line/webhook/route.ts',{'node:crypto':crypto},{process:{env}});
 const body=JSON.stringify({events:[]});
 assert.equal((await api.POST(new Request('http://localhost',{method:'POST',body}))).status,401);
 const signature=crypto.createHmac('sha256',env.LINE_CHANNEL_SECRET).update(body).digest('base64');
 assert.equal((await api.POST(new Request('http://localhost',{method:'POST',body,headers:{'x-line-signature':signature}}))).status,200);
});

test('booking filters share backend cache URL and preserve room/date filtering',async()=>{
 const urls=[];const api=load('src/lib/apps-script.ts',{'server-only':{},'next/cache':{revalidateTag:()=>{}}},{process:{env:{APPS_SCRIPT_URL:'https://example.test/exec',APPS_SCRIPT_ADMIN_KEY:'test'}},fetch:async url=>{urls.push(String(url));return Response.json({success:true,data:[{id:'a',room:'704',booking_date:'2026-09-25'},{id:'b',room:'706',booking_date:'2026-09-25'},{id:'c',room:'704',booking_date:'2026-09-26'}]});}});
 const a=await api.cachedAppsScriptGet('getBookings',{room:'704',booking_date:'2026-09-25'});assert.equal(a.data.length,1);assert.equal(a.data[0].id,'a');await api.cachedAppsScriptGet('getBookings',{booking_date:'2026-09-26'});assert.equal(urls[0],urls[1]);assert.equal(new URL(urls[0]).searchParams.has('room'),false);
});
test('status change checks role once and never writes for a normal user',async()=>{
 let calls=0,writes=0,user={role:'user',username:'user'};
 const api=load('src/app/api/bookings/status/route.ts',{'@/lib/line':{queueBookingNotification:()=>{}},'@/lib/auth':{currentUser:async()=>{calls++;return user;}},'@/lib/apps-script':{appsScriptPost:async()=>{writes++;return {success:true,data:{id:'a'}};},invalidateAppsScriptCache:()=>{}}},{process:{env:{APPS_SCRIPT_ADMIN_KEY:'test'}}});
 const request=()=>new Request('https://example.test/api/bookings/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'a',status:'approved'})});assert.equal((await api.POST(request())).status,401);assert.equal(writes,0);calls=0;user={role:'admin',username:'admin'};assert.equal((await api.POST(request())).status,200);assert.equal(calls,1);assert.equal(writes,1);
});
