"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { createEventAction } from "@/app/actions/events";
import { toast } from "sonner";

export default function NewEventPage() {
  const router = useRouter();
  const { id: personId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState("custom");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const result = await createEventAction({
      person_id: personId,
      type: fd.get("type") as never,
      title: fd.get("title") as string,
      date: fd.get("date") as string,
      recurring: fd.get("recurring") === "on",
      notify_days_before: [7, 3, 1],
      notes: (fd.get("notes") as string) || undefined,
    });

    setLoading(false);
    if (!result.ok) {
      toast.error("Failed to create event");
      return;
    }
    toast.success("Event added.");
    router.push(`/dashboard/people/${personId}`);
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold">Add event</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select name="type" value={eventType} onValueChange={(v) => setEventType(v ?? "")} required>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="birthday">Birthday</SelectItem>
              <SelectItem value="anniversary">Anniversary</SelectItem>
              <SelectItem value="meetup">Meetup</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required placeholder="e.g. Sarah's Birthday" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Date *</Label>
          <Input id="date" name="date" type="date" required />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recurring" defaultChecked />
          Recurring annually
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Add event"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
