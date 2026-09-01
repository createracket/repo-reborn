import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/report-metrics-worker")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!key || !token || token !== key) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const { processJob } = await import("@/lib/report-metrics-worker.server");
          const result = await processJob();
          // Chain the next batch only while work remains.
          if (result.claimed && result.remaining > 0) {
            const origin = new URL(request.url).origin;
            void fetch(`${origin}/api/public/hooks/report-metrics-worker`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
              body: "{}",
            }).catch(() => {});
          }
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("[metrics-worker] failed", e);
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
