import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { BookmarkPlus, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  loadCachedIdea,
  saveCachedIdea,
  loadBankedIdeas,
  saveBankedIdeas,
  todayKey,
  PLATFORMS,
  REGIONS,
  type Profile,
  type Region,
  type Platform,
  type DailyIdea,
  type BankedIdea,
} from "@/lib/racket-desk/profiles";
import { generateDailyIdea } from "@/lib/racket-desk/daily-idea.functions";
import { trends } from "@/lib/racket-desk/trends";

export const Route = createFileRoute("/_authenticated/racket-desk/profiles")({
  head: () => ({
    meta: [
      { title: "My profiles · Racket Desk" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfilesPage,
});

function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [idea, setIdea] = useState<DailyIdea | null>(null);
  const [banked, setBanked] = useState<BankedIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ platform: Platform; handle: string; regions: Region[] }>({
    platform: "TikTok",
    handle: "",
    regions: ["UK"],
  });

  const generate = useServerFn(generateDailyIdea);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("racket_desk_profiles")
      .select("id, platform, handle, regions")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Couldn't load your saved profiles");
      return;
    }
    setProfiles(
      (data ?? []).map((r) => ({
        id: r.id,
        platform: r.platform as Platform,
        handle: r.handle,
        regions: (r.regions ?? []) as Region[],
      })),
    );
  };

  useEffect(() => {
    void fetchProfiles();
    setIdea(loadCachedIdea());
    setBanked(loadBankedIdeas());
  }, []);

  const addProfile = async () => {
    const handle = draft.handle.trim().replace(/^@/, "");
    if (!handle) return toast.error("Add a handle first");
    if (draft.regions.length === 0) return toast.error("Pick at least one region");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sign in to save profiles");
    const { data, error } = await supabase
      .from("racket_desk_profiles")
      .insert({
        user_id: auth.user.id,
        platform: draft.platform,
        handle,
        regions: draft.regions,
      })
      .select("id, platform, handle, regions")
      .single();
    if (error || !data) return toast.error("Couldn't save that profile");
    setProfiles((prev) => [
      ...prev,
      { id: data.id, platform: data.platform as Platform, handle: data.handle, regions: (data.regions ?? []) as Region[] },
    ]);
    setDraft({ platform: draft.platform, handle: "", regions: draft.regions });
    toast.success(`Saved ${draft.platform} @${handle}`);
  };

  const removeProfile = async (id: string) => {
    const prev = profiles;
    setProfiles(profiles.filter((p) => p.id !== id));
    const { error } = await supabase.from("racket_desk_profiles").delete().eq("id", id);
    if (error) {
      setProfiles(prev);
      toast.error("Couldn't remove that profile");
    }
  };


  const toggleRegion = (r: Region) =>
    setDraft((d) => ({
      ...d,
      regions: d.regions.includes(r) ? d.regions.filter((x) => x !== r) : [...d.regions, r],
    }));

  const trendSummary = trends
    .slice(0, 6)
    .map((t) => `${t.platform} · ${t.format} — ${t.soundOrHook} (heat ${t.heat}, ${t.velocity})`)
    .join("\n");

  const runIdea = async () => {
    if (profiles.length === 0) return toast.error("Add at least one profile first");
    setLoading(true);
    try {
      const result = await generate({
        data: {
          profiles: profiles.map((p) => ({ platform: p.platform, handle: p.handle, regions: p.regions })),
          trendSummary,
        },
      });
      const stored: DailyIdea = { date: todayKey(), ...result };
      setIdea(stored);
      saveCachedIdea(stored);
      toast.success("Fresh idea ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isFreshToday = idea?.date === todayKey();
  const alreadyBanked = idea ? banked.some((b) => b.hook === idea.hook && b.format === idea.format) : false;

  const bankCurrent = () => {
    if (!idea) return;
    if (alreadyBanked) return toast.message("Already in your bank");
    const entry: BankedIdea = {
      ...idea,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bankedAt: new Date().toISOString(),
    };
    const next = [entry, ...banked];
    setBanked(next);
    saveBankedIdeas(next);
    toast.success("Idea banked");
  };

  const removeBanked = (id: string) => {
    const next = banked.filter((b) => b.id !== id);
    setBanked(next);
    saveBankedIdeas(next);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-[0.2em] text-lime">Your desk · profiles</div>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Plug your channels in.</h1>
        <p className="max-w-2xl text-muted-foreground">
          Add the accounts you post from and where your audience lives. Racket serves one shootable
          idea a day — tailored, on-trend, and ready to make.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="space-y-6 lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Add a profile</div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr_auto]">
              <select
                value={draft.platform}
                onChange={(e) => setDraft({ ...draft, platform: e.target.value as Platform })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-lime focus:outline-none"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                value={draft.handle}
                onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addProfile()}
                placeholder="@yourhandle or full URL"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-lime focus:outline-none"
              />
              <button onClick={addProfile} className="inline-flex items-center justify-center gap-1 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Target regions</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REGIONS.map((r) => {
                  const on = draft.regions.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => toggleRegion(r)}
                      className={`rounded-full border px-3 py-1.5 text-xs ${
                        on ? "border-lime bg-lime font-semibold text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Linked profiles</div>
                <h2 className="mt-1 font-display text-lg">{profiles.length} channel{profiles.length === 1 ? "" : "s"}</h2>
              </div>
            </div>

            {profiles.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No profiles yet. Add one above to unlock your daily idea.
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {profiles.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{p.platform}</span>
                        <span className="font-medium">@{p.handle}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{p.regions.join(" · ")}</div>
                    </div>
                    <button onClick={() => removeProfile(p.id)} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-coral" aria-label={`Remove ${p.handle}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-lime">
                <Sparkles className="h-3 w-3" /> Today's idea
              </div>
              <button
                onClick={runIdea}
                disabled={loading || profiles.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cooking</>
                ) : (
                  <><Wand2 className="h-3.5 w-3.5" /> {idea ? "Regenerate" : "Generate"}</>
                )}
              </button>
            </div>

            {!idea ? (
              <div className="mt-4 text-sm text-muted-foreground">
                {profiles.length === 0
                  ? "Add a profile to unlock a daily idea tailored to your channels."
                  : "Hit Generate to get today's content idea, matched to what's breaking right now."}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {!isFreshToday && (
                  <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
                    Last generated {idea.date}. Regenerate for today's brief.
                  </div>
                )}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Hook</div>
                  <div className="mt-1 font-display text-lg leading-snug">"{idea.hook}"</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Format</div>
                  <div className="mt-1 text-sm">{idea.format}</div>
                </div>
                {idea.structure.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Structure</div>
                    <ol className="mt-1 list-decimal space-y-1 pl-4 text-sm">
                      {idea.structure.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Audio</div>
                    <div className="mt-1 text-sm">{idea.audio}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CTA</div>
                    <div className="mt-1 text-sm">{idea.cta}</div>
                  </div>
                  {idea.matchedTrend && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Leans into</div>
                      <div className="mt-1 text-sm text-lime">{idea.matchedTrend}</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={bankCurrent}
                    disabled={alreadyBanked}
                    className="inline-flex items-center gap-1.5 rounded-full border border-lime/40 bg-lime/10 px-3 py-1.5 text-xs font-semibold text-lime hover:bg-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    {alreadyBanked ? "Banked" : "Bank idea"}
                  </button>
                  <button
                    onClick={runIdea}
                    disabled={loading || profiles.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cooking</>
                    ) : (
                      <><Wand2 className="h-3.5 w-3.5" /> Fresh idea</>
                    )}
                  </button>
                  <span className="text-[11px] text-muted-foreground">Bank keeps it safe, then regenerate for more.</span>
                </div>
              </div>
            )}
          </div>

          {banked.length > 0 && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Idea bank</div>
                  <h2 className="mt-1 font-display text-lg">{banked.length} saved</h2>
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                {banked.map((b) => (
                  <li key={b.id} className="group rounded-xl border border-border bg-background/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-display text-sm leading-snug">"{b.hook}"</div>
                        <div className="mt-1 text-xs text-muted-foreground">{b.format}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Banked {new Date(b.bankedAt).toLocaleDateString()}
                          {b.matchedTrend ? ` · ${b.matchedTrend}` : ""}
                        </div>
                      </div>
                      <button onClick={() => removeBanked(b.id)} className="rounded-lg border border-border p-1.5 text-muted-foreground opacity-0 transition hover:text-coral group-hover:opacity-100" aria-label="Remove banked idea">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
