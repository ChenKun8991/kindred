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
import { createInteractionAction } from "@/app/actions/interactions";
import { toast } from "sonner";

const today = new Date().toISOString().split("T")[0];

export default function LogContactPage() {
  const router = useRouter();
  const { id: personId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState("in_person");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const result = await createInteractionAction({
      person_id: personId,
      date: fd.get("date") as string,
      channel: channel as never,
      notes: (fd.get("notes") as string) || undefined,
    });

    setLoading(false);
    if (!result.ok) {
      toast.error("Failed to log interaction");
      return;
    }
    toast.success("Interaction logged.");
    router.push(`/dashboard/people/${personId}`);
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold">Log contact</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={today} required />
        </div>

        <div className="space-y-1.5">
          <Label>Channel</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v ?? "in_person")} required>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in_person">In person</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="What did you talk about?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Log contact"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
