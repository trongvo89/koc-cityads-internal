import { notFound } from "next/navigation";
import { getTeleprompterData } from "@/lib/actions/livestream";
import TeleprompterClient from "./teleprompter-client";

export default async function TeleprompterPage({
  params,
}: {
  params: Promise<{ session_id: string }>;
}) {
  const { session_id } = await params;
  const result = await getTeleprompterData(session_id);
  if (!result.success) notFound();
  return <TeleprompterClient data={result.data} />;
}
