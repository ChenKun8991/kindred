import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listPeople, listEvents, countPeople } from "@kindred/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Clock, Heart } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireSession();
  const userId = session.userId;

  const [people, upcomingEvents, totalCount] = await Promise.all([
    listPeople(userId),
    listEvents(userId, {
      from: new Date(),
      to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }),
    countPeople(userId),
  ]);

  const now = new Date();
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const eventsThisWeek = upcomingEvents.filter(
    (e) => new Date(e.next_occurrence) <= weekFromNow,
  ).length;

  const needsAttention = people.filter((p) => {
    if (!p.last_contact_date) return true;
    const diff =
      (now.getTime() - new Date(p.last_contact_date).getTime()) /
      (1000 * 60 * 60 * 24);
    return diff > 30;
  });

  // Next birthday
  const birthdayEvents = upcomingEvents.filter((e) => e.type === "birthday");
  const nextBirthday = birthdayEvents[0];
  const daysToNextBirthday = nextBirthday
    ? Math.ceil(
        (new Date(nextBirthday.next_occurrence).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));
  const recentPeople = [...people]
    .sort((a, b) => {
      const aDate = a.last_contact_date ?? a.created_at;
      const bDate = b.last_contact_date ?? b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          label="People tracked"
          value={totalCount}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          label="Events this week"
          value={eventsThisWeek}
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label="Needs attention"
          value={needsAttention.length}
        />
        <StatCard
          icon={<Heart className="h-4 w-4 text-muted-foreground" />}
          label="Days to next birthday"
          value={daysToNextBirthday ?? "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming events (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events. Add people with birthdays to get started.</p>
            ) : (
              <ul className="divide-y text-sm">
                {upcomingEvents.slice(0, 8).map((ev) => {
                  const person = peopleById[ev.person_id];
                  return (
                    <li key={ev.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">{ev.title}</p>
                        {person && (
                          <Link
                            href={`/dashboard/people/${person.id}`}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            {person.name}
                          </Link>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.next_occurrence).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Needs attention */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Needs attention</CardTitle>
          </CardHeader>
          <CardContent>
            {needsAttention.length === 0 ? (
              <p className="text-sm text-muted-foreground">You are all caught up.</p>
            ) : (
              <ul className="divide-y text-sm">
                {needsAttention.slice(0, 6).map((p) => (
                  <li key={p.id} className="py-2">
                    <Link
                      href={`/dashboard/people/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.last_contact_date
                        ? `Last contact ${new Date(p.last_contact_date).toLocaleDateString()}`
                        : "Never contacted"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent people */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent people</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPeople.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No people yet.{" "}
                <Link href="/dashboard/people/new" className="underline">
                  Add someone.
                </Link>
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {recentPeople.map((p) => (
                  <li key={p.id}>
                    <Link href={`/dashboard/people/${p.id}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-accent capitalize">
                        {p.name} · {p.relationship_type.replace("_", " ")}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
