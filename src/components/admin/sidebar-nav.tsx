"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Building2,
  UserCog,
  BarChart3,
  FileText,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/enums";

const NAV_ITEMS = [
  { href: "/admin/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin/campaigns",  label: "Campaigns",    icon: Megaphone },
  { href: "/admin/kocs",       label: "KOCs",         icon: Users },
  { href: "/admin/proposals",  label: "Proposals",    icon: FileText },
  { href: "/admin/clients",    label: "Clients",      icon: Building2 },
  { href: "/admin/livestream", label: "AI Livestream", icon: Radio },
];

const STATS_ITEMS = [
  { href: "/admin/reports", label: "Thống kê", icon: BarChart3 },
];

const USERS_ITEMS = [
  { href: "/admin/users", label: "Users", icon: UserCog },
];

export default function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = [
    ...NAV_ITEMS,
    ...(role === "super_admin" || role === "admin" ? USERS_ITEMS : []),
    ...(role === "super_admin" ? STATS_ITEMS : []),
  ];

  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
              isActive
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
            )}
            style={isActive ? {
              background: "linear-gradient(135deg, rgba(255,0,80,0.12) 0%, rgba(121,40,202,0.12) 100%)",
              border: "1px solid rgba(255,0,80,0.2)",
            } : undefined}
          >
            <Icon
              className={cn(
                "h-4 w-4 flex-shrink-0 transition-colors",
                isActive ? "text-[#ff0050]" : "text-zinc-500 group-hover:text-zinc-600"
              )}
            />
            {item.label}
            {isActive && (
              <span
                className="absolute right-2.5 h-1.5 w-1.5 rounded-full"
                style={{ background: "linear-gradient(135deg, #ff0050, #7928ca)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
