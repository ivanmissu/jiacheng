import { NextRequest, NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { exportArchive, getArchive, getBackups, recyclePerson, restoreArchive, rollbackRevision, savePerson, toGedcom, updatePage, uploadPages } from "@/lib/archive";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "请先输入家族访问码" }, { status: 401 });
  try {
    const format = request.nextUrl.searchParams.get("export");
    if (format || request.nextUrl.searchParams.get("view") === "backups") {
      if (role !== "admin") return NextResponse.json({ error: "需要管理身份" }, { status: 403 });
      if (!format) return NextResponse.json(await getBackups());
      const archive = await exportArchive();
      return new NextResponse(format === "gedcom" ? toGedcom(archive.persons) : JSON.stringify(archive, null, 2), {
        headers: { "Content-Type": format === "gedcom" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="jiacheng-${new Date().toISOString().slice(0, 10)}.${format === "gedcom" ? "ged" : "json"}"`, "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(await getArchive(role), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "读取失败" }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  if (await getRole() !== "admin") return NextResponse.json({ error: "请先进入管理模式" }, { status: 403 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host && !originHost.endsWith(".e2b.app")) {
      return NextResponse.json({ error: "不允许跨站请求" }, { status: 403 });
    }
  }
  try {
    const input = await request.json();
    let id: string | undefined;
    if (input.action === "savePerson") id = await savePerson(input.person);
    else if (input.action === "updatePage") await updatePage(input.page);
    else if (input.action === "uploadPages") await uploadPages(Number(input.volume), input.pages);
    else if (input.action === "deletePerson") await recyclePerson(String(input.id), false);
    else if (input.action === "restorePerson") await recyclePerson(String(input.id), true);
    else if (input.action === "rollback") await rollbackRevision(String(input.id));
    else if (input.action === "import") {
      if (input.confirmation !== "全量替换") throw new Error("请输入「全量替换」确认恢复");
      await restoreArchive(input.data);
    } else throw new Error("未知操作");
    return NextResponse.json({ ok: true, id, archive: await getArchive("admin") });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败，请稍后重试" }, { status: 400 }); }
}
