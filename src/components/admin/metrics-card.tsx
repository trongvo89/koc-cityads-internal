import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Color = "blue" | "yellow" | "orange" | "purple" | "green" | "red" | "zinc";

const colorMap: Record<Color, { bg: string; icon: string }> = {
  blue: { bg: "bg-blue-50", icon: "text-blue-500" },
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-500" },
  orange: { bg: "bg-orange-50", icon: "text-orange-500" },
  purple: { bg: "bg-purple-50", icon: "text-purple-500" },
  green: { bg: "bg-green-50", icon: "text-green-600" },
  red: { bg: "bg-red-50", icon: "text-red-500" },
  zinc: { bg: "bg-zinc-100", icon: "text-zinc-500" },
};

export default function MetricsCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  href,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: Color;
  href?: string;
}) {
  const c = colorMap[color];
  const content = (
    <div className="bg-white rounded-lg border border-zinc-200 p-5 flex items-start justify-between hover:border-zinc-300 transition-colors">
      <div>
        <p className="text-sm text-zinc-500">{title}</p>
        <p className="text-3xl font-bold text-zinc-900 mt-1">{value}</p>
      </div>
      <div className={cn("p-2.5 rounded-lg flex-shrink-0", c.bg)}>
        <Icon className={cn("h-5 w-5", c.icon)} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
