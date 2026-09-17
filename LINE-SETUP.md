# เชื่อมต่อ LINE กลุ่มผู้ดูแล

ระบบใช้ LINE Messaging API ส่งข้อความเมื่อมีการจองใหม่ อนุมัติ ปฏิเสธ หรือยกเลิก (รวมผู้จองยกเลิกเอง) หลังบันทึกสำเร็จ ข้อความมีรหัสการจอง ห้อง วัน เวลา ชื่อ ประเภทผู้จอง สาขาวิชา และวัตถุประสงค์ ไม่ส่งรหัสนักศึกษา

## 1. เตรียม LINE Official Account

สร้างหรือเลือก LINE Official Account แล้วเปิด Messaging API จาก LINE Official Account Manager จากนั้นเข้า LINE Developers Console ของ channel เดียวกัน เปิด Allow bot to join group chats และเชิญบัญชีนี้เข้ากลุ่มผู้ดูแลที่ต้องการรับแจ้งเตือน

## 2. ตั้งค่าความลับบนเซิร์ฟเวอร์

เพิ่มใน `.env.local` สำหรับเครื่องพัฒนา หรือ Environment Variables บนผู้ให้บริการที่ Deploy Next.js ห้ามใช้ชื่อที่ขึ้นต้น NEXT_PUBLIC_ และห้าม commit ค่าจริง

```dotenv
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_ADMIN_GROUP_ID=
LINE_SETUP_MODE=false
```

- Channel Access Token: ออก token ของ channel ใน LINE Developers Console
- Channel Secret: Basic settings ของ channel เดียวกัน ใช้ตรวจลายเซ็น webhook
- Group ID: รหัสกลุ่มขึ้นต้น C ตามด้วย 32 ตัวอักษรฐานสิบหก ไม่ใช่ชื่อกลุ่มหรือ QR code

## 3. หารหัสกลุ่มอย่างปลอดภัย

1. Deploy เว็บไซต์ให้มี URL HTTPS สาธารณะ (LINE ติดต่อ localhost โดยตรงไม่ได้)
2. ตั้งค่า token และ secret แล้วเปิด `LINE_SETUP_MODE=true` ชั่วคราว จากนั้น Deploy ใหม่
3. ใน LINE Developers ตั้ง Webhook URL เป็น `https://โดเมนเว็บไซต์/api/line/webhook` กด Verify และเปิด Use webhook
4. เชิญบอตเข้ากลุ่มผู้ดูแล หรือส่งข้อความหนึ่งข้อความในกลุ่มที่มีบอต
5. ดู server logs ของเว็บไซต์ จะพบ `LINE setup groupId: C...` เฉพาะ webhook ที่ตรวจลายเซ็นผ่าน ไม่มีการเก็บข้อความหรือชื่อผู้ส่งใน log
6. นำรหัสของกลุ่มผู้ดูแลมาใส่ `LINE_ADMIN_GROUP_ID` ตั้ง `LINE_SETUP_MODE=false` แล้ว Deploy ใหม่ / รีสตาร์ทเซิร์ฟเวอร์

ระบบไม่เลือกกลุ่มให้อัตโนมัติ เพื่อป้องกันการส่งข้อมูลไปผิดกลุ่ม

## 4. ทดสอบ

เปิด Dashboard ด้วยบัญชี admin: แถบ LINE ต้องแสดงว่าตั้งค่าการส่งแล้ว จากนั้นจองห้องทดสอบและเปลี่ยนสถานะ ตรวจว่ากลุ่มได้รับข้อความแต่ละเหตุการณ์

การแจ้งเตือนทำหลังตอบผลการจองสำเร็จ ถ้า LINE ขัดข้องหรือโควตาหมด การจองยังคงถูกบันทึก ตรวจ server logs ข้อความ `LINE notification failed` / `LINE notification unavailable` ระบบเวอร์ชันนี้ยังไม่มีคิวส่งซ้ำแบบถาวร สถานะใน Dashboard ยืนยันการตั้งค่าเท่านั้น ไม่ได้ยืนยันว่าข้อความทุกฉบับส่งถึง

เอกสาร: https://developers.line.biz/en/docs/messaging-api/sending-messages/ และ https://developers.line.biz/en/docs/messaging-api/group-chats/
