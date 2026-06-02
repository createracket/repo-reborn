import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  loadVibeCheckConfig,
  saveVibeCheckConfig,
  mergeVibeConfig,
  DEFAULT_VIBE_CONFIG,
  DEFAULT_ARTIST_ARCHETYPES,
  DEFAULT_BRAND_ARCHETYPES,
  type VibeCheckConfig,
  type ArtistArchetypeKey,
  type BrandArchetypeKey,
  type SurveyDef,
} from "@/lib/vibe-check-config";
import {
  ARTIST_ARCHETYPE_KEYS,
  BRAND_ARCHETYPE_KEYS,
  ARTIST_RULES,
  BRAND_RULES,
} from "@/lib/vibe-check";

type SurveyKey = "brand" | "musician";

export function VibeCheckAdmin() {
  const [config, setConfig] = useState<VibeCheckConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVibeCheckConfig(true).then(setConfig);
  }, []);

  async function persist(next: VibeCheckConfig) {
    setSaving(true);
    try {
      await saveVibeCheckConfig(next);
      setConfig(next);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return <p className="text-sm text-muted-foreground">Loading vibe check config…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Edit the surveys, archetype outputs, and scoring weights used by the Vibe Check. Changes
          go live for everyone immediately.
        </p>
      </div>
      <Tabs defaultValue="archetypes">
        <TabsList>
          <TabsTrigger value="archetypes">Archetypes</TabsTrigger>
          <TabsTrigger value="weights">Weights</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
        </TabsList>

        <TabsContent value="archetypes" className="mt-6">
          <ArchetypesEditor config={config} onSave={persist} saving={saving} />
        </TabsContent>
        <TabsContent value="weights" className="mt-6">
          <WeightsEditor config={config} onSave={persist} saving={saving} />
        </TabsContent>
        <TabsContent value="surveys" className="mt-6">
          <SurveysEditor config={config} onSave={persist} saving={saving} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Archetypes ----------------

function ArchetypesEditor({
  config,
  onSave,
  saving,
}: {
  config: VibeCheckConfig;
  onSave: (c: VibeCheckConfig) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(config);
  useEffect(() => setDraft(config), [config]);

  function updateArtist(key: ArtistArchetypeKey, field: "name" | "description" | "bestFor", val: string) {
    setDraft((d) => ({
      ...d,
      artistArchetypes: {
        ...d.artistArchetypes,
        [key]: { ...d.artistArchetypes[key], [field]: val },
      },
    }));
  }
  function updateBrand(key: BrandArchetypeKey, field: "name" | "description", val: string) {
    setDraft((d) => ({
      ...d,
      brandArchetypes: {
        ...d.brandArchetypes,
        [key]: { ...d.brandArchetypes[key], [field]: val },
      },
    }));
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-display text-xl">Artist archetypes</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {ARTIST_ARCHETYPE_KEYS.map((k) => {
            const a = draft.artistArchetypes[k];
            return (
              <Card key={k}>
                <CardHeader className="pb-3">
                  <CardDescription className="font-mono text-xs uppercase tracking-wider">{k}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={a.name} onChange={(e) => updateArtist(k, "name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea rows={3} value={a.description} onChange={(e) => updateArtist(k, "description", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Best for</Label>
                    <Input value={a.bestFor} onChange={(e) => updateArtist(k, "bestFor", e.target.value)} />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        artistArchetypes: { ...d.artistArchetypes, [k]: DEFAULT_ARTIST_ARCHETYPES[k] },
                      }))
                    }
                  >
                    <RotateCcw className="mr-1 size-3" /> Reset
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-xl">Brand archetypes</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {BRAND_ARCHETYPE_KEYS.map((k) => {
            const a = draft.brandArchetypes[k];
            return (
              <Card key={k}>
                <CardHeader className="pb-3">
                  <CardDescription className="font-mono text-xs uppercase tracking-wider">{k}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={a.name} onChange={(e) => updateBrand(k, "name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea rows={3} value={a.description} onChange={(e) => updateBrand(k, "description", e.target.value)} />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        brandArchetypes: { ...d.brandArchetypes, [k]: DEFAULT_BRAND_ARCHETYPES[k] },
                      }))
                    }
                  >
                    <RotateCcw className="mr-1 size-3" /> Reset
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <SaveBar onSave={() => onSave(draft)} onReset={() => setDraft(config)} saving={saving} />
    </div>
  );
}

// ---------------- Weights ----------------

function WeightsEditor({
  config,
  onSave,
  saving,
}: {
  config: VibeCheckConfig;
  onSave: (c: VibeCheckConfig) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(config);
  const [openKey, setOpenKey] = useState<string | null>(null);
  useEffect(() => setDraft(config), [config]);

  function setArtistWeight(key: ArtistArchetypeKey, ruleId: string, value: number) {
    setDraft((d) => ({
      ...d,
      weights: {
        ...d.weights,
        artist: {
          ...d.weights.artist,
          [key]: { ...(d.weights.artist[key] ?? {}), [ruleId]: value },
        },
      },
    }));
  }
  function setBrandWeight(key: BrandArchetypeKey, ruleId: string, value: number) {
    setDraft((d) => ({
      ...d,
      weights: {
        ...d.weights,
        brand: {
          ...d.weights.brand,
          [key]: { ...(d.weights.brand[key] ?? {}), [ruleId]: value },
        },
      },
    }));
  }
  function resetArtist(key: ArtistArchetypeKey) {
    setDraft((d) => ({
      ...d,
      weights: { ...d.weights, artist: { ...d.weights.artist, [key]: {} } },
    }));
  }
  function resetBrand(key: BrandArchetypeKey) {
    setDraft((d) => ({
      ...d,
      weights: { ...d.weights, brand: { ...d.weights.brand, [key]: {} } },
    }));
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="font-display text-xl">Artist scoring weights</h3>
        <p className="text-sm text-muted-foreground">
          Points awarded when a rule matches. Negative numbers are penalties. Leave defaults by resetting.
        </p>
        <div className="space-y-2">
          {ARTIST_ARCHETYPE_KEYS.map((k) => {
            const id = `artist-${k}`;
            const isOpen = openKey === id;
            return (
              <Card key={k}>
                <CardHeader className="pb-3">
                  <button
                    type="button"
                    onClick={() => setOpenKey(isOpen ? null : id)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <CardTitle className="text-base">{draft.artistArchetypes[k].name}</CardTitle>
                      <CardDescription className="font-mono text-xs uppercase tracking-wider">{k}</CardDescription>
                    </div>
                    {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-2">
                    {ARTIST_RULES[k].map((rule) => {
                      const override = draft.weights.artist[k]?.[rule.id];
                      const current = override ?? rule.points;
                      return (
                        <div key={rule.id} className="flex items-center gap-3 border-b border-border/40 py-2 last:border-0">
                          <div className="flex-1">
                            <p className="text-sm">{rule.label}</p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              {rule.id} · default {rule.points}
                            </p>
                          </div>
                          <Input
                            type="number"
                            className="w-24"
                            value={current}
                            onChange={(e) => setArtistWeight(k, rule.id, Number(e.target.value))}
                          />
                        </div>
                      );
                    })}
                    <div className="pt-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => resetArtist(k)}>
                        <RotateCcw className="mr-1 size-3" /> Reset to defaults
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-xl">Brand scoring weights</h3>
        <div className="space-y-2">
          {BRAND_ARCHETYPE_KEYS.map((k) => {
            const id = `brand-${k}`;
            const isOpen = openKey === id;
            return (
              <Card key={k}>
                <CardHeader className="pb-3">
                  <button
                    type="button"
                    onClick={() => setOpenKey(isOpen ? null : id)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <CardTitle className="text-base">{draft.brandArchetypes[k].name}</CardTitle>
                      <CardDescription className="font-mono text-xs uppercase tracking-wider">{k}</CardDescription>
                    </div>
                    {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-2">
                    {BRAND_RULES[k].map((rule) => {
                      const override = draft.weights.brand[k]?.[rule.id];
                      const current = override ?? rule.points;
                      return (
                        <div key={rule.id} className="flex items-center gap-3 border-b border-border/40 py-2 last:border-0">
                          <div className="flex-1">
                            <p className="text-sm">{rule.label}</p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              {rule.id} · default {rule.points}
                            </p>
                          </div>
                          <Input
                            type="number"
                            className="w-24"
                            value={current}
                            onChange={(e) => setBrandWeight(k, rule.id, Number(e.target.value))}
                          />
                        </div>
                      );
                    })}
                    <div className="pt-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => resetBrand(k)}>
                        <RotateCcw className="mr-1 size-3" /> Reset to defaults
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <SaveBar onSave={() => onSave(draft)} onReset={() => setDraft(config)} saving={saving} />
    </div>
  );
}

// ---------------- Surveys ----------------

function SurveysEditor({
  config,
  onSave,
  saving,
}: {
  config: VibeCheckConfig;
  onSave: (c: VibeCheckConfig) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(config);
  const [which, setWhich] = useState<SurveyKey>("musician");
  useEffect(() => setDraft(config), [config]);

  const survey = draft.surveys[which];

  function updateSection(idx: number, field: "title" | "description" | "timeEstimate", val: string) {
    setDraft((d) => {
      const s = d.surveys[which];
      const sections = s.sections.map((sec, i) => (i === idx ? { ...sec, [field]: val } : sec));
      return { ...d, surveys: { ...d.surveys, [which]: { ...s, sections } } };
    });
  }
  function updateField(name: string, field: "label" | "placeholder" | "description", val: string) {
    setDraft((d) => {
      const s = d.surveys[which];
      const fields = { ...s.fields, [name]: { ...s.fields[name], [field]: val } };
      return { ...d, surveys: { ...d.surveys, [which]: { ...s, fields } } };
    });
  }
  function updateOptions(name: string, raw: string) {
    setDraft((d) => {
      const s = d.surveys[which];
      const options = raw.split("\n").map((x) => x.trim()).filter(Boolean);
      const fields = { ...s.fields, [name]: { ...s.fields[name], options } };
      return { ...d, surveys: { ...d.surveys, [which]: { ...s, fields } } };
    });
  }
  function resetSurvey() {
    setDraft((d) => ({
      ...d,
      surveys: { ...d.surveys, [which]: DEFAULT_VIBE_CONFIG.surveys[which] },
    }));
  }

  return (
    <div className="space-y-6">
      <Tabs value={which} onValueChange={(v) => setWhich(v as SurveyKey)}>
        <TabsList>
          <TabsTrigger value="musician">Musician survey</TabsTrigger>
          <TabsTrigger value="brand">Brand survey</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sections</CardTitle>
          <CardDescription>Section titles, descriptions, and time estimates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {survey.sections.map((sec, i) => (
            <div key={i} className="grid gap-3 border-b border-border/40 pb-4 last:border-0 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Section {i + 1} title</Label>
                <Input value={sec.title} onChange={(e) => updateSection(i, "title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Time estimate</Label>
                <Input value={sec.timeEstimate} onChange={(e) => updateSection(i, "timeEstimate", e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={sec.description} onChange={(e) => updateSection(i, "description", e.target.value)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <FieldsEditor survey={survey} onField={updateField} onOptions={updateOptions} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" onClick={resetSurvey}>
          <RotateCcw className="mr-1 size-3" /> Reset this survey to defaults
        </Button>
      </div>

      <SaveBar onSave={() => onSave(draft)} onReset={() => setDraft(config)} saving={saving} />
    </div>
  );
}

function FieldsEditor({
  survey,
  onField,
  onOptions,
}: {
  survey: SurveyDef;
  onField: (name: string, field: "label" | "placeholder" | "description", val: string) => void;
  onOptions: (name: string, raw: string) => void;
}) {
  const entries = Object.entries(survey.fields);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fields ({entries.length})</CardTitle>
        <CardDescription>
          Edit labels, placeholders, descriptions, and option lists. Field names and types are fixed
          to keep scoring rules intact.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map(([name, f]) => (
          <div key={name} className="space-y-2 border-b border-border/40 pb-4 last:border-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {name} · {f.type} · section {f.section}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input value={f.label} onChange={(e) => onField(name, "label", e.target.value)} />
              </div>
              {f.type !== "checkbox" && f.type !== "radio" ? (
                <div className="space-y-1.5">
                  <Label>Placeholder</Label>
                  <Input value={f.placeholder ?? ""} onChange={(e) => onField(name, "placeholder", e.target.value)} />
                </div>
              ) : null}
              <div className="space-y-1.5 md:col-span-2">
                <Label>Helper description</Label>
                <Textarea rows={2} value={f.description ?? ""} onChange={(e) => onField(name, "description", e.target.value)} />
              </div>
              {(f.type === "checkbox" || f.type === "radio") && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Options (one per line)</Label>
                  <Textarea
                    rows={Math.min(10, Math.max(3, (f.options?.length ?? 0) + 1))}
                    value={(f.options ?? []).join("\n")}
                    onChange={(e) => onOptions(name, e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------- Save bar ----------------

function SaveBar({ onSave, onReset, saving }: { onSave: () => void; onReset: () => void; saving: boolean }) {
  return (
    <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-end gap-2 rounded-md border border-border/60 bg-background/90 p-3 backdrop-blur">
      <Button type="button" variant="ghost" onClick={onReset} disabled={saving}>
        Discard changes
      </Button>
      <Button type="button" onClick={onSave} disabled={saving}>
        <Save className="mr-1 size-4" /> {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
