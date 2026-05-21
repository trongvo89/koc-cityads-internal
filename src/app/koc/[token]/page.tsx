import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getKocByToken } from "@/lib/actions/koc";
import AddressForm from "@/components/koc/address-form";
import SampleConfirm from "@/components/koc/sample-confirm";
import VideoForm from "@/components/koc/video-form";
import StatusCard from "@/components/koc/status-card";

export const metadata: Metadata = {
  title: "KOC CityAds",
};

const ACTION_STATUSES = ["waiting_address", "sample_sent", "waiting_video", "need_revision"] as const;
type ActionStatus = (typeof ACTION_STATUSES)[number];

function isActionStatus(s: string): s is ActionStatus {
  return (ACTION_STATUSES as readonly string[]).includes(s);
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

        {koc.operation_status === "waiting_address" && (
          <AddressForm token={token} />
        )}

        {koc.operation_status === "sample_sent" && (
          <SampleConfirm token={token} />
        )}

        {(koc.operation_status === "waiting_video" ||
          koc.operation_status === "need_revision") && (
          <VideoForm
            token={token}
            isRevision={koc.operation_status === "need_revision"}
            revisionNote={koc.revision_note}
          />
        )}

        {!isActionStatus(koc.operation_status) && (
          <StatusCard operationStatus={koc.operation_status} />
        )}
      </div>
    </div>
  );
}
