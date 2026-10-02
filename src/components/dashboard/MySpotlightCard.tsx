import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMySpotlight } from "@/lib/talent-intake.functions";

/** Dashboard card for users an admin has allowed to have a spotlight. */
export function MySpotlightCard() {
  const fetchIt = useServerFn(getMySpotlight);
  const { data } = useQuery({ queryKey: ["my-spotlight"], queryFn: () => fetchIt() });
  if (!data?.enabled) return null;

  if (data.state === "live") {
    const p = data.page;
    return (
      <Link to="/spotlight/$slug" params={{ slug: p.slug }} className="group mb-8 block">
        <Card className="overflow-hidden transition group-hover:ring-2 group-hover:ring-primary/60">
          {p.header_image_url ? (
            <img src={p.header_image_url} alt="" className="aspect-[21/9] w-full object-cover" loading="lazy" />
          ) : null}
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Your spotlight</p>
            <p className="mt-1 font-display text-2xl">{p.headline}</p>
            {p.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p> : null}
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="mb-8">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-display text-2xl">Your spotlight</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.state === "review"
              ? "Thanks — the Racket team is reviewing your spotlight. It'll show here once it's live."
              : "Build your spotlight page so brands can see what you're about."}
          </p>
        </div>
        {data.state === "form" ? (
          <Button asChild>
            <a href={`/talent/${data.token}`}>
              <Sparkles className="mr-2 size-4" /> Start your spotlight
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
