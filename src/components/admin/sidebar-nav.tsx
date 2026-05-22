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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/enums";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/kocs", label: "KOCs", icon: Users },
  { href: "/admin/proposals", label: "Proposals", icon: FileText },
  { href: "/admin/clients", label: "Clients", icon: Building2 },
];

const SUPER_ITEMS = [
  { href: "/admin/reports", label: "Thống kê", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: UserCog },
];

export default function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = role === "super_admin" ? [...NAV_ITEMS, ...SUPER_ITEMS] : NAV_ITEMS;

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
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
