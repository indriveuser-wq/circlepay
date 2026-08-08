import { cn } from "@/lib/utils";
import { initials } from "@/lib/hooks";
import type { Profile } from "@/lib/db";

export function PersonAvatar({
  profile,
  name,
  size = "md",
  className,
}: {
  profile?: Profile | undefined;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const label = profile?.name || profile?.username || name || "?";
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-sm",
    xl: "h-20 w-20 text-lg",
  } as const;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground ring-1 ring-border",
        sizes[size],
        className,
      )}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img
          src={profile.avatar_url}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        initials(label) || "?"
      )}
    </span>
  );
}
