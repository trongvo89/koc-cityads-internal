"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ScriptDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ScriptDetailError]", error);
  }, [error]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/livestream/scripts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">Lỗi tải kịch bản</h1>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
        <p className="text-sm font-semibold text-red-700">
          {error.message || "Đã xảy ra lỗi không xác định"}
        </p>
        {error.digest && (
          <p className="text-xs text-red-500 font-mono">digest: {error.digest}</p>
        )}
        {error.stack && (
          <pre className="text-xs text-red-600 bg-red-100 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
            {error.stack}
          </pre>
        )}
        <Button size="sm" onClick={reset}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}
