/* eslint-disable @typescript-eslint/no-require-imports -- Apps Script VM fixtures run in Node CommonJS. */
const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function fixture(){
 const tables={room:[["id","room_number","room_name","status"],[1,"704","ห้อง 704","available"]],bookings:[["id","room","booking_date","start_time","end_time","name","student_id","purpose","status","user_id"]]};
 function sheet(name){return {getDataRange:()=>({getValues:()=>tables[name].map(r=>r.slice())}),getLastColumn:()=>tables[name][0].length,getRange:(r,c,n=1,m=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>tables[name][r+i-1]?.[c+j-1]??"")),setValue:v=>{tables[name][r-1]??=[];tables[name][r-1][c-1]=v;}}),appendRow:r=>tables[name].push(r)};}
 const db={getSheetByName:n=>tables[n]?sheet(n):null,insertSheet:n=>{tables[n]=[];return sheet(n);}};
 let uid=0;const cache=new Map();
 const context={SpreadsheetApp:{openById:()=>db},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},PropertiesService:{getScriptProperties:()=>({getProperty:()=>"secret"})},Utilities:{getUuid:()=>String(++uid).padStart(8,"0")+"-uuid",formatDate:(d,t,f)=>f==="yyyy-MM-dd HH:mm"?"2026-09-11 08:00":f==="yyyyMMddHHmmss"?"20260911080000":f==="yyyy-MM-dd"?"2026-09-11":"2026-09-11 08:00:00"},Session:{getScriptTimeZone:()=>"Asia/Bangkok"},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},ContentService:{MimeType:{JSON:"json"},createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),context);return {c:context,tables,post:(action,data={},key="secret")=>context.doPost({postData:{contents:JSON.stringify({action,data,adminKey:key})}})};
}
const data={room:"704",booking_date:"2026-09-12",start_time:"09:00",end_time:"10:00",name:"Test",student_id:"12345",purpose:"test",user_id:"a",requester_type:"student",department:"วิทยาการคอมพิวเตอร์"};
test("anonymous direct Apps Script operations are denied",()=>{const f=fixture();for(const a of ["createBooking","getMyBooking","accountRegister","accountList","roomSave"])assert.equal(f.post(a,data,"").success,false);assert.equal(f.c.doGet({parameter:{action:"getBookings"}}).success,false);});
test("ownership, collision, approval and own cancellation",()=>{const f=fixture();const created=f.post("createBooking",data);assert.equal(created.success,true);const id=created.data.id;assert.equal(f.post("createBooking",{...data,user_id:"b"}).code,"BOOKING_CONFLICT");assert.equal(f.post("getMyBooking",{id,user_id:"b",role:"user"}).success,false);assert.equal(f.post("cancelOwnBooking",{id,user_id:"b",role:"user"}).success,false);assert.equal(f.post("approveBooking",{id}).success,true);assert.equal(f.post("getMyBooking",{id,user_id:"a",role:"user"}).data.status,"approved");assert.equal(f.post("cancelOwnBooking",{id,user_id:"a",role:"user"}).data.status,"cancelled");assert.equal(f.post("approveBooking",{id}).success,false);assert.equal(f.tables.audit_log.length,4);});
test("reject requires reason and logs it",()=>{const f=fixture();const id=f.post("createBooking",data).data.id;assert.equal(f.post("rejectBooking",{id}).success,false);assert.equal(f.post("rejectBooking",{id,reason:"ปิดซ่อม"}).data.status_reason,"ปิดซ่อม");});
test("invalid date, impossible time and past booking are rejected",()=>{for(const change of [{booking_date:"2026-02-30"},{start_time:"25:00",end_time:"26:00"},{booking_date:"2026-09-10"},{booking_date:"2026-09-11",start_time:"07:00"}])assert.equal(fixture().post("createBooking",{...data,...change}).success,false);});
test("registration ignores requested admin role and sessions revoke on update",()=>{const f=fixture();const u=f.post("accountRegister",{username:"testuser",name:"Name",student_id:"12345",password_hash:"salt:hash",role:"admin"}).data;assert.equal(u.role,"user");assert.equal(f.post("accountRegister",{username:"testuser",password_hash:"x"}).success,false);assert.equal(f.post("accountList").data[0].password_hash,undefined);assert.equal(f.post("accountUpdate",{id:u.id,role:"user",active:false,actor:"admin"}).success,true);const session=f.post("accountSession",{id:u.id}).data;assert.equal(session.active,false);assert.notEqual(session.version,u.version);});
test("legacy booking needs explicit owner assignment",()=>{const f=fixture();f.tables.bookings.push(["OLD","704","2026-09-12","11:00","12:00","Old","12345","test","pending",""]);const u=f.post("accountRegister",{username:"testuser",name:"Name",student_id:"12345",password_hash:"hash"}).data;assert.equal(f.post("getMyBooking",{id:"OLD",user_id:u.id,role:"user"}).success,false);f.post("assignBookingOwner",{id:"OLD",user_id:u.id,actor:"admin"});assert.equal(f.post("getMyBooking",{id:"OLD",user_id:u.id,role:"user"}).success,true);});


test("booking profile persists and migrates legacy headers",()=>{const f=fixture();const result=f.post("createBooking",data);assert.equal(result.success,true);const stored=f.post("getMyBooking",{id:result.data.id,user_id:"a",role:"user"}).data;assert.equal(stored.requester_type,"student");assert.equal(stored.department,data.department);assert.ok(f.tables.bookings[0].includes("department"));});
test("staff can book without student id, student requires it",()=>{const f=fixture();assert.equal(f.post("createBooking",{...data,requester_type:"staff",student_id:""}).success,true);assert.equal(fixture().post("createBooking",{...data,student_id:""}).success,false);for(const change of [{requester_type:"admin"},{department:""},{department:"x".repeat(121)}])assert.equal(fixture().post("createBooking",{...data,...change}).success,false);});

test("Google accounts require trusted backend key, complete profile and never inherit admin by email",()=>{
 const f=fixture();const identity={sub:"google-sub-1",email:"admin@example.com",name:"Test"};
 assert.equal(f.post("accountGoogle",identity,"").success,false);
 assert.equal(f.post("accountGoogle",identity).data,null);
 assert.equal(f.post("accountGoogle",{...identity,profile:{name:"Test"}}).success,false);
 const profile={name:"Test",department:"CS",requester_type:"student",student_id:"12345"};
 const created=f.post("accountGoogle",{...identity,role:"admin",profile});assert.equal(created.success,true);assert.equal(created.data.role,"user");
 assert.equal(created.data.department,"CS");assert.equal(f.post("accountGoogle",identity).data.id,created.data.id);
 const second=f.post("accountGoogle",{...identity,sub:"google-sub-2",profile});assert.notEqual(second.data.id,created.data.id);
 f.post("accountUpdate",{id:created.data.id,role:"admin",active:false,actor:"admin"});
 const blocked=f.post("accountGoogle",identity).data;assert.equal(blocked.active,false);assert.equal(blocked.role,"admin");
 assert.equal(f.post("accountLogin",{username:created.data.username}).data.password_hash,"");
});
test("Google schema migration preserves existing password accounts",()=>{
 const f=fixture();f.tables.users=[["id","username","name","student_id","password_hash","role","active","version"],["old","localuser","Local","12345","salt:hash","user",true,"v1"]];
 assert.equal(f.post("accountGoogle",{sub:"new-google",email:"local@example.com"}).data,null);
 const old=f.post("accountLogin",{username:"localuser"}).data;assert.equal(old.id,"old");assert.equal(old.password_hash,"salt:hash");assert.equal(old.version,"v1");assert.ok(f.tables.users[0].includes("google_sub"));
});

test('short booking IDs skip collisions and retain legacy lookup',()=>{
 const f=fixture();
 assert.equal(f.c.createBookingId([{id:'BK00000001'}]),'BK00000002');
 const created=f.post('createBooking',data);
 assert.match(created.data.id,/^BK[0-9A-F]{8}$/);
 assert.equal(f.post('getMyBooking',{id:created.data.id.toLowerCase(),user_id:'a',role:'user'}).success,true);
 f.tables.bookings[1][0]='BK20260907123456ABCD';
 assert.equal(f.post('getMyBooking',{id:'BK20260907123456ABCD',user_id:'a',role:'user'}).success,true);
 f.c.Utilities.getUuid=()=> '00000001-0000-4000-8000-000000000000';
 assert.throws(()=>f.c.createBookingId([{id:'BK00000001'}]),/สร้างรหัส/);
});

test('only owners or admins can delete cancelled bookings while retaining audit',()=>{
 const f=fixture();const id=f.post('createBooking',data).data.id;
 assert.equal(f.post('deleteBooking',{id,user_id:'a',role:'user'}).success,false);
 f.post('cancelOwnBooking',{id,user_id:'a',role:'user'});
 assert.equal(f.post('deleteBooking',{id,user_id:'b',role:'user'}).success,false);
 assert.equal(f.post('deleteBooking',{id,user_id:'a',role:'user'}).success,true);
 assert.equal(f.post('getMyBooking',{id,user_id:'a',role:'user'}).success,false);
 assert.equal(f.post('ownedBookings',{user_id:'a',role:'user'}).data.length,0);
 assert.equal(f.c.doGet({parameter:{action:'getBookings',adminKey:'secret'}}).data.length,0);
 assert.equal(f.tables.bookings.length,2);
 assert.equal(f.tables.audit_log.at(-1)[2],'deleted');
 assert.equal(f.post('deleteBooking',{id,user_id:'a',role:'user'}).success,false);
 const g=fixture();const other=g.post('createBooking',data).data.id;
 g.post('cancelOwnBooking',{id:other,user_id:'a',role:'user'});
 assert.equal(g.post('deleteBooking',{id:other,user_id:'admin',role:'admin'}).success,true);
});
