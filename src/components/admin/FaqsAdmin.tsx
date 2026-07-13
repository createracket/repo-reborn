import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";

type Faq = {
  id: string;
  question: string;
  answer: string;
  position: number;
  published: boolean;
};

export function FaqsAdmin() {
  const [rows, setRows] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("faqs" as any)
      .select("*")
      .order("position", { ascending: true });
    if (error) toast.error(error.message);
    setRows(((data as any[]) ?? []) as Faq[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addRow() {
    const nextPos = rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 0;
    const { error } = await supabase
      .from("faqs" as any)
      .insert({ question: "New question", answer: "Answer goes here", position: nextPos } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Added");
    load();
  }

  function updateLocal(id: string, patch: Partial<Faq>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: Faq) {
    const { error } = await supabase
      .from("faqs" as any)
      .update({
        question: row.question,
        answer: row.answer,
        position: row.position,
        published: row.published,
      } as any)
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
  }

  async function deleteRow(id: string) {
    if (!confirm("Delete this FAQ?")) return;
    const { error } = await supabase.from("faqs" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>FAQs</CardTitle>
            <CardDescription>Shown on the home page in an accordion.</CardDescription>
          </div>
          <Button onClick={addRow}>Add FAQ</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No FAQs yet.</p>
        ) : null}
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-border p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_100px_auto]">
              <div>
                <Label>Question</Label>
                <Input
                  value={row.question}
                  onChange={(e) => updateLocal(row.id, { question: e.target.value })}
                />
              </div>
              <div>
                <Label>Position</Label>
                <Input
                  type="number"
                  value={row.position}
                  onChange={(e) => updateLocal(row.id, { position: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.published}
                    onCheckedChange={(v) => updateLocal(row.id, { published: v })}
                  />
                  <span className="text-sm">Published</span>
                </div>
              </div>
            </div>
            <div>
              <Label>Answer</Label>
              <Textarea
                rows={3}
                value={row.answer}
                onChange={(e) => updateLocal(row.id, { answer: e.target.value })}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => deleteRow(row.id)}>
                <Trash2 className="mr-1 size-4" /> Delete
              </Button>
              <Button size="sm" onClick={() => saveRow(row)}>Save</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
