"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAddress } from "@/lib/actions/koc";

const PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng",
  "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
  "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
  "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng",
  "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
  "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
  "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
  "Thừa Thiên Huế", "Tiền Giang", "TP Hồ Chí Minh", "Trà Vinh",
  "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

export default function AddressForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data = {
      receiver_name: (fd.get("receiver_name") as string).trim(),
      receiver_phone: (fd.get("receiver_phone") as string).trim(),
      receiver_address: (fd.get("receiver_address") as string).trim(),
      receiver_province: fd.get("receiver_province") as string,
      address_note: ((fd.get("address_note") as string) || "").trim() || undefined,
    };

    if (!data.receiver_name || !data.receiver_phone || !data.receiver_address || !data.receiver_province) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }

    startTransition(async () => {
      const result = await submitAddress(token, data);
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Đã ghi nhận!</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Địa chỉ của bạn đã được lưu. Team CityAds sẽ gửi hàng mẫu trong thời gian sớm nhất.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-900 mb-1">Điền địa chỉ nhận hàng</h2>
      <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
        Vui lòng điền chính xác để chúng tôi gửi hàng mẫu cho bạn.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="receiver_name" className="text-sm font-medium text-zinc-700">
            Họ tên người nhận <span className="text-red-500">*</span>
          </Label>
          <Input
            id="receiver_name"
            name="receiver_name"
            placeholder="Nguyễn Văn A"
            className="mt-1.5"
            autoComplete="name"
          />
        </div>

        <div>
          <Label htmlFor="receiver_phone" className="text-sm font-medium text-zinc-700">
            Số điện thoại <span className="text-red-500">*</span>
          </Label>
          <Input
            id="receiver_phone"
            name="receiver_phone"
            type="tel"
            placeholder="0912 345 678"
            className="mt-1.5"
            autoComplete="tel"
          />
        </div>

        <div>
          <Label htmlFor="receiver_address" className="text-sm font-medium text-zinc-700">
            Địa chỉ cụ thể <span className="text-red-500">*</span>
          </Label>
          <Input
            id="receiver_address"
            name="receiver_address"
            placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
            className="mt-1.5"
            autoComplete="street-address"
          />
        </div>

        <div>
          <Label htmlFor="receiver_province" className="text-sm font-medium text-zinc-700">
            Tỉnh / Thành phố <span className="text-red-500">*</span>
          </Label>
          <select
            id="receiver_province"
            name="receiver_province"
            defaultValue=""
            className="mt-1.5 flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 md:text-sm"
          >
            <option value="" disabled>Chọn tỉnh/thành phố...</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="address_note" className="text-sm font-medium text-zinc-700">
            Ghi chú (không bắt buộc)
          </Label>
          <Textarea
            id="address_note"
            name="address_note"
            placeholder="Hướng dẫn giao hàng thêm (nếu có)..."
            rows={2}
            className="mt-1.5 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          className="w-full h-11 text-base"
          disabled={isPending}
        >
          {isPending ? "Đang lưu..." : "Gửi địa chỉ"}
        </Button>
      </form>
    </div>
  );
}
