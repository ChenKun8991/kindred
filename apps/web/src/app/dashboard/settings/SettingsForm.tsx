"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateTimezoneAction, deleteAccountAction } from "@/app/actions/settings";
import { toast } from "sonner";

const TIMEZONES = Intl.supportedValuesOf("timeZone");

export function SettingsForm({
  userId,
  userName,
}: {
  userId: string;
  userName: string | null;
}) {
  const [tz, setTz] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [savingTz, setSavingTz] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSaveTz() {
    setSavingTz(true);
    await updateTimezoneAction(tz);
    setSavingTz(false);
    toast.success("Timezone updated.");
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "delete my account") return;
    setDeleting(true);
    await deleteAccountAction();
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="space-y-8">
      {/* Account info */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Name: <span className="text-foreground">{userName ?? "—"}</span></p>
          <p>User ID: <span className="text-foreground font-mono text-xs">{userId}</span></p>
        </div>
      </section>

      <Separator />

      {/* Timezone */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Timezone</h2>
        <p className="text-sm text-muted-foreground">
          Used to calculate when notifications are sent.
        </p>
        <div className="flex gap-2 items-end">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="tz">Timezone</Label>
            <select
              id="tz"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TIMEZONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleSaveTz} disabled={savingTz}>
            {savingTz ? "Saving…" : "Save"}
          </Button>
        </div>
      </section>

      <Separator />

      {/* Delete account */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all data. This cannot be undone.
        </p>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently deletes all your people, events, interactions, and
                account data. Type <strong>delete my account</strong> to confirm.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="delete my account"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirm !== "delete my account" || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
