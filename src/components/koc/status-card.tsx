import { CheckCircle2, Clock, Video, Package, XCircle } from "lucide-react";
import type { Database } from "@/lib/types/database.types";

type OperationStatus = Database["public"]["Enums"]["operation_status"];

type StatusConfig = {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
};

const STATUS_CONFIG: Record<OperationStatus, StatusConfig> = {
  in_progress: {
    icon: <Clock className="w-7 h-7 text-blue-500" />,
    iconBg: "bg-blue-100",
    title: "Đang tiến hành",
    description: "Vui lòng nộp video khi sẵn sàng.",
  },
  draft: {
    icon: <Clock className="w-7 h-7 text-zinc-500" />,
    iconBg: "bg-zinc-100",
    title: "Đang chờ xử lý",
    description: "Campaign đang trong giai đoạn chuẩn bị. Team CityAds sẽ liên hệ bạn sớm.",
  },
  sent_to_client: {
    icon: <Clock className="w-7 h-7 text-blue-500" />,
    iconBg: "bg-blue-100",
    title: "Đang chờ duyệt",
    description: "Hồ sơ của bạn đang được xem xét. Chúng tôi sẽ thông báo khi có kết quả.",
  },
  client_approved: {
    icon: <CheckCircle2 className="w-7 h-7 text-green-600" />,
    iconBg: "bg-green-100",
    title: "Đã được chấp nhận!",
    description: "Bạn đã được chấp nhận vào campaign. Team CityAds sẽ liên hệ về bước tiếp theo.",
  },
  client_rejected: {
    icon: <XCircle className="w-7 h-7 text-red-500" />,
    iconBg: "bg-red-100",
    title: "Không phù hợp lần này",
    description: "Rất tiếc, bạn chưa phù hợp với campaign này. Hẹn gặp lại ở các campaign sau!",
  },
  waiting_address: {
    icon: <Clock className="w-7 h-7 text-zinc-500" />,
    iconBg: "bg-zinc-100",
    title: "Cần điền địa chỉ",
    description: "Vui lòng điền địa chỉ nhận hàng.",
  },
  address_submitted: {
    icon: <CheckCircle2 className="w-7 h-7 text-green-600" />,
    iconBg: "bg-green-100",
    title: "Địa chỉ đã được ghi nhận",
    description: "Chúng tôi đã nhận được địa chỉ của bạn và sẽ gửi hàng mẫu sớm nhất có thể.",
  },
  waiting_sample_sent: {
    icon: <Package className="w-7 h-7 text-zinc-500" />,
    iconBg: "bg-zinc-100",
    title: "Đang chuẩn bị hàng mẫu",
    description: "Team CityAds đang chuẩn bị gửi hàng mẫu cho bạn. Vui lòng chờ thông báo.",
  },
  sample_sent: {
    icon: <Package className="w-7 h-7 text-blue-500" />,
    iconBg: "bg-blue-100",
    title: "Hàng mẫu đã được gửi",
    description: "Hàng mẫu đang trên đường đến bạn. Vui lòng xác nhận khi nhận được.",
  },
  sample_received: {
    icon: <CheckCircle2 className="w-7 h-7 text-green-600" />,
    iconBg: "bg-green-100",
    title: "Đã nhận hàng mẫu",
    description: "Cảm ơn xác nhận! Team CityAds sẽ gửi brief video cho bạn sớm.",
  },
  waiting_video: {
    icon: <Video className="w-7 h-7 text-zinc-500" />,
    iconBg: "bg-zinc-100",
    title: "Chờ nộp video",
    description: "Vui lòng tạo video theo brief và nộp link qua trang này.",
  },
  video_submitted: {
    icon: <CheckCircle2 className="w-7 h-7 text-blue-500" />,
    iconBg: "bg-blue-100",
    title: "Video đã được nộp",
    description: "Team CityAds đang xem xét video của bạn. Chúng tôi sẽ phản hồi sớm.",
  },
  need_revision: {
    icon: <Clock className="w-7 h-7 text-yellow-600" />,
    iconBg: "bg-yellow-100",
    title: "Cần chỉnh sửa video",
    description: "Video cần được chỉnh sửa. Vui lòng đọc yêu cầu và nộp lại.",
  },
  video_approved: {
    icon: <CheckCircle2 className="w-7 h-7 text-green-600" />,
    iconBg: "bg-green-100",
    title: "Video đã được duyệt!",
    description: "Tuyệt vời! Video của bạn đã được chấp thuận. Campaign gần hoàn thành.",
  },
  completed: {
    icon: <CheckCircle2 className="w-7 h-7 text-green-600" />,
    iconBg: "bg-green-100",
    title: "Campaign hoàn thành!",
    description: "Cảm ơn bạn đã tham gia campaign. Hẹn gặp lại ở những campaign tiếp theo!",
  },
  failed: {
    icon: <XCircle className="w-7 h-7 text-red-500" />,
    iconBg: "bg-red-100",
    title: "Campaign đã kết thúc",
    description: "Campaign này đã kết thúc. Cảm ơn bạn đã tham gia.",
  },
  cancelled: {
    icon: <XCircle className="w-7 h-7 text-red-500" />,
    iconBg: "bg-red-100",
    title: "Đã huỷ",
    description: "Campaign này đã bị huỷ. Cảm ơn bạn đã tham gia.",
  },
};

export default function StatusCard({
  operationStatus,
}: {
  operationStatus: OperationStatus;
}) {
  const config = STATUS_CONFIG[operationStatus] ?? {
    icon: <Clock className="w-7 h-7 text-zinc-500" />,
    iconBg: "bg-zinc-100",
    title: "Đang xử lý",
    description: "Team CityAds sẽ liên hệ bạn sớm.",
  };

  return (
    <div className="text-center py-6">
      <div
        className={`w-14 h-14 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}
      >
        {config.icon}
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 mb-2">{config.title}</h2>
      <p className="text-sm text-zinc-500 leading-relaxed">{config.description}</p>
      <p className="mt-8 text-xs text-zinc-400">
        Cần hỗ trợ? Liên hệ team CityAds qua Zalo.
      </p>
    </div>
  );
}
