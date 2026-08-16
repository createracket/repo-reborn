import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, RefreshCw, Send, AlertCircle, CheckCircle2, Clock, Ban, Plus, Pencil } from "lucide-react";
import { CustomEmailEditor } from "./CustomEmailEditor";
import { EmailTriggers } from "./EmailTriggers";
import { EmailManualSend } from "./EmailManualSend";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  getEmailLogs, getEmailStats, getEmailTemplates, getSuppressedEmails, sendTestEmail,
} from "@/lib/email-admin.functions";
import { getOrCreateBuiltinOverride } from "@/lib/custom-templates.functions";

type Range = "24h" | "7d" | "30d" | "all";

type TemplateListItem = {
  name: string;
  displayName: string;
  subject: string;
  hasPreviewData: boolean;
  kind: "builtin" | "custom";
  id: string | null;
  overrideId?: string | null;
  edited?: boolean;
  sampleData?: Record<string, any>;
};

function rangeToFrom(range: Range): string | undefined {
  if (range === "all") return undefined;
  const now = new Date();
  const ms = range === "24h" ? 24 * 3600e3 : range === "7d" ? 7 * 86400e3 : 30 * 86400e3;
  return new Date(now.getTime() - ms).toISOString();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    sent: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Sent" },
    pending: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Pending" },
    dlq: { cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "Failed" },
    failed: { cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "Failed" },
    bounced: { cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "Bounced" },
    complained: { cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "Complaint" },
    suppressed: { cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", label: "Suppressed" },
  };
  const m = map[status] ?? { cls: "bg-muted text-foreground", label: status };
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}

function formatSampleData(sampleData?: Record<string, any>): string {
  const entries = Object.entries(sampleData ?? {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .slice(0, 4);

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

export function EmailsAdmin() {
  const fetchLogs = useServerFn(getEmailLogs);
  const fetchStats = useServerFn(getEmailStats);
  const fetchTemplates = useServerFn(getEmailTemplates);
  const fetchSuppressed = useServerFn(getSuppressedEmails);
  const triggerTest = useServerFn(sendTestEmail);
  const openBuiltinOverride = useServerFn(getOrCreateBuiltinOverride);

  const [range, setRange] = useState<Range>("7d");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, suppressed: 0, pending: 0 });
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [templateNames, setTemplateNames] = useState<string[]>([]);
  const [suppressed, setSuppressed] = useState<any[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [testTemplate, setTestTemplate] = useState<string | null>(null);
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testBusy, setTestBusy] = useState(false);

  const from = useMemo(() => rangeToFrom(range), [range]);

  async function loadAll() {
    setLoading(true);
    try {
      const [logsRes, statsRes, suppRes] = await Promise.all([
        fetchLogs({
          data: {
            from,
            status: statusFilter === "all" ? undefined : (statusFilter as any),
            template: templateFilter === "all" ? undefined : templateFilter,
            limit: 50,
            offset: page * 50,
          },
        }),
        fetchStats({ data: { from } }),
        fetchSuppressed(),
      ]);
      setLogs(logsRes.rows);
      setLogsTotal(logsRes.total);
      setStats(statsRes.stats);
      setTemplateNames(statsRes.templates);
      setSuppressed(suppRes.rows);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load email data");
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const r = await fetchTemplates();
      setTemplates(r.templates as any);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, statusFilter, templateFilter, page]);

  async function handleSendTest() {
    if (!testTemplate || !testEmailAddr) return;
    setTestBusy(true);
    try {
      const res: any = await triggerTest({ data: { templateName: testTemplate, recipientEmail: testEmailAddr } });
      if (res?.success) toast.success("Test email queued");
      else toast.error(res?.error || res?.reason || "Couldn't send test");
      setTestOpen(false);
      setTestEmailAddr("");
      loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send test");
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border p-1">
          {(["24h", "7d", "30d", "all"] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              onClick={() => { setRange(r); setPage(0); }}
            >
              {r === "all" ? "All time" : `Last ${r}`}
            </Button>
          ))}
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="dlq">Failed</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="complained">Complaint</SelectItem>
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={(v) => { setTemplateFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templateNames.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={<Mail className="size-4" />} label="Total" value={stats.total} />
        <StatCard icon={<CheckCircle2 className="size-4 text-emerald-400" />} label="Sent" value={stats.sent} />
        <StatCard icon={<Clock className="size-4 text-amber-400" />} label="Pending" value={stats.pending} />
        <StatCard icon={<AlertCircle className="size-4 text-red-400" />} label="Failed" value={stats.failed} />
        <StatCard icon={<Ban className="size-4 text-yellow-500" />} label="Suppressed" value={stats.suppressed} />
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Send log ({logsTotal})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="send">Manual send</TabsTrigger>
          <TabsTrigger value="suppressed">Suppressed ({suppressed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No emails in this range</TableCell></TableRow>
                  ) : logs.map((r, i) => (
                    <TableRow key={(r.message_id ?? "") + i}>
                      <TableCell className="font-mono text-xs">{r.template_name}</TableCell>
                      <TableCell className="text-sm">{r.recipient_email}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(r.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs text-red-400 max-w-xs truncate">{r.error_message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {logsTotal > 50 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {page * 50 + 1}–{Math.min((page + 1) * 50, logsTotal)} of {logsTotal}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={(page + 1) * 50 >= logsTotal} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Custom templates appear first. Built-in templates are wired into app events in code.
            </p>
            <Button size="sm" onClick={() => { setEditingId(null); setEditorOpen(true); }}>
              <Plus className="size-4" /> New template
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => {
              const sampleSummary = formatSampleData(t.sampleData);

              return (
              <Card key={`${t.kind}:${t.name}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{t.displayName}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono truncate">{t.name}</p>
                    </div>
                    <Badge variant="outline" className={t.kind === "custom" ? "bg-primary/10 text-primary border-primary/30" : t.edited ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : ""}>
                      {t.kind === "custom" ? "Custom" : t.edited ? "Built-in (edited)" : "Built-in"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm line-clamp-2"><span className="text-muted-foreground">Subject:</span> {t.subject}</p>
                  {sampleSummary && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      Sample tags: <span className="font-mono text-foreground">{sampleSummary}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {t.kind === "custom" && t.id && (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => { setEditingId(t.id!); setEditorOpen(true); }}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    )}
                    {t.kind === "builtin" && (
                      <Button
                        size="sm" variant="outline"
                        onClick={async () => {
                          try {
                            const res: any = await openBuiltinOverride({ data: { name: t.name } });
                            setEditingId(res.id);
                            setEditorOpen(true);
                          } catch (e: any) {
                            toast.error(e?.message ?? "Couldn't open template");
                          }
                        }}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    )}
                    <Button
                      size="sm" variant="outline"
                      onClick={() => { setTestTemplate(t.name); setTestOpen(true); }}
                    >
                      <Send className="size-3.5" /> Send test
                    </Button>
                  </div>
                </CardContent>
              </Card>
              );
            })}
            {templates.length === 0 && <p className="text-sm text-muted-foreground">No templates yet. Click "New template" to create one.</p>}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Edits to built-in templates are stored as overrides and used in place of the code defaults. Delete the override from the editor to revert to the built-in.
          </p>
        </TabsContent>


        <TabsContent value="triggers" className="mt-4">
          <EmailTriggers templates={templates.map((t) => ({ name: t.name, displayName: t.displayName }))} />
        </TabsContent>

        <TabsContent value="send" className="mt-4">
          <EmailManualSend templates={templates.map((t) => ({ name: t.name, displayName: t.displayName }))} />
        </TabsContent>

        <TabsContent value="suppressed" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppressed.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No suppressed addresses</TableCell></TableRow>
                  ) : suppressed.map((s, i) => (
                    <TableRow key={s.email + i}>
                      <TableCell className="text-sm">{s.email}</TableCell>
                      <TableCell><Badge variant="outline">{s.reason}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(s.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">
            Suppressed addresses won't receive emails. Bounces, complaints, and unsubscribes appear here automatically.
          </p>
        </TabsContent>
      </Tabs>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Template: <code className="font-mono">{testTemplate}</code>
            </p>
            <Input
              type="email" value={testEmailAddr}
              onChange={(e) => setTestEmailAddr(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button onClick={handleSendTest} disabled={testBusy || !testEmailAddr}>
              {testBusy ? "Sending…" : "Send test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomEmailEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialId={editingId}
        onSaved={() => { loadTemplates(); loadAll(); }}
      />
    </div>
  );
}


function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-md bg-muted p-2">{icon}</div>
      </CardContent>
    </Card>
  );
}
