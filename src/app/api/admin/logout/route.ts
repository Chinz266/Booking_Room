import { deleteAdminSession } from "@/lib/admin-auth";
export async function POST() { await deleteAdminSession(); return Response.json({success:true}); }
