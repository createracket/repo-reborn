import { type FormEvent, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminDeleteCommunityProfile,
  adminListCommunityProfiles,
  adminSaveCommunityProfile,
  adminUploadCommunityImage,
} from "@/lib/community-admin.functions";

const ACCOUNT_TYPES = ["ARTIST", "BAND", "CREATIVE", "FAN", "CREW"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

type Member = {
  id: string;
  display_name: string;
  account_type: string;
  tagline: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  values: string[];
  socials: Record<string, unknown>;
};

type Draft = {
  id?: string;
  display_name: string;
  account_type: AccountType;
  tagline: string;
  city: string;
  country: string;
  avatar_url: string;
};

const EMPTY_DRAFT: Draft = {
  display_name: "",
  account_type: "ARTIST",
  tagline: "",
  city: "",
  country: "",
  avatar_url: "",
};

function splitLocation(loc: string | null): { city: string; country: string } {
  if (!loc) return { city: "", country: "" };
  const parts = loc.split(",").map((s) => s.trim());
  return { city: parts[0] ?? "", country: parts.slice(1).join(", ") };
}

function joinLocation(city: string, country: string): string | null {
  const c = city.trim();
  const co = country.trim();
  if (!c && !co) return null;
  if (c && co) return `${c}, ${co}`;
  return c || co;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export function CommunityAdmin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const listProfiles = useServerFn(adminListCommunityProfiles);
  const saveProfile = useServerFn(adminSaveCommunityProfile);
  const deleteProfile = useServerFn(adminDeleteCommunityProfile);
  const uploadImage = useServerFn(adminUploadCommunityImage);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listProfiles();
      setMembers((data as Member[]) ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load community profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => setDraft({ ...EMPTY_DRAFT });
  const startEdit = (m: Member) => {
    const { city, country } = splitLocation(m.location);
    const upper = (m.account_type || "").toUpperCase();
    const accountType = (ACCOUNT_TYPES as readonly string[]).includes(upper)
      ? (upper as AccountType)
      : "ARTIST";
    setDraft({
      id: m.id,
      display_name: m.display_name ?? "",
      account_type: accountType,
      tagline: m.tagline ?? "",
      city,
      country,
      avatar_url: m.avatar_url ?? "",
    });
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { publicUrl } = await uploadImage({
        data: { base64, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif" },
      });
      setDraft((d) => (d ? { ...d, avatar_url: publicUrl } : d));
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!draft) return;
    if (uploading) {
      toast.error("Wait for the image upload to finish before saving");
      return;
    }
    if (!draft.display_name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      display_name: draft.display_name.trim(),
      account_type: draft.account_type,
      tagline: draft.tagline.trim() || null,
      location: joinLocation(draft.city, draft.country),
      avatar_url: draft.avatar_url.trim() || null,
    };
    try {
      await saveProfile({ data: draft.id ? { ...payload, id: draft.id } : payload });
      toast.success(draft.id ? "Updated" : "Added");
      setDraft(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this community member?")) return;
    try {
      await deleteProfile({ data: { id } });
      toast.success("Deleted");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete member");
      return;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="font-display text-2xl">Suggested matches</CardTitle>
              <CardDescription>
                Manage the sample creators surfaced on every dashboard's "Suggested matches" card.
              </CardDescription>
            </div>
            {!draft && (
              <Button onClick={startNew} size="sm">
                <Plus className="mr-2 size-4" /> Add member
              </Button>
            )}
          </div>
        </CardHeader>
        {draft && (
          <CardContent className="border-t border-border/50 pt-6">
            <form className="space-y-4" onSubmit={handleSave}>
            <h3 className="font-display text-lg">
              {draft.id ? "Edit member" : "New member"}
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={draft.display_name}
                  onChange={(e) =>
                    setDraft({ ...draft, display_name: e.target.value })
                  }
                  placeholder="e.g. Luna Bloom"
                />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Select
                  value={draft.account_type}
                  onValueChange={(v) =>
                    setDraft({ ...draft, account_type: v as AccountType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={draft.city}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  placeholder="Austin"
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={draft.country}
                  onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                  placeholder="USA"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Short bio</Label>
              <Textarea
                value={draft.tagline}
                onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
                placeholder="Dreamy indie-pop from Austin"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Profile photo</Label>
              <div className="flex items-center gap-4">
                <div className="size-16 overflow-hidden rounded-full bg-muted">
                  {draft.avatar_url ? (
                    <img
                      src={draft.avatar_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    value={draft.avatar_url}
                    onChange={(e) =>
                      setDraft({ ...draft, avatar_url: e.target.value })
                    }
                    placeholder="https://… or upload below"
                  />
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      id="community-avatar-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() =>
                        document.getElementById("community-avatar-upload")?.click()
                      }
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 size-4" />
                      )}
                      Upload image
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={saving || uploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {uploading ? "Uploading…" : saving ? "Saving…" : draft.id ? "Save changes" : "Add member"}
              </Button>
            </div>
            </form>
          </CardContent>
        )}
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No community members yet. Add one to populate the dashboard.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-medium">{m.display_name}</div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.account_type}
                  </span>
                </div>
                {m.tagline && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {m.tagline}
                  </p>
                )}
                {m.location && (
                  <p className="mt-1 text-xs text-muted-foreground">{m.location}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(m)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(m.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
