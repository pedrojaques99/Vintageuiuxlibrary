"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type Assignee = { id: string; name: string; avatarUrl?: string };

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Stacked avatar group for the team co-owners of an issue. Clean and compact:
 * overlapping circles with a ring cutout, capped at `max` with a "+N" overflow.
 * Render only when it adds signal (the caller decides — e.g. only co-owned tasks).
 */
export function AssigneeStack({
  assignees,
  max = 4,
  size = "sm",
  className,
}: {
  assignees: Assignee[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!assignees?.length) return null;

  const visible = assignees.slice(0, max);
  const extra = assignees.length - visible.length;
  const dim = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  const names = assignees.map((a) => a.name).join(", ");

  return (
    <div
      className={cn("flex items-center -space-x-1.5", className)}
      title={names}
      role="img"
      aria-label={`Colaboradores: ${names}`}
    >
      {visible.map((a) => (
        <Avatar key={a.id} className={cn(dim, "ring-2 ring-card")}>
          {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt={a.name} />}
          <AvatarFallback className="text-xs font-semibold">
            {initials(a.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span
          className={cn(
            dim,
            "z-10 flex items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-card"
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
