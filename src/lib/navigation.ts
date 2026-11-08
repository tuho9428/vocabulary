export type View = "home" | "lesson" | "review" | "family" | "settings" | "help";

export function viewFromHash(hash: string, hasSession: boolean): View | null {
  const view = hash.slice(1);
  if (!["home", "lesson", "review", "family", "settings", "help"].includes(view))
    return null;
  return view === "lesson" && !hasSession ? "home" : view as View;
}
