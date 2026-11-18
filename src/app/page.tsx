import JiachengApp from "@/components/jiacheng-app";
import { AccessGate } from "@/components/dialogs";
import { getArchive } from "@/lib/archive";
import { getRole } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const role = await getRole();
  if (!role) return <AccessGate />;
  return <JiachengApp initialData={await getArchive(role)} />;
}
