import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  loadBriefFormConfig,
  saveBriefFormConfig,
  DEFAULT_BRIEF_FORM_CONFIG,
  type BriefFormConfig,
  type BriefFieldKey,
} from "@/lib/brief-form-config";

const FIELD_KEYS: BriefFieldKey[] = [
  "title",
  "description",
  "budget",
  "timeline",
  "target_audience",
  "contact_email",
  "additional_info",
];

const SECTION_KEYS = ["core", "vibe", "contact", "extras"] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

export function BriefFormAdmin() {
  const [config, setConfig] = useState<BriefFormConfig | null>(null);
  const [draft, setDraft] = useState<BriefFormConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBriefFormConfig(true).then((c) => {
      setConfig(c);
      setDraft(c);
    });
  }, []);

  if (!config || !draft) {
    return <p className="text-sm text-muted-foreground">Loading brief form config…</p>;
  }

  async function persist() {
    if (!draft) return;
    setSaving(true);
    try {
      await saveBriefFormConfig(draft);
      setConfig(draft);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function updatePage(field: keyof BriefFormConfig["page"], val: string) {
    setDraft((d) => (d ? { ...d, page: { ...d.page, [field]: val } } : d));
  }
  function updateSection(key: SectionKey, field: "title" | "description", val: string) {
    setDraft((d) =>
      d
        ? {
            ...d,
            sections: { ...d.sections, [key]: { ...d.sections[key], [field]: val } },
          }
        : d,
    );
  }
  function updateField(key: BriefFieldKey, field: "label" | "placeholder", val: string) {
    setDraft((d) =>
      d
        ? { ...d, fields: { ...d.fields, [key]: { ...d.fields[key], [field]: val } } }
        : d,
    );
  }
  function updateList(key: "coreValues" | "collaborationTypes", raw: string) {
    const items = raw.split("\n").map((x) => x.trim()).filter(Boolean);
    setDraft((d) => (d ? { ...d, [key]: items } : d));
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Edit the copy, sections, fields, and option lists used on the public briefing form
        (/connect). Changes go live immediately for everyone.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page copy</CardTitle>
          <CardDescription>Heading, intro, and submit button labels.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Eyebrow</Label>
            <Input value={draft.page.eyebrow} onChange={(e) => updatePage("eyebrow", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Heading</Label>
            <Input value={draft.page.heading} onChange={(e) => updatePage("heading", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Card title</Label>
            <Input value={draft.page.cardTitle} onChange={(e) => updatePage("cardTitle", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Card description</Label>
            <Textarea
              rows={2}
              value={draft.page.cardDescription}
              onChange={(e) => updatePage("cardDescription", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Submit button label</Label>
            <Input value={draft.page.submitLabel} onChange={(e) => updatePage("submitLabel", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Submitting label</Label>
            <Input
              value={draft.page.submittingLabel}
              onChange={(e) => updatePage("submittingLabel", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Success toast message</Label>
            <Input
              value={draft.page.successMessage}
              onChange={(e) => updatePage("successMessage", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sections</CardTitle>
          <CardDescription>Section headings and supporting copy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SECTION_KEYS.map((k) => (
            <div key={k} className="grid gap-3 border-b border-border/40 pb-4 last:border-0 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  {k === "core" ? "1. Core" : k === "vibe" ? "2. Vibe" : k === "contact" ? "3. Contact" : "4. Extras"} — title
                </Label>
                <Input
                  value={draft.sections[k].title}
                  onChange={(e) => updateSection(k, "title", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={draft.sections[k].description}
                  onChange={(e) => updateSection(k, "description", e.target.value)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fields</CardTitle>
          <CardDescription>
            Labels and placeholders. Field keys and types are fixed to keep submissions consistent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELD_KEYS.map((key) => (
            <div key={key} className="space-y-2 border-b border-border/40 pb-4 last:border-0">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{key}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input
                    value={draft.fields[key].label}
                    onChange={(e) => updateField(key, "label", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Placeholder</Label>
                  <Input
                    value={draft.fields[key].placeholder ?? ""}
                    onChange={(e) => updateField(key, "placeholder", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core values</CardTitle>
          <CardDescription>Options for the "ideal partner's core values" picker.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Field label</Label>
            <Input
              value={draft.coreValuesLabel}
              onChange={(e) => setDraft((d) => (d ? { ...d, coreValuesLabel: e.target.value } : d))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max selectable</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={draft.coreValuesMax}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, coreValuesMax: Math.max(1, Number(e.target.value) || 1) } : d,
                )
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Options (one per line)</Label>
            <Textarea
              rows={Math.min(12, Math.max(4, draft.coreValues.length + 1))}
              value={draft.coreValues.join("\n")}
              onChange={(e) => updateList("coreValues", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Collaboration types</CardTitle>
          <CardDescription>Options for the collaboration type picker.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Field label</Label>
            <Input
              value={draft.collaborationTypesLabel}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, collaborationTypesLabel: e.target.value } : d))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Options (one per line)</Label>
            <Textarea
              rows={Math.min(12, Math.max(4, draft.collaborationTypes.length + 1))}
              value={draft.collaborationTypes.join("\n")}
              onChange={(e) => updateList("collaborationTypes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDraft(DEFAULT_BRIEF_FORM_CONFIG)}
          disabled={saving}
        >
          <RotateCcw className="mr-1 size-3" /> Reset everything to defaults
        </Button>
      </div>

      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-end gap-2 rounded-md border border-border/60 bg-background/90 p-3 backdrop-blur">
        <Button type="button" variant="ghost" onClick={() => setDraft(config)} disabled={saving}>
          Discard changes
        </Button>
        <Button type="button" onClick={persist} disabled={saving}>
          <Save className="mr-1 size-4" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
