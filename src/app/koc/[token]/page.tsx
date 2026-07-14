import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getKocByToken } from "@/lib/actions/koc";
import VideoForm from "@/components/koc/video-form";
import StatusCard from "@/components/koc/status-card";
import AddressForm from "@/components/koc/address-form";
import SampleConfirm from "@/components/koc/sample-confirm";
import { Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "KOC CityAds",
};

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Địa chỉ", "Nhận hàng", "Nộp video"];
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((label, i) => {
        const idx = i + 1;
        const state = idx < current ? "done" : idx === current ? "current" : "pending";
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  state === "done"
                    ? "bg-green-500 text-white"
                    : state === "current"
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {idx}
              </div>
              <span
                className={`text-[10px] mt-1 ${
                  state === "current" ? "text-blue-700 font-medium" : "text-zinc-400"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < steps.length && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 ${state === "done" ? "bg-green-500" : "bg-zinc-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function KocTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await getKocByToken(token);
  if (!result.success) {
    redirect("/koc/invalid-link");
  }

  const koc = result.data;
  const isTerminal =
    koc.operation_status === "completed" || koc.operation_status === "cancelled";
  const isExternal = koc.operation_mode === "external";

  let body: React.ReactNode;

  if (isTerminal) {
    body = <StatusCard operationStatus={koc.operation_status} />;
  } else if (!isExternal) {
    // TikTok Seller flow — video submission only (current behavior).
    body = (
      <VideoForm
        token={token}
        isRevision={koc.content_status === "need_revision"}
        revisionNote={koc.revision_note}
      />
    );
  } else if (koc.address_status !== "submitted") {
    // External step 1 — collect shipping address.
    body = (
      <>
        <StepIndicator current={1} />
        <AddressForm token={token} />
      </>
    );
  } else if (koc.sample_status === "waiting") {
    // External step 2 (waiting) — address recorded, sample not shipped yet.
    body = (
      <>
        <StepIndicator current={2} />
        <div className="text-center py-8">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">
            Địa chỉ đã được ghi nhận!
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Hàng mẫu đang được chuẩn bị và sẽ gửi cho bạn sớm. Khi hàng được gửi,
            bạn sẽ thấy mã vận đơn tại đây.
          </p>
        </div>
      </>
    );
  } else if (koc.sample_status !== "received") {
    // External step 2 — sample shipped, confirm receipt.
    body = (
      <>
        <StepIndicator current={2} />
        {koc.shipping_code && (
          <div className="mb-4 rounded-lg bg-zinc-100 border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
            Mã vận đơn:{" "}
            <span className="font-semibold">{koc.shipping_code}</span>
            {koc.shipping_provider && (
              <span className="text-zinc-500"> · {koc.shipping_provider}</span>
            )}
          </div>
        )}
        <SampleConfirm token={token} />
      </>
    );
  } else {
    // External step 3 — sample received, submit the video.
    body = (
      <>
        <StepIndicator current={3} />
        <VideoForm
          token={token}
          isRevision={koc.content_status === "need_revision"}
          revisionNote={koc.revision_note}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-4 py-3">
        <p className="text-xs text-zinc-400">KOC CityAds</p>
        <h1 className="font-semibold text-zinc-900 text-sm truncate">
          {koc.campaign_name}
        </h1>
      </div>

      <div className="px-4 py-6 max-w-sm mx-auto">
        <div className="mb-6">
          <p className="text-lg font-bold text-zinc-900">Xin chào, {koc.koc_name}!</p>
          {koc.deadline_date && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Deadline:{" "}
              {new Date(koc.deadline_date).toLocaleDateString("vi-VN")}
            </p>
          )}
        </div>

        {body}
      </div>
    </div>
  );
}
