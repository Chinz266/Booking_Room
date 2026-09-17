import { createHmac, timingSafeEqual } from "node:crypto";

export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return new Response("LINE is not configured", { status: 503 });
  const body = await request.text();
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = Buffer.from(request.headers.get("x-line-signature") || "", "base64");
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) return new Response("Invalid signature", { status: 401 });
  try {
    const payload = JSON.parse(body);
    // Setup only: no message contents or sender identities are logged. Never auto-select a recipient group.
    if (process.env.LINE_SETUP_MODE === "true") for (const event of payload.events || []) {
      if (event.source?.type === "group" && /^C[0-9a-f]{32}$/i.test(event.source.groupId || "")) console.info("LINE setup groupId:", event.source.groupId);
    }
    return Response.json({ success: true });
  } catch { return new Response("Invalid payload", { status: 400 }); }
}
