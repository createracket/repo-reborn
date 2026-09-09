import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth, isAdminUser } from "@/hooks/use-auth";

/**
 * Floating "Edit page" shortcut rendered only for admin users.
 * Links a public page (roster, report, brief, spotlight) to its builder.
 */
export function AdminEditButton({ href, label = "Edit page" }: { href: string; label?: string }) {
  const { userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    isAdminUser(userId).then((v) => {
      if (active) setIsAdmin(v);
    });
    return () => {
      active = false;
    };
  }, [userId]);

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
