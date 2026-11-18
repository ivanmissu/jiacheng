import { NextRequest, NextResponse } from "next/server";
import { createSession, getRole, rateLimit, removeSessions, secretsEqual } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ role: await getRole(), demo: !process.env.ADMIN_PASSWORD }); }
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "不允许跨站请求" }, { status: 403 });
    const input = await request.json();
    if (input.action === "logout") { await removeSessions(); return NextResponse.json({ ok: true }); }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    if (!rateLimit(ip)) return NextResponse.json({ error: "尝试过于频繁，请一分钟后再试" }, { status: 429 });
    const role = input.action === "admin" ? "admin" : "visitor";
    const expected = role === "admin" ? process.env.ADMIN_PASSWORD : process.env.ACCESS_CODE;
    if (expected && !secretsEqual(String(input.password || ""), expected)) return NextResponse.json({ error: role === "admin" ? "管理口令不正确" : "访问码不正确" }, { status: 401 });
    await createSession(role);
    return NextResponse.json({ ok: true, role });
  } catch { return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 400 }); }
}
