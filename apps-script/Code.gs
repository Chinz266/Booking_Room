const SPREADSHEET_ID = "1nHi-3RMvx0nI5tuY3YAiOaNpakXQ5yNrMoRGNk2VavQ";
const ROOM_SHEET = "room";
const BOOKING_SHEET = "bookings";
const AUDIT_SHEET = "audit_log";
const BLOCKING_STATUSES = ["pending", "approved"];
const EXTRA_BOOKING_HEADERS = ["status_reason", "updated_at", "updated_by"];

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || "");
    if (action === "getRooms") return jsonResponse({ success: true, data: readSheet(ROOM_SHEET) });
    if (action === "getBookings") {
      verifyAdminKey(e && e.parameter && e.parameter.adminKey);
      const bookings = readSheet(BOOKING_SHEET);
      const room = String((e.parameter && e.parameter.room) || "").trim();
      const bookingDate = normalizeDate((e.parameter && e.parameter.booking_date) || "");
      const filtered = bookings.filter(function (booking) {
        return (!room || String(booking.room) === room) && (!bookingDate || normalizeDate(booking.booking_date) === bookingDate);
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
    if (action === "createBooking") return jsonResponse(createBooking(data));
    if (action === "getMyBooking") return jsonResponse(getMyBooking(data));
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
  const booking = validateBooking(data);
  enforceRateLimit("create:" + booking.student_id, 5, 600);
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
    const id = createBookingId();
    const now = isoTimestamp();
    appendObjectRow(BOOKING_SHEET, {
      id: id, room: booking.room, booking_date: booking.booking_date, start_time: booking.start_time,
      end_time: booking.end_time, name: booking.name, student_id: booking.student_id,
      purpose: booking.purpose, status: "pending",
      status_reason: "", updated_at: now, updated_by: "student"
    });
    appendAudit(id, "created", "student", "ส่งคำขอจองห้อง");
    return { success: true, message: "ส่งคำขอจองห้องแล้ว", data: Object.assign({ id: id, status: "pending" }, booking) };
  } finally { lock.releaseLock(); }
}

function getMyBooking(data) {
  enforceRateLimit("lookup:" + String(data.id || ""), 12, 600);
  const booking = findBookingForStudent(data.id, data.student_id);
  return { success: true, data: publicBooking(booking) };
}

function cancelOwnBooking(data) {
  enforceRateLimit("cancel:" + String(data.id || ""), 8, 600);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const booking = findBookingForStudent(data.id, data.student_id);
    if (BLOCKING_STATUSES.indexOf(String(booking.status).toLowerCase()) === -1) return { success: false, message: "รายการนี้ไม่สามารถยกเลิกได้" };
    return updateBookingStatusUnlocked(booking.id, "cancelled", "ยกเลิกโดยผู้จอง", "student");
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

function findBookingForStudent(id, studentId) {
  const bookingId = String(id || "").trim().toUpperCase();
  const expectedStudentId = String(studentId || "").trim();
  if (!bookingId || !expectedStudentId) throw new Error("รหัสการจองหรือรหัสนักศึกษาไม่ถูกต้อง");
  const booking = readSheet(BOOKING_SHEET).filter(function (item) { return String(item.id).toUpperCase() === bookingId; })[0];
  if (!booking || String(booking.student_id).trim() !== expectedStudentId) throw new Error("รหัสการจองหรือรหัสนักศึกษาไม่ถูกต้อง");
  return booking;
}

function publicBooking(booking) {
  const copy = {};
  Object.keys(booking || {}).forEach(function (key) { copy[key] = booking[key]; });
  return copy;
}

function validateBooking(data) {
  const booking = { room: String(data.room || "").trim(), booking_date: normalizeDate(data.booking_date), start_time: normalizeTime(data.start_time), end_time: normalizeTime(data.end_time), name: String(data.name || "").trim(), student_id: String(data.student_id || "").trim(), purpose: String(data.purpose || "").trim() };
  Object.keys(booking).forEach(function (key) { if (!booking[key]) throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน"); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.booking_date)) throw new Error("วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD");
  if (!/^\d{2}:\d{2}$/.test(booking.start_time) || !/^\d{2}:\d{2}$/.test(booking.end_time)) throw new Error("เวลาต้องอยู่ในรูปแบบ HH:mm");
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
  sheet.appendRow(headers.map(function (header) { return data[header] === undefined ? "" : data[header]; }));
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
function createBookingId() { return "BK" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss") + Utilities.getUuid().slice(0, 4).toUpperCase(); }
function isoTimestamp() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"); }
function enforceRateLimit(key, limit, seconds) { const cache = CacheService.getScriptCache(); const cacheKey = "rate:" + key; const count = Number(cache.get(cacheKey) || 0) + 1; cache.put(cacheKey, String(count), seconds); if (count > limit) throw new Error("ดำเนินการหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"); }
function verifyAdminKey(value) { const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY"); if (!expected || String(value || "") !== expected) throw new Error("ไม่มีสิทธิ์เข้าถึงข้อมูลการจอง"); }
function jsonResponse(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
function errorResponse(error) { return jsonResponse({ success: false, code: "SERVER_ERROR", message: error && error.message ? error.message : "เกิดข้อผิดพลาด" }); }
