import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listPeople } from "@kindred/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBirthday } from "@kindred/shared";
import { UserPlus, Users } from "lucide-react";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; sort?: string };
}) {
  const session = await requireSession();

  const people = await listPeople(session.userId, {
    q: searchParams.q,
    type: searchParams.type as never,
    sort: (searchParams.sort as never) ?? "name",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <Button asChild>
          <Link href="/dashboard/people/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Add person
          </Link>
        </Button>
      </div>

      {/* Search & filters */}
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search by name…"
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48"
        />
        <select
          name="type"
          defaultValue={searchParams.type ?? ""}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm"
        >
          <option value="">All types</option>
          <option value="partner">Partner</option>
          <option value="family">Family</option>
          <option value="close_friend">Close Friend</option>
          <option value="friend">Friend</option>
          <option value="colleague">Colleague</option>
          <option value="acquaintance">Acquaintance</option>
        </select>
        <select
          name="sort"
          defaultValue={searchParams.sort ?? "name"}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm"
        >
          <option value="name">Sort: Name</option>
          <option value="last_contact">Sort: Last contact</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>

      {people.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-muted-foreground">
          <Users className="h-12 w-12 opacity-30" />
          <p>No people yet. Add someone important to you.</p>
          <Button asChild>
            <Link href="/dashboard/people/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add first person
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/dashboard/people/${person.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{person.name}</p>
                  {person.nickname && (
                    <p className="text-xs text-muted-foreground">&quot;{person.nickname}&quot;</p>
                  )}
                  {person.birthday && (
                    <p className="text-xs text-muted-foreground">
                      🎂 {formatBirthday(person.birthday)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {person.last_contact_date && (
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      Last: {new Date(person.last_contact_date).toLocaleDateString()}
                    </span>
                  )}
                  <Badge variant="secondary" className="capitalize text-xs">
                    {person.relationship_type.replace("_", " ")}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
