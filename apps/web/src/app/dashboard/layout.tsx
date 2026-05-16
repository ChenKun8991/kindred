import { requireSession } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        userName={session.user?.name ?? null}
        userImage={session.user?.image ?? null}
      />
      <div className="flex flex-1">
        {/* Sidebar — hidden on mobile, visible md+ */}
        <aside className="hidden md:flex w-56 flex-col border-r px-3">
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>

      {/* Bottom nav for mobile */}
      <nav className="md:hidden flex border-t">
        <Sidebar />
      </nav>
    </div>
  );
}
