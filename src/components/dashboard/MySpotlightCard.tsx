import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PlannerTile } from "@/components/dashboard/PlannerTile";
import { getMySpotlight } from "@/lib/talent-intake.functions";

/** Dashboard card for users an admin has allowed to have a spotlight. */
export function MySpotlightCard({ visibleSlugs }: { visibleSlugs: string[] }) {
  const fetchIt = useServerFn(getMySpotlight);
  const { data } = useQuery({ queryKey: ["my-spotlight"], queryFn: () => fetchIt() });
  if (!data?.enabled) return null;

  if (data.state === "live") {
    const p = data.page;
    if (visibleSlugs.includes(p.slug)) return null;
    return (
      <li>
        <Link to="/spotlight/$slug" params={{ slug: p.slug }} className="block h-full">
          <PlannerTile
            thumb={p.header_image_url}
            title={p.headline}
            subtitle={p.subtitle}
            label="Your spotlight"
            trailing={<span className="inline-flex items-center rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-shadow hover:ring-2 hover:ring-primary/70">View spotlight</span>}
          />
        </Link>
      </li>
    );
  }

  return (
    <li>
      <PlannerTile
        interactive={false}
        title="Your spotlight"
        label="Spotlight"
        subtitle={data.state === "review" ? "The Racket team is reviewing your spotlight." : "Build your spotlight page so brands can see what you're about."}
        trailing={data.state === "form" ? (
          <Button asChild size="sm">
            <a href={`/talent/${data.token}`}><Sparkles className="mr-1 size-4" /> Start your spotlight</a>
          </Button>
        ) : <span className="text-xs text-muted-foreground">In review</span>}
      />
    </li>
  );
}
