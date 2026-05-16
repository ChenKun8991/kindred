import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getPersonById, listEvents, listInteractions } from "@kindred/db";
import { formatBirthday } from "@kindred/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeletePersonButton } from "@/components/people/DeletePersonButton";
import { Pencil } from "lucide-react";

export default async function PersonDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireSession();
  const [person, events, interactions] = await Promise.all([
    getPersonById(session.userId, params.id),
    listEvents(session.userId, {}),
    listInteractions(session.userId, params.id),
  ]);

  if (!person) notFound();

  const personEvents = events.filter((e) => e.person_id === params.id);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{person.name}</h1>
          {person.nickname && (
            <p className="text-muted-foreground">&quot;{person.nickname}&quot;</p>
          )}
          <Badge className="mt-1 capitalize" variant="secondary">
            {person.relationship_type.replace("_", " ")}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/people/${person.id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeletePersonButton personId={person.id} personName={person.name} />
        </div>
      </div>

      {/* Profile fields */}
      <section className="grid gap-3 sm:grid-cols-2 text-sm">
        {person.birthday && (
          <Field label="Birthday" value={formatBirthday(person.birthday)} />
        )}
        {person.first_met_date && (
          <Field label="First met" value={new Date(person.first_met_date).toLocaleDateString()} />
        )}
        {person.first_met_context && (
          <Field label="How you met" value={person.first_met_context} />
        )}
        {person.location && <Field label="Location" value={person.location} />}
        {person.occupation && <Field label="Occupation" value={person.occupation} />}
        {person.phone && <Field label="Phone" value={person.phone} />}
        {person.email && <Field label="Email" value={person.email} />}
        {person.instagram && <Field label="Instagram" value={person.instagram} />}
        {person.hobbies.length > 0 && (
          <Field label="Hobbies" value={person.hobbies.join(", ")} />
        )}
        {person.food_preferences && (
          <Field label="Food preferences" value={person.food_preferences} />
        )}
        {person.love_language && (
          <Field label="Love language" value={person.love_language} />
        )}
        {person.last_contact_date && (
          <Field
            label="Last contact"
            value={new Date(person.last_contact_date).toLocaleDateString()}
          />
        )}
      </section>

      {person.personality_notes && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personality</h2>
          <p className="text-sm">{person.personality_notes}</p>
        </section>
      )}

      {person.notes && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{person.notes}</p>
        </section>
      )}

      {/* Events */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Events</h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/people/${person.id}/events/new`}>Add event</Link>
          </Button>
        </div>
        {personEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {personEvents.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.next_occurrence).toLocaleDateString()} ·{" "}
                    <span className="capitalize">{ev.type}</span>
                    {ev.recurring && " · Recurring"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Interactions */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Interactions</h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/people/${person.id}/log`}>Log contact</Link>
          </Button>
        </div>
        {interactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {interactions.map((i) => (
              <li key={i.id} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{i.channel.replace("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(i.date).toLocaleDateString()}
                  </span>
                </div>
                {i.notes && <p className="mt-1 text-muted-foreground">{i.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
