"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPersonAction, updatePersonAction } from "@/app/actions/people";
import type { Person } from "@kindred/db";
import type { PersonInput } from "@kindred/shared";
import { toast } from "sonner";

interface PersonFormProps {
  person?: Person;
}

const RELATIONSHIP_OPTIONS = [
  { value: "partner", label: "Partner" },
  { value: "family", label: "Family" },
  { value: "close_friend", label: "Close Friend" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
  { value: "acquaintance", label: "Acquaintance" },
];

export function PersonForm({ person }: PersonFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [hobbiesInput, setHobbiesInput] = useState(
    person?.hobbies.join(", ") ?? "",
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const birthdayRaw = fd.get("birthday") as string;
    const birthdayYear = fd.get("birthday_year_unknown") === "on";
    let birthday: string | undefined;
    if (birthdayRaw) {
      birthday = birthdayYear
        ? `0001-${birthdayRaw.slice(5)}` // strip year
        : birthdayRaw;
    }

    const input: PersonInput = {
      name: fd.get("name") as string,
      nickname: (fd.get("nickname") as string) || undefined,
      relationship_type: fd.get("relationship_type") as PersonInput["relationship_type"],
      birthday,
      first_met_date: (fd.get("first_met_date") as string) || undefined,
      first_met_context: (fd.get("first_met_context") as string) || undefined,
      location: (fd.get("location") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      instagram: (fd.get("instagram") as string) || undefined,
      hobbies: hobbiesInput
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean),
      food_preferences: (fd.get("food_preferences") as string) || undefined,
      love_language: (fd.get("love_language") as string) || undefined,
      occupation: (fd.get("occupation") as string) || undefined,
      personality_notes: (fd.get("personality_notes") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
      gift_history: person?.gift_history ?? [],
    };

    const result = person
      ? await updatePersonAction(person.id, input)
      : await createPersonAction(input);

    setLoading(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    toast.success(person ? "Person updated." : "Person added.");
    router.push(`/dashboard/people/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Required */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required defaultValue={person?.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nickname">Nickname</Label>
          <Input id="nickname" name="nickname" defaultValue={person?.nickname ?? ""} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Relationship type *</Label>
        <Select name="relationship_type" defaultValue={person?.relationship_type ?? "friend"}>
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="birthday">Birthday</Label>
          <Input
            id="birthday"
            name="birthday"
            type="date"
            defaultValue={
              person?.birthday?.startsWith("0001")
                ? `2000${person.birthday.slice(4)}`
                : (person?.birthday ?? "")
            }
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" name="birthday_year_unknown" />
            Year unknown
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="first_met_date">First met</Label>
          <Input id="first_met_date" name="first_met_date" type="date" defaultValue={person?.first_met_date ?? ""} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="first_met_context">How you met</Label>
        <Input id="first_met_context" name="first_met_context" placeholder="e.g. University orientation 2018" defaultValue={person?.first_met_context ?? ""} />
      </div>

      {/* Contact */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="City / country" defaultValue={person?.location ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={person?.phone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={person?.email ?? ""} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="instagram">Instagram</Label>
        <Input id="instagram" name="instagram" placeholder="@handle" defaultValue={person?.instagram ?? ""} />
      </div>

      {/* Profile */}
      <div className="space-y-1.5">
        <Label htmlFor="occupation">Occupation</Label>
        <Input id="occupation" name="occupation" defaultValue={person?.occupation ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hobbies">Hobbies (comma-separated)</Label>
        <Input
          id="hobbies"
          value={hobbiesInput}
          onChange={(e) => setHobbiesInput(e.target.value)}
          placeholder="hiking, coffee, reading"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="food_preferences">Food preferences / allergies</Label>
        <Input id="food_preferences" name="food_preferences" defaultValue={person?.food_preferences ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="love_language">Love language</Label>
        <Input id="love_language" name="love_language" defaultValue={person?.love_language ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="personality_notes">Personality notes</Label>
        <textarea
          id="personality_notes"
          name="personality_notes"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue={person?.personality_notes ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue={person?.notes ?? ""}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : person ? "Update person" : "Add person"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
