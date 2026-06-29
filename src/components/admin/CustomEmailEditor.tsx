import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Eye, Save, Trash2 } from "lucide-react";
import { marked } from "marked";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  upsertCustomTemplate,
  deleteCustomTemplate,
  getCustomTemplate,
} from "@/lib/custom-templates.functions";

export interface CustomTemplateDraft {
  id?: string;
  name: string;
  display_name: string;
  subject: string;
  body_markdown: string;
  sample_data: Record<string, any>;
}

const MERGE_TAG = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const SAFE_PREVIEW_TAGS = new Set([
  "A",
  "P",
  "BR",
  "STRONG",
  "EM",
  "B",
  "I",
  "U",
  "S",
  "CODE",
  "PRE",
  "BLOCKQUOTE",
  "UL",
  "OL",
  "LI",
  "HR",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "IMG",
  "SPAN",
  "DIV",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TH",
  "TD",
]);

const SAFE_PREVIEW_ATTRS = new Set([
  "href",
  "title",
  "alt",
  "src",
  "width",
  "height",
  "style",
  "target",
  "rel",
]);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function extractVars(...sources: string[]): string[] {
  const set = new Set<string>();
  for (const src of sources) {
    if (!src) continue;
    for (const m of src.matchAll(MERGE_TAG)) set.add(m[1]);
  }
  return Array.from(set).sort();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyMergeTags(input: string, sampleData: Record<string, any>): string {
  return input.replace(MERGE_TAG, (_match, key) => {
    const value = sampleData?.[key];
    return value === null || value === undefined ? "" : escapeHtml(String(value));
  });
}

function resolveSubject(subject: string, sampleData: Record<string, any>): string {
  return subject.replace(MERGE_TAG, (_match, key) => {
    const value = sampleData?.[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

function isSafePreviewUrl(value: string): boolean {
  return /^(https?:|mailto:|tel:|[#/])/i.test(value.trim());
}

function sanitizePreviewHtml(html: string): string {
  if (typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  const nodes: Element[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Element);

  for (const node of nodes) {
    if (!SAFE_PREVIEW_TAGS.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
      continue;
    }

    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (!SAFE_PREVIEW_ATTRS.has(name) || name.startsWith("on")) {
        node.removeAttribute(attr.name);
        continue;
      }
      if ((name === "href" || name === "src") && !isSafePreviewUrl(value)) {
        node.removeAttribute(attr.name);
      }
    }

    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noreferrer");
    }
  }

  return template.innerHTML;
}

function renderPreviewDocument(subject: string, bodyMarkdown: string, sampleData: Record<string, any>) {
  const resolvedSubject = resolveSubject(subject || "(no subject)", sampleData);
  const mergedBody = applyMergeTags(bodyMarkdown, sampleData);
  const rawHtml = marked.parse(mergedBody, { async: false, breaks: true, gfm: true }) as string;
  const bodyHtml = sanitizePreviewHtml(rawHtml);

  return {
    subject: resolvedSubject,
    html: `<!doctype html><html><head><meta charset="utf-8"><style>
      body { margin: 0; background: #ffffff; color: #222222; font-family: Inter, Arial, sans-serif; }
      main { max-width: 560px; padding: 32px 28px; font-size: 15px; line-height: 1.6; }
      h1, h2, h3 { line-height: 1.2; margin: 0 0 16px; }
      p { margin: 0 0 16px; }
      a { color: #0f766e; }
      img { max-width: 100%; height: auto; }
      blockquote { border-left: 3px solid #d4d4d4; margin: 0 0 16px; padding-left: 14px; color: #555555; }
      code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
    </style><title>${escapeHtml(resolvedSubject)}</title></head><body><main>${bodyHtml}</main></body></html>`,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialId?: string | null;
  onSaved?: () => void;
}

export function CustomEmailEditor({ open, onOpenChange, initialId, onSaved }: Props) {
  const fetchOne = useServerFn(getCustomTemplate);
  const save = useServerFn(upsertCustomTemplate);
  const remove = useServerFn(deleteCustomTemplate);

  const [draft, setDraft] = useState<CustomTemplateDraft>({
    name: "",
    display_name: "",
    subject: "",
    body_markdown: "",
    sample_data: {},
  });
  const [nameTouched, setNameTouched] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing template when editing
  useEffect(() => {
    if (!open) return;
    if (!initialId) {
      setDraft({
        name: "",
        display_name: "",
        subject: "",
        body_markdown: "",
        sample_data: {},
      });
      setNameTouched(false);
      setPreviewHtml("");
      setPreviewSubject("");
      return;
    }
    setLoading(true);
    fetchOne({ data: { id: initialId } })
      .then((row: any) => {
        setDraft({
          id: row.id,
          name: row.name,
          display_name: row.display_name,
          subject: row.subject,
          body_markdown: row.body_markdown,
          sample_data: row.sample_data ?? {},
        });
        setNameTouched(true);
      })
      .catch((e) => toast.error(e?.message ?? "Couldn't load template"))
      .finally(() => setLoading(false));
  }, [open, initialId, fetchOne]);

  // Auto-derive slug from display name until the user touches it.
  useEffect(() => {
    if (nameTouched || draft.id) return;
    setDraft((d) => ({ ...d, name: slugify(d.display_name) }));
  }, [draft.display_name, nameTouched, draft.id]);

  const variables = useMemo(
    () => extractVars(draft.subject, draft.body_markdown),
    [draft.subject, draft.body_markdown],
  );

  // Debounced preview
  useEffect(() => {
    if (!open) return;
    if (!draft.subject && !draft.body_markdown) {
      setPreviewHtml("");
      setPreviewSubject("");
      return;
    }
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = renderPreviewDocument(draft.subject, draft.body_markdown, draft.sample_data);
        setPreviewHtml(res.html);
        setPreviewSubject(res.subject);
      } catch (e: any) {
        // keep last good preview
      } finally {
        setPreviewing(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [draft.subject, draft.body_markdown, draft.sample_data, open]);

  async function handleSave() {
    if (!draft.name || !draft.display_name || !draft.subject) {
      toast.error("Name, display name, and subject are required");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: draft.id,
          name: draft.name,
          display_name: draft.display_name,
          subject: draft.subject,
          body_markdown: draft.body_markdown,
          sample_data: draft.sample_data,
        },
      });
      toast.success(draft.id ? "Template updated" : "Template created");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft.id) return;
    if (!confirm(`Delete template "${draft.display_name}"? This can't be undone.`)) return;
    try {
      await remove({ data: { id: draft.id } });
      toast.success("Template deleted");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete template");
    }
  }

  function updateSampleValue(key: string, value: string) {
    setDraft((d) => ({ ...d, sample_data: { ...d.sample_data, [key]: value } }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit template" : "New email template"}</DialogTitle>
          <DialogDescription>
            Use Markdown for the body. Insert merge tags like{" "}
            <code className="font-mono text-xs">{"{{name}}"}</code> to personalise each send.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden flex-1">
            {/* Editor pane */}
            <div className="space-y-3 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="dn">Display name</Label>
                  <Input
                    id="dn"
                    value={draft.display_name}
                    onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
                    placeholder="Welcome email"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nm">Internal name (slug)</Label>
                  <Input
                    id="nm"
                    value={draft.name}
                    onChange={(e) => {
                      setNameTouched(true);
                      setDraft((d) => ({ ...d, name: e.target.value }));
                    }}
                    placeholder="welcome-fan"
                    disabled={!!draft.id}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sj">Subject</Label>
                <Input
                  id="sj"
                  value={draft.subject}
                  onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                  placeholder="Welcome to Create Racket, {{name}}!"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="body">Body (Markdown)</Label>
                <Textarea
                  id="body"
                  value={draft.body_markdown}
                  onChange={(e) => setDraft((d) => ({ ...d, body_markdown: e.target.value }))}
                  placeholder={"# Hi {{name}}\n\nThanks for joining Create Racket.\n\n[Open your dashboard](https://createracket.com)"}
                  className="font-mono text-sm min-h-[260px]"
                />
                <p className="text-xs text-muted-foreground">
                  Supports **bold**, *italic*, [links](url), lists, headings, images. HTML is sanitised.
                </p>
              </div>

              {variables.length > 0 && (
                <div className="space-y-2">
                  <Label>Merge tags ({variables.length})</Label>
                  <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                    {variables.map((v) => (
                      <div key={v} className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs shrink-0 w-32 justify-start">
                          {`{{${v}}}`}
                        </Badge>
                        <Input
                          value={String(draft.sample_data[v] ?? "")}
                          onChange={(e) => updateSampleValue(v, e.target.value)}
                          placeholder={`sample for ${v}`}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sample values are used for previews and test sends.
                  </p>
                </div>
              )}
            </div>

            {/* Preview pane */}
            <div className="flex flex-col overflow-hidden border rounded-md bg-white">
              <div className="border-b px-3 py-2 bg-muted/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye className="size-3.5" />
                  <span>Preview</span>
                  {previewing && <Loader2 className="size-3 animate-spin" />}
                </div>
                <p className="text-sm font-medium text-foreground mt-1 truncate">
                  {previewSubject || "Subject preview"}
                </p>
              </div>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml || "<p style='padding:20px;font-family:sans-serif;color:#999'>Start typing to see a preview…</p>"}
                className="flex-1 w-full bg-white"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {draft.id && (
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-500 hover:bg-red-500/10 mr-auto"
              onClick={handleDelete}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {draft.id ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
