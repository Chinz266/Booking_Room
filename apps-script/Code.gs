const SPREADSHEET_ID = "1nHi-3RMvx0nI5tuY3YAiOaNpakXQ5yNrMoRGNk2VavQ";
const ROOM_SHEET = "room";
const BOOKING_SHEET = "bookings";
const AUDIT_SHEET = "audit_log";
const BLOCKING_STATUSES = ["pending", "approved"];
const EXTRA_BOOKING_HEADERS = ["status_reason", "updated_at", "updated_by", "user_id", "requester_type", "department", "deleted_at", "deleted_by"];

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || "");
    if (action === "getCapabilities") return jsonResponse({success:true,data:{bookingProfile:1,googleLogin:1}});
    if (action === "getRooms") return jsonResponse({ success: true, data: readSheet(ROOM_SHEET) });
    if (action === "getBookings") {
      verifyAdminKey(e && e.parameter && e.parameter.adminKey);
      const bookings = readSheet(BOOKING_SHEET);
      const room = String((e.parameter && e.parameter.room) || "").trim();
      const bookingDate = normalizeDate((e.parameter && e.parameter.booking_date) || "");
      const filtered = bookings.filter(function (booking) {
        return !booking.deleted_at && (!room || String(booking.room) === room) && (!bookingDate || normalizeDate(booking.booking_date) === bookingDate);
      });
      return jsonResponse({ success: true, data: filtered.map(publicBooking) });
    }
    return jsonResponse({ success: false, message: "Invalid action" });
  } catch (error) { return errorResponse(error); }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = String(body.action || "");
    const data = body.data || {};
    verifyAdminKey(body.adminKey);
    if (["accountGoogle","accountRegister","accountLogin","accountSession","accountList","accountUpdate","ownedBookings","roomList","roomSave","auditList","assignBookingOwner"].indexOf(action)!==-1) return jsonResponse({success:true,data:roleAction(action,data)});
    if (action === "createBooking") return jsonResponse(createBooking(data));
    if (action === "getMyBooking") return jsonResponse(getMyBooking(data));
    if (action === "deleteBooking") return jsonResponse(deleteBooking(data));
    if (action === "cancelOwnBooking") return jsonResponse(cancelOwnBooking(data));
    if (["approveBooking", "rejectBooking", "cancelBooking"].indexOf(action) !== -1) {
      verifyAdminKey(body.adminKey);
      const statusByAction = { approveBooking: "approved", rejectBooking: "rejected", cancelBooking: "cancelled" };
      return jsonResponse(updateBookingStatus(data.id, statusByAction[action], data.reason, data.actor || "admin"));
    }
    return jsonResponse({ success: false, message: "Invalid action" });
  } catch (error) { return errorResponse(error); }
}

function createBooking(data) {
  if(!data.user_id)throw new Error("กรุณาเข้าสู่ระบบ");
  const booking = validateBooking(data);
  enforceRateLimit("create:" + String(data.user_id), 5, 600);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    ensureBookingHeaders();
    const bookings = readSheet(BOOKING_SHEET);
    const hasConflict = bookings.some(function (existing) {
      return String(existing.room) === booking.room && normalizeDate(existing.booking_date) === booking.booking_date &&
        BLOCKING_STATUSES.indexOf(String(existing.status).toLowerCase()) !== -1 &&
        booking.start_time < normalizeTime(existing.end_time) && booking.end_time > normalizeTime(existing.start_time);
    });
    if (hasConflict) return { success: false, code: "BOOKING_CONFLICT", message: "ห้องนี้มีการจองในช่วงเวลาดังกล่าวแล้ว" };
    const id = createBookingId(bookings);
    const now = isoTimestamp();
    appendObjectRow(BOOKING_SHEET, {
      id: id, user_id: String(data.user_id), room: booking.room, booking_date: booking.booking_date, start_time: booking.start_time,
      end_time: booking.end_time, name: booking.name, student_id: booking.student_id,
      purpose: booking.purpose, requester_type: booking.requester_type, department: booking.department, status: "pending",
      status_reason: "", updated_at: now, updated_by: String(data.user_id)
    });
    appendAudit(id, "created", String(data.user_id), "ส่งคำขอจองห้อง");
    return { success: true, message: "ส่งคำขอจองห้องแล้ว", data: Object.assign({ id: id, status: "pending" }, booking) };
  } finally { lock.releaseLock(); }
}

function getMyBooking(data) {
  enforceRateLimit("lookup:" + String(data.id || ""), 12, 600);
  const booking = findBookingForAccount(data.id, data.user_id, data.role);
  return { success: true, data: publicBooking(booking) };
}

function cancelOwnBooking(data) {
  enforceRateLimit("cancel:" + String(data.id || ""), 8, 600);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const booking = findBookingForAccount(data.id, data.user_id, data.role);
    if (BLOCKING_STATUSES.indexOf(String(booking.status).toLowerCase()) === -1) return { success: false, message: "รายการนี้ไม่สามารถยกเลิกได้" };
    return updateBookingStatusUnlocked(booking.id, "cancelled", "ยกเลิกโดยผู้จอง", data.actor || data.user_id);
  } finally { lock.releaseLock(); }
}

function updateBookingStatus(id, newStatus, reason, actor) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return updateBookingStatusUnlocked(id, newStatus, reason, actor); }
  finally { lock.releaseLock(); }
}

function updateBookingStatusUnlocked(id, newStatus, reason, actor) {
  const bookingId = String(id || "").trim();
  if (!bookingId) throw new Error("กรุณาระบุรหัสการจอง");
  if (newStatus === "rejected" && !String(reason || "").trim()) throw new Error("กรุณาระบุเหตุผลที่ปฏิเสธ");
  ensureBookingHeaders();
  const sheet = getSpreadsheet().getSheetByName(BOOKING_SHEET);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idIndex = headers.indexOf("id");
  for (let row = 1; row < values.length; row += 1) {
    if (String(values[row][idIndex]) !== bookingId) continue;
    const currentStatus=String(values[row][headers.indexOf("status")]);
    if((newStatus==="approved"||newStatus==="rejected")&&currentStatus!=="pending")throw new Error("เปลี่ยนสถานะได้เฉพาะรายการรออนุมัติ");
    if(newStatus==="cancelled"&&BLOCKING_STATUSES.indexOf(currentStatus)<0)throw new Error("รายการนี้ยกเลิกไม่ได้");
    const statusReason = String(reason || (newStatus === "cancelled" ? "ยกเลิกโดยผู้ดูแล" : "")).trim();
    const now = isoTimestamp();
    setRowValue(sheet, headers, row + 1, "status", newStatus);
    setRowValue(sheet, headers, row + 1, "status_reason", statusReason);
    setRowValue(sheet, headers, row + 1, "updated_at", now);
    setRowValue(sheet, headers, row + 1, "updated_by", String(actor || "admin"));
    appendAudit(bookingId, newStatus, String(actor || "admin"), statusReason);
    const updated = {};
    headers.forEach(function (header, index) { updated[header] = values[row][index]; });
    updated.status = newStatus; updated.status_reason = statusReason; updated.updated_at = now; updated.updated_by = String(actor || "admin");
    return { success: true, message: "อัปเดตสถานะเรียบร้อย", data: publicBooking(updated) };
  }
  return { success: false, code: "NOT_FOUND", message: "ไม่พบรายการจอง" };
}

function findBookingForAccount(id,userId,role) {
 const bookingId=String(id||"").trim().toUpperCase();
 const booking=readSheet(BOOKING_SHEET).filter(function(b){return String(b.id).toUpperCase()===bookingId;})[0];
 if(!booking||booking.deleted_at||!userId||(role!=="admin"&&String(booking.user_id||"")!==String(userId)))throw new Error("ไม่พบรายการหรือไม่มีสิทธิ์เข้าถึง");
 return booking;
}

function publicBooking(booking) {
  const copy = {};
  Object.keys(booking || {}).forEach(function (key) { if(key!=="access_pin_hash")copy[key] = booking[key]; });
  return copy;
}

function validateBooking(data) {
  const booking = { room: String(data.room || "").trim(), booking_date: normalizeDate(data.booking_date), start_time: normalizeTime(data.start_time), end_time: normalizeTime(data.end_time), name: String(data.name || "").trim(), student_id: String(data.student_id || "").trim(), purpose: String(data.purpose || "").trim() };
  booking.requester_type = String(data.requester_type || "");
  booking.department = String(data.department || "").trim();
  if (["student","staff"].indexOf(booking.requester_type) < 0) throw new Error("กรุณาเลือกประเภทผู้จอง");
  if (booking.requester_type === "staff") booking.student_id = "";
  Object.keys(booking).forEach(function (key) { if (key === "student_id" && booking.requester_type === "staff") return; if (!booking[key]) throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน"); });
  if (booking.department.length > 120) throw new Error("สาขาวิชายาวเกิน 120 ตัวอักษร");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.booking_date)) throw new Error("วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD");
  if (!/^\d{2}:\d{2}$/.test(booking.start_time) || !/^\d{2}:\d{2}$/.test(booking.end_time)) throw new Error("เวลาต้องอยู่ในรูปแบบ HH:mm");
  const parsed=new Date(booking.booking_date+"T00:00:00Z");
  if(isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==booking.booking_date)throw new Error("วันที่ไม่ถูกต้อง");
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.start_time)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.end_time))throw new Error("เวลาไม่ถูกต้อง");
  const now=Utilities.formatDate(new Date(),"Asia/Bangkok","yyyy-MM-dd HH:mm");
  if(booking.booking_date+" "+booking.start_time<=now)throw new Error("ไม่สามารถจองเวลาที่ผ่านมาแล้ว");
  if (booking.start_time >= booking.end_time) throw new Error("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม");
  if (booking.name.length > 120 || booking.student_id.length > 30 || booking.purpose.length > 300) throw new Error("ข้อมูลยาวเกินกว่าที่กำหนด");
  const roomIsAvailable = readSheet(ROOM_SHEET).some(function (room) { return String(room.room_number) === booking.room && String(room.status).toLowerCase() === "available"; });
  if (!roomIsAvailable) throw new Error("ไม่พบห้องหรือห้องไม่พร้อมใช้งาน");
  return booking;
}

function ensureBookingHeaders() {
  const sheet = getSpreadsheet().getSheetByName(BOOKING_SHEET);
  if (!sheet) throw new Error("ไม่พบชีต " + BOOKING_SHEET);
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(String);
  EXTRA_BOOKING_HEADERS.forEach(function (header) { if (headers.indexOf(header) === -1) { headers.push(header); sheet.getRange(1, headers.length).setValue(header); } });
}

function appendObjectRow(sheetName, data) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map(function (header) { const value=data[header] === undefined ? "" : data[header]; return typeof value==="string"&&/^[=+@-]/.test(value)?"'"+value:value; }));
}

function setRowValue(sheet, headers, row, header, value) { const index = headers.indexOf(header); if (index !== -1) sheet.getRange(row, index + 1).setValue(value); }

function appendAudit(bookingId, action, actor, detail) {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(AUDIT_SHEET);
  if (!sheet) { sheet = spreadsheet.insertSheet(AUDIT_SHEET); sheet.appendRow(["timestamp", "booking_id", "action", "actor", "detail"]); }
  sheet.appendRow([isoTimestamp(), bookingId, action, actor, String(detail || "")]);
}

function readSheet(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("ไม่พบชีต " + sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values.shift().map(String);
  return values.filter(function (row) { return row.some(function (cell) { return cell !== ""; }); }).map(function (row) {
    const item = {};
    headers.forEach(function (header, index) { let value = row[index]; if (header === "booking_date") value = normalizeDate(value); if (header === "start_time" || header === "end_time") value = normalizeTime(value); item[header] = value; });
    return item;
  });
}

function getSpreadsheet() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function normalizeDate(value) { if (!value) return ""; if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd"); return String(value).trim().slice(0, 10); }
function normalizeTime(value) { if (!value) return ""; if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm"); const text = String(value).trim(); const match = text.match(/^(\d{1,2}):(\d{2})/); return match ? ("0" + match[1]).slice(-2) + ":" + match[2] : text; }
function createBookingId(bookings) {
  // Called under the booking write lock so concurrent requests cannot reuse an ID.
  const used = new Set((bookings || []).map(function (booking) { return String(booking.id).toUpperCase(); }));
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = "BK" + Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase();
    if (!used.has(id)) return id;
  }
  throw new Error("สร้างรหัสการจองไม่สำเร็จ กรุณาลองใหม่");
}
function isoTimestamp() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"); }
function enforceRateLimit(key, limit, seconds) { const cache = CacheService.getScriptCache(); const cacheKey = "rate:" + key; const count = Number(cache.get(cacheKey) || 0) + 1; cache.put(cacheKey, String(count), seconds); if (count > limit) throw new Error("ดำเนินการหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"); }
function verifyAdminKey(value) { const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY"); if (!expected || String(value || "") !== expected) throw new Error("ไม่มีสิทธิ์เข้าถึงข้อมูลการจอง"); }
function jsonResponse(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
function errorResponse(error) { return jsonResponse({ success: false, code: "SERVER_ERROR", message: error && error.message ? error.message : "เกิดข้อผิดพลาด" }); }

const ACCOUNT_HEADERS=["id","username","name","student_id","password_hash","role","active","version","google_sub","email","requester_type","department"];
function accountsSheet(){let s=getSpreadsheet().getSheetByName("users");if(!s){s=getSpreadsheet().insertSheet("users");s.appendRow(ACCOUNT_HEADERS);}const headers=s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String);ACCOUNT_HEADERS.forEach(function(h){if(headers.indexOf(h)<0){headers.push(h);s.getRange(1,headers.length).setValue(h);}});return s;}
function cleanAccount(u){return {id:String(u.id),username:String(u.username),name:String(u.name),student_id:String(u.student_id),role:u.role==="admin"?"admin":"user",active:u.active===true||String(u.active)==="true",version:String(u.version),email:String(u.email||""),requester_type:String(u.requester_type||""),department:String(u.department||"")};}
function accountFind(id){accountsSheet();return readSheet("users").filter(function(u){return String(u.id)===String(id);})[0];}
function roleAction(action,data){
 if(action==="accountSession"){const u=accountFind(data.id);return u?cleanAccount(u):null;}
 if(action==="accountLogin"){accountsSheet();enforceRateLimit("login:"+String(data.username).toLowerCase(),15,600);const u=readSheet("users").filter(function(u){return String(u.username)===String(data.username).toLowerCase();})[0];return u?Object.assign(cleanAccount(u),{password_hash:String(u.password_hash)}):null;}
 if(action==="accountList"){accountsSheet();return readSheet("users").map(cleanAccount);}
 if(action==="ownedBookings")return readSheet(BOOKING_SHEET).filter(function(b){return !b.deleted_at && (data.role==="admin"||(data.user_id&&String(b.user_id||"")===String(data.user_id)));}).map(publicBooking);
 if(action==="roomList")return readSheet(ROOM_SHEET);
 if(action==="auditList")return getSpreadsheet().getSheetByName(AUDIT_SHEET)?readSheet(AUDIT_SHEET).slice(-200).reverse():[];
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
 if(action==="accountGoogle"){
  accountsSheet();
  const sub=String(data.sub||""),email=String(data.email||"");
  if(!sub||sub.length>255||!email||email.length>254)throw new Error("ข้อมูล Google ไม่ถูกต้อง");
  const existing=readSheet("users").filter(function(u){return String(u.google_sub||"")===sub;})[0];
  if(existing)return cleanAccount(existing);
  if(!data.profile)return null;
  const p=data.profile,name=String(p.name||"").trim(),department=String(p.department||"").trim(),type=String(p.requester_type||""),student=type==="staff"?"":String(p.student_id||"");
  if(!name||name.length>120||!department||department.length>120||["student","staff"].indexOf(type)<0||(type==="student"&&!/^\d{5,30}$/.test(student)))throw new Error("ข้อมูลผู้จองไม่ครบถ้วน");
  const u={id:Utilities.getUuid(),username:"google:"+sub,name:name,student_id:student,password_hash:"",role:"user",active:true,version:Utilities.getUuid(),google_sub:sub,email:email,requester_type:type,department:department};
  appendObjectRow("users",u);appendAudit(u.id,"registered_google",u.id,"สมัครด้วย Google");return cleanAccount(u);
 }
 if(action==="accountRegister"){
  accountsSheet();
  if(readSheet("users").some(function(u){return String(u.username)===String(data.username);}))throw new Error("ชื่อผู้ใช้นี้มีแล้ว");
  if(!/^[a-z0-9._-]{4,40}$/.test(String(data.username))||!data.password_hash)throw new Error("ข้อมูลสมาชิกไม่ถูกต้อง");
  const u={id:Utilities.getUuid(),username:data.username,name:data.name,student_id:String(data.student_id||""),password_hash:data.password_hash,role:"user",active:true,version:Utilities.getUuid()};
  appendObjectRow("users",u);appendAudit(u.id,"registered",u.username,"สมัครสมาชิก");return cleanAccount(u);
 }
 if(action==="accountUpdate"){
  const u=accountFind(data.id);if(!u)throw new Error("ไม่พบบัญชี");
  if(["user","admin"].indexOf(data.role)<0||typeof data.active!=="boolean")throw new Error("สิทธิ์ไม่ถูกต้อง");
  const sheet=accountsSheet(),v=sheet.getDataRange().getValues(),h=v[0].map(String),row=v.findIndex(function(r){return String(r[0])===String(data.id);})+1;
  setRowValue(sheet,h,row,"role",data.role);setRowValue(sheet,h,row,"active",data.active);setRowValue(sheet,h,row,"version",Utilities.getUuid());
  if(data.password_hash)setRowValue(sheet,h,row,"password_hash",data.password_hash);
  appendAudit(data.id,"account_updated",data.actor,"ปรับสิทธิ์หรือรหัสผ่าน");return {id:data.id};
 }
 if(action==="roomSave"){
  const number=String(data.room_number||"").trim(),name=String(data.room_name||"").trim();
  if(!/^\d{1,10}$/.test(number)||!name||name.length>120||["available","unavailable"].indexOf(data.status)<0)throw new Error("ข้อมูลห้องไม่ถูกต้อง");
  const sheet=getSpreadsheet().getSheetByName(ROOM_SHEET),v=sheet.getDataRange().getValues(),h=v[0].map(String),index=h.indexOf("room_number");
  const row=v.findIndex(function(r,i){return i>0&&String(r[index])===number;});
  if(row<0)appendObjectRow(ROOM_SHEET,{id:Utilities.getUuid(),room_number:number,room_name:name,status:data.status});
  else{setRowValue(sheet,h,row+1,"room_name",name);setRowValue(sheet,h,row+1,"status",data.status);}
  appendAudit(number,"room_saved",data.actor,name);return {room_number:number};
 }
 if(action==="assignBookingOwner"){
  ensureBookingHeaders();const u=accountFind(data.user_id);if(!u)throw new Error("ไม่พบบัญชีเจ้าของ");
  const sheet=getSpreadsheet().getSheetByName(BOOKING_SHEET),v=sheet.getDataRange().getValues(),h=v[0].map(String);
  const row=v.findIndex(function(r,i){return i>0&&String(r[h.indexOf("id")])===String(data.id);});
  if(row<0)throw new Error("ไม่พบรายการ");
  setRowValue(sheet,h,row+1,"user_id",u.id);appendAudit(data.id,"owner_assigned",data.actor,u.username);return {id:data.id};
 }
 throw new Error("Invalid action");
 }finally{lock.releaseLock();}
}

// Permanently remove the cancelled booking row; retain the separate audit log.
function deleteBooking(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const booking = findBookingForAccount(data.id, data.user_id, data.role);
    if (booking.status !== "cancelled") throw new Error("ลบได้เฉพาะรายการที่ยกเลิกแล้ว");
    ensureBookingHeaders();
    const sheet = getSpreadsheet().getSheetByName(BOOKING_SHEET);
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(String);
    const row = values.findIndex(function (r, index) { return index > 0 && String(r[headers.indexOf("id")]) === String(booking.id); });
    if (row < 1) throw new Error("ไม่พบรายการจอง");
    const actor = String(data.actor || data.user_id);
    sheet.deleteRow(row + 1);
    appendAudit(booking.id, "deleted", actor, "ลบแถวการจองที่ยกเลิกแล้วออกจากฐานข้อมูล");
    return {success:true, message:"ลบรายการแล้ว", data:{id:booking.id}};
  } finally { lock.releaseLock(); }
}
