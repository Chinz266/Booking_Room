import { verifyAdminSession } from "@/lib/admin-auth";
export async function GET() { return Response.json({success:await verifyAdminSession()}); }
