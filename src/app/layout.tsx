import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = { title:"ICT Room Booking", description:"ระบบจองห้องสาขาวิทยาการคอมพิวเตอร์" };

export default function RootLayout({ children }: { children:ReactNode }) {
  return <html lang="th"><body><Navigation />{children}<footer className="site-footer"><div className="shell"><span>ICT ROOM BOOKING</span><span>สาขาวิทยาการคอมพิวเตอร์</span></div></footer></body></html>;
}
