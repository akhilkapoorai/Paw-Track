import { cn } from "@/lib/utils";

interface Props {
  status: "LOST" | "FOUND" | "REUNITED";
  className?: string;
}

const config = {
  LOST: {
    label: "LOST",
    classes: "bg-red-50 text-red-500 border border-red-200",
    dot: "bg-red-500",
  },
  FOUND: {
    label: "FOUND",
    classes: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    dot: null,
  },
  REUNITED: {
    label: "REUNITED",
    classes: "bg-violet-50 text-violet-600 border border-violet-200",
    dot: null,
  },
};

export function StatusBadge({ status, className }: Props) {
  const { label, classes, dot } = config[status] ?? config.LOST;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide",
        classes,
        className,
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", dot)} />
      )}
      {label}
    </span>
  );
}
