# CS Room Booking

ระบบจองห้องสาขาวิทยาการคอมพิวเตอร์ สร้างด้วย Next.js และเชื่อมข้อมูลผ่าน Google Apps Script กับ Google Sheets

## เริ่มใช้งาน

```bash
npm run dev
```

เปิด http://localhost:3000

ตั้งค่า `APPS_SCRIPT_URL`, บัญชีผู้ดูแล และ `SESSION_SECRET` ใน `.env.local` ก่อนใช้งาน ค่า `APPS_SCRIPT_ADMIN_KEY` ต้องตรงกับ `ADMIN_KEY` ใน Script Properties ของ Apps Script

ผู้จองใช้รหัสการจองร่วมกับรหัสนักศึกษาเพื่อดูสถานะหรือยกเลิกด้วยตนเอง หน้าแอดมินรองรับการค้นหา กรองรายการ ระบุเหตุผลเมื่อปฏิเสธ และบันทึกประวัติลงแท็บ `audit_log`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
