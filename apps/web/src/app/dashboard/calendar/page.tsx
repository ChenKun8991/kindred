import { requireSession } from "@/lib/auth/session";
import { listEvents, listPeople } from "@kindred/db";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = {
  birthday: "bg-pink-100 text-pink-800",
  anniversary: "bg-purple-100 text-purple-800",
  meetup: "bg-blue-100 text-blue-800",
  custom: "bg-yellow-100 text-yellow-800",
  reminder: "bg-gray-100 text-gray-700",
};

export default async function CalendarPage() {
  const session = await requireSession();

  const [events, people] = await Promise.all([
    listEvents(session.userId, {
      from: new Date(),
      to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }),
    listPeople(session.userId),
  ]);

  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));

  // Group by month
  const byMonth = new Map<string, typeof events>();
  for (const ev of events) {
    const key = new Date(ev.next_occurrence).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(ev);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar — next 90 days</h1>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
          <p>No upcoming events in the next 90 days.</p>
          <p className="text-sm">Add people with birthdays to see them here.</p>
        </div>
      ) : (
        Array.from(byMonth.entries()).map(([month, monthEvents]) => (
          <section key={month} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {month}
            </h2>
            <ul className="divide-y rounded-md border">
              {monthEvents.map((ev) => {
                const person = peopleById[ev.person_id];
                const colorClass = TYPE_COLORS[ev.type] ?? TYPE_COLORS["custom"]!;
                return (
                  <li key={ev.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 text-center">
                      <div className="text-lg font-bold leading-none">
                        {new Date(ev.next_occurrence).getDate()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(ev.next_occurrence).toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                    </div>
                    <div className="flex-1">
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
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClass}`}>
                      {ev.type}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
