"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/client/dashboard",
    label: "Tổng quan",
    icon: BarChart3,
  },
  {
    href: "/client/campaigns",
    label: "Campaigns",
    icon: ClipboardList,
  },
];

export default function ClientNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/client/dashboard"
            ? pathname === "/client/dashboard"
            : pathname.startsWith(item.href);
        const showBadge = item.href === "/client/campaigns" && pendingCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              isActive
                ? "text-white bg-white/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
            {showBadge && (
              <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
