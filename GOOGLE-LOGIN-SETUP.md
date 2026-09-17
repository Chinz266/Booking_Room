# เปิดใช้งาน Google Login

โค้ดใช้ Google OAuth Authorization Code พร้อม state, nonce และ PKCE ตรวจ ID token ด้วย google-auth-library (ลายเซ็น, issuer, audience, อายุ token) และตรวจอีเมลยืนยันแล้ว ก่อนสร้าง session ของระบบเดิม

## 1. อัปเดต Apps Script

แทน Code.gs ด้วย apps-script/Code.gs แล้วไป การทำให้ใช้งานได้ → จัดการการทำให้ใช้งานได้ → แก้ไข → เวอร์ชันใหม่ → ทำให้ใช้งานได้ โดยใช้ deployment เดิม

เปิด URL ของ Apps Script ตามด้วย ?action=getCapabilities ต้องมี googleLogin: 1 ระบบจะเพิ่มคอลัมน์ google_sub, email, requester_type, department ในชีต users เมื่อเริ่มใช้งาน ไม่ต้องลบชีตหรือข้อมูลบัญชีเดิม

## 2. สร้าง OAuth Client

เปิด https://console.cloud.google.com/auth/overview เลือกหรือสร้างโปรเจกต์ ตั้งชื่อแอป Booking Room และกรอกอีเมลติดต่อของเจ้าของระบบในหน้า Branding/Audience หากเลือก External และยังเป็น Testing ให้เพิ่มอีเมลผู้ทดสอบใน Test users

ไป Clients → Create client → Web application ตั้งชื่อ Booking Room Web

Authorized redirect URIs เพิ่มให้ตรงทุกตัวอักษร:

```
https://room-booking-eta-azure.vercel.app/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

ใช้ขอบเขต openid, email, profile เท่านั้น ไม่ต้องขอสิทธิ์ Google Drive หรือ Sheets ให้ผู้เข้าสู่ระบบ

## 3. ตั้งค่า

ตั้งค่าบน Vercel โปรเจกต์ room-booking สำหรับ Production:

```
GOOGLE_CLIENT_ID=<Client ID จาก Google>
GOOGLE_CLIENT_SECRET=<Client secret จาก Google>
GOOGLE_REDIRECT_URI=https://room-booking-eta-azure.vercel.app/api/auth/google/callback
```

สำหรับเครื่องพัฒนาใช้ .env.local โดยเปลี่ยน GOOGLE_REDIRECT_URI เป็น http://localhost:3000/api/auth/google/callback แล้วรีสตาร์ท Next.js ห้ามใส่ค่าลับใน Git หรือชื่อตัวแปร NEXT_PUBLIC_

Deploy ใหม่หลังตั้งค่าครบ ปุ่ม Google จะปรากฏบนหน้า /login เมื่อมีทั้ง 3 ค่า หากยังไม่ครบ บัญชีเดิมยังล็อกอินได้ตามปกติ

## พฤติกรรมบัญชี

- ครั้งแรกต้องกรอกชื่อ ประเภทผู้จอง สาขาวิชา และรหัสนักศึกษาถ้าเป็นนักศึกษา
- บัญชีใหม่เป็น user เสมอ ผู้ดูแลปรับสิทธิ์ได้ในหน้าจัดการบัญชี
- อ้างอิงตัวตนจาก Google sub ไม่รวมกับบัญชีเดิมด้วยชื่อหรืออีเมลอัตโนมัติ รายการจองบัญชีเดิมยังอยู่บัญชีเดิม
- บัญชีที่ถูกระงับเข้าไม่ได้ และการเปลี่ยนสิทธิ์ยังเพิกถอน session เดิม
- ไม่บันทึก Google access token/refresh token ลงชีต

## ทดสอบหลังตั้งค่า

ทดสอบเข้าสู่ระบบครั้งแรกและกรอกข้อมูล, ออกจากระบบและเข้าใหม่, ยกเลิกหน้า Google, ทดสอบบัญชีถูกระงับ และตรวจว่าผู้ใช้ทั่วไปเข้า /admin ไม่ได้ จากนั้นทดสอบบัญชี username/password เดิม

การทดสอบอัตโนมัติในโปรเจกต์ไม่ได้แทนการทดสอบกับ OAuth Client จริง

อ้างอิง: https://developers.google.com/identity/openid-connect/openid-connect
