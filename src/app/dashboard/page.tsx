import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <main><PageHeading eyebrow="DASHBOARD" title="สรุปการใช้งานห้อง" description={user.role === "admin" ? "ภาพรวมคำขอจองของทุกคน แยกตามห้อง สถานะ และสาขาวิชา" : "ภาพรวมคำขอจองเฉพาะบัญชีของคุณ"} /><section className="page-content shell"><Dashboard admin={user.role === "admin"} /></section></main>;
}
