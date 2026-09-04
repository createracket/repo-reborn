import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Floating "Edit page" shortcut rendered only for admin users.
 * Links a public page (roster, report, brief, spotlight) to its builder.
 */
export function AdminEditButton({ href, label = "Edit page" }: { href: string; label?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async (userId: string | undefined) => {
      if (!userId) {
        if (active) setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (active) setIsAdmin(!!data);
    };
    supabase.auth.getSession().then(({ data }) => check(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => check(session?.user.id));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Button asChild size="sm" className="fixed right-4 top-20 z-40 gap-1.5 shadow-lg">
      <a href={href}>
        <Pencil className="size-3.5" />
        {label}
      </a>
    </Button>
  );
}
