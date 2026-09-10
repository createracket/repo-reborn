/** Admin tabs — each one is its own route so only that panel's code downloads. */
export const ADMIN_TABS = [
  { path: "/admin/project-planner", label: "Project planner", legacy: "planner" },
  { path: "/admin/traffic", label: "Traffic", legacy: "traffic" },
  { path: "/admin/emails", label: "Emails", legacy: "emails" },
  { path: "/admin/contact", label: "Contact", legacy: "contact" },
  { path: "/admin/community", label: "Community", legacy: "community" },
  { path: "/admin/users", label: "Users", legacy: "users" },
  { path: "/admin/mailing", label: "Mailing list", legacy: "mailing" },
  { path: "/admin/brief-form", label: "Brief Form", legacy: "brief-form" },
  { path: "/admin/spotlights", label: "Spotlights", legacy: "spotlights" },
  { path: "/admin/vibe-check", label: "Vibe Check", legacy: "vibe" },
  { path: "/admin/faqs", label: "FAQs", legacy: "faqs" },
  { path: "/admin/sound-board", label: "Sound Board", legacy: "sound-board" },
  { path: "/admin/usage", label: "Usage", legacy: "usage" },
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

/** Map an old `?tab=` value onto its new route path. */
export function legacyTabPath(tab: string | undefined): string {
  const hit = ADMIN_TABS.find((t) => t.legacy === tab);
  return hit?.path ?? "/admin/traffic";
}
