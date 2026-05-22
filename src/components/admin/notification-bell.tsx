"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, X, ExternalLink } from "lucide-react";
import type { AdminNotifications } from "@/lib/actions/notifications";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function NotificationBell({
  notifications,
}: {
  notifications: AdminNotifications;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const { groups, total } = notifications;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center h-7 w-7 rounded-md hover:bg-zinc-100 transition-colors"
        title="Thông báo"
        aria-label="Thông báo"
      >
        <Bell className="h-4 w-4 text-zinc-500" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-50 w-80 bg-white rounded-xl border border-zinc-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-800">Thông báo</h3>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {total === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Không có thông báo mới</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {groups.map((group) => (
                  <div key={group.type}>
                    <div className="px-4 py-2 bg-zinc-50 flex items-center gap-1.5">
                      <span className="text-sm">{group.emoji}</span>
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                        {group.label}
                      </span>
                      <span className="ml-auto text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full font-medium">
                        {group.items.length}
                      </span>
                    </div>
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 truncate group-hover:text-blue-600">
                            {item.title}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                            {item.detail}
                          </p>
                          {item.time && (
                            <p className="text-[10px] text-zinc-400 mt-1">{timeAgo(item.time)}</p>
                          )}
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-zinc-300 group-hover:text-blue-400 flex-shrink-0 mt-0.5" />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {total > 0 && (
            <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50 text-center">
              <p className="text-[11px] text-zinc-400">Tự động cập nhật khi chuyển trang</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
