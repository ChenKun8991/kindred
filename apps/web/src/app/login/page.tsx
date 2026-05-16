import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Kindred</h1>
        <p className="text-muted-foreground max-w-sm">
          A personal relationship manager. Never miss a birthday, always show up
          for the people who matter.
        </p>
      </div>
      <TelegramLoginButton />
    </main>
  );
}
