import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Link không hợp lệ — KOC CityAds",
};

interface Props {
  searchParams: Promise<{ reason?: string }>;
}

export default async function InvalidLinkPage({ searchParams }: Props) {
  const params = await searchParams;
  const isExpired = params.reason === "expired";

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-zinc-900 mb-2">
          {isExpired ? "Link đã hết hạn" : "Link không hợp lệ"}
        </h1>

        <p className="text-zinc-500 text-sm leading-relaxed">
          {isExpired
            ? "Link này đã hết hạn sử dụng (hiệu lực 7 ngày). Vui lòng liên hệ team CityAds để nhận link mới."
            : "Link này không tồn tại hoặc đã bị xóa. Vui lòng kiểm tra lại tin nhắn và thử lại."}
        </p>

        <p className="mt-6 text-xs text-zinc-400">
          Cần hỗ trợ? Liên hệ team CityAds qua Zalo hoặc email.
        </p>
      </div>
    </div>
  );
}
