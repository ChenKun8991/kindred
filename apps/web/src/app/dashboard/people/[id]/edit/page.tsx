import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getPersonById } from "@kindred/db";
import { PersonForm } from "@/components/people/PersonForm";

export default async function EditPersonPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const person = await getPersonById(session.userId, params.id);
  if (!person) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit {person.name}</h1>
      <PersonForm person={person} />
    </div>
  );
}
