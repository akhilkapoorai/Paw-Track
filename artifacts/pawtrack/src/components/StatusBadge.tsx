import { cn } from "@/lib/utils";

interface Props {
  status: "LOST" | "FOUND" | "REUNITED";
  className?: string;
}

const config = {
  LOST: { label: "Lost", classes: "bg-red-100 text-red-700 border-red-200" },
  FOUND: { label: "Found", classes: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  REUNITED: { label: "Reunited", classes: "bg-green-100 text-green-700 border-green-200" },
};

export function StatusBadge({ status, className }: Props) {
  const { label, classes } = config[status] ?? config.LOST;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        classes,
        className,
      )}
    >
      {status === "LOST" && (
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
      {label}
    </span>
  );
}
