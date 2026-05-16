import { requireSession } from "@/lib/auth/session";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await requireSession();
  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm userId={session.userId} userName={session.user?.name ?? null} />
    </div>
  );
}
