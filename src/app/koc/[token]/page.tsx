import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getKocByToken } from "@/lib/actions/koc";
import VideoForm from "@/components/koc/video-form";
import StatusCard from "@/components/koc/status-card";

export const metadata: Metadata = {
  title: "KOC CityAds",
};

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

        {["in_progress", "waiting_video", "need_revision", "sample_received",
          "client_approved", "waiting_address", "draft", "sent_to_client",
          "address_submitted", "waiting_sample_sent", "sample_sent",
          "video_submitted"
        ].includes(koc.operation_status) ? (
          <VideoForm
            token={token}
            isRevision={koc.operation_status === "need_revision"}
            revisionNote={koc.revision_note}
          />
        ) : (
          <StatusCard operationStatus={koc.operation_status} />
        )}
      </div>
    </div>
  );
}
