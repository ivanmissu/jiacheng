import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function secretsEqual(a: string, b: string) {
  return timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
}
export async function getRole(): Promise<"admin" | "visitor" | null> {
  const jar = await cookies();
  for (const name of ["jiacheng-admin", "jiacheng-visitor"]) {
    const token = jar.get(name)?.value;
    if (!token) continue;
    const [session] = await db.select().from(sessions).where(and(eq(sessions.id, digest(token)), gt(sessions.expiresAt, new Date().toISOString()))).limit(1);
    if (session) return session.role;
  }
  return process.env.ACCESS_CODE ? null : "visitor";
}
export async function createSession(role: "admin" | "visitor") {
  const token = randomBytes(32).toString("hex");
  const days = role === "admin" ? 0.5 : 30;
  await db.insert(sessions).values({ id: digest(token), role, expiresAt: new Date(Date.now() + days * 86400000).toISOString() });
  const jar = await cookies();
  jar.set(`jiacheng-${role}`, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: days * 86400 });
}
export async function removeSessions() {
  const jar = await cookies();
  for (const name of ["jiacheng-admin", "jiacheng-visitor"]) {
    const token = jar.get(name)?.value;
    if (token) await db.delete(sessions).where(eq(sessions.id, digest(token)));
    jar.delete(name);
  }
}
const attempts = new Map<string, { count: number; until: number }>();
export function rateLimit(ip: string) {
  const previous = attempts.get(ip);
  if (previous && previous.until > Date.now() && previous.count >= 5) return false;
  if (!previous || previous.until < Date.now()) attempts.set(ip, { count: 1, until: Date.now() + 60000 });
  else previous.count++;
  if (attempts.size > 10000) for (const [key, item] of attempts) if (item.until < Date.now()) attempts.delete(key);
  return true;
}
