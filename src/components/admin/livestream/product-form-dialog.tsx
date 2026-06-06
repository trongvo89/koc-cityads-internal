"use client";

import { useState, useTransition } from "react";
import { Loader2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct, importProductFromCampaign } from "@/lib/actions/livestream";
import type { ProductListItem } from "@/lib/actions/livestream";

type Props = {
  open: boolean;
  product?: ProductListItem | null;
  campaigns: { campaign_id: string; campaign_name: string }[];
  mode: "create" | "edit" | "import";
  onClose: () => void;
};

export default function ProductFormDialog({ open, product, campaigns, mode, onClose }: Props) {
  const isEdit = mode === "edit";
  const isImport = mode === "import";
  const router = useRouter();

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [targetAudience, setTargetAudience] = useState(product?.target_audience ?? "");
  const [priceRange, setPriceRange] = useState(product?.price_range ?? "");
  const [usp, setUsp] = useState(product?.usp ?? "");
  const [features, setFeatures] = useState<string[]>(product?.key_features ?? [""]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  function resetForm() {
    setName(product?.name ?? "");
    setCategory(product?.category ?? "");
    setDescription(product?.description ?? "");
    setTargetAudience(product?.target_audience ?? "");
    setPriceRange(product?.price_range ?? "");
    setUsp(product?.usp ?? "");
    setFeatures(product?.key_features ?? [""]);
    setSelectedCampaign("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSave() {
    setError(null);

    if (isImport) {
      if (!selectedCampaign) {
        setError("Vui lòng chọn campaign");
        return;
      }
      startSave(async () => {
        const result = await importProductFromCampaign(selectedCampaign);
        if (result.success) { router.refresh(); handleClose(); }
        else setError(result.error);
      });
      return;
    }

    if (!name.trim()) {
      setError("Tên sản phẩm không được để trống");
      return;
    }

    const cleanFeatures = features.filter((f) => f.trim());
    const data = {
      name,
      category: category || undefined,
      description: description || undefined,
      key_features: cleanFeatures.length > 0 ? cleanFeatures : undefined,
      target_audience: targetAudience || undefined,
      price_range: priceRange || undefined,
      usp: usp || undefined,
      sourced_from: "manual" as const,
    };

    startSave(async () => {
      const result = isEdit
        ? await updateProduct(product!.product_id, data)
        : await createProduct(data);
      if (result.success) { router.refresh(); handleClose(); }
      else setError(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isImport ? "Import từ Campaign" : isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isImport ? (
            <div className="space-y-2">
              <Label>Chọn campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.campaign_id} value={c.campaign_id}>
                      {c.campaign_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                Brief của campaign sẽ được copy làm mô tả sản phẩm. Bạn có thể chỉnh lại sau.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="product-name">Tên sản phẩm *</Label>
                <Input
                  id="product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tên sản phẩm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ngành hàng</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="VD: Mỹ phẩm, Thời trang..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mức giá</Label>
                  <Input
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    placeholder="VD: 200K - 500K"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mô tả sản phẩm</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn về sản phẩm..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Điểm nổi bật</Label>
                {features.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={f}
                      onChange={(e) => {
                        const next = [...features];
                        next[i] = e.target.value;
                        setFeatures(next);
                      }}
                      placeholder={`Điểm nổi bật ${i + 1}`}
                    />
                    {features.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFeatures(features.filter((_, j) => j !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFeatures([...features, ""])}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Thêm điểm
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Đối tượng khách hàng</Label>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="VD: Nữ 18-30 tuổi, quan tâm làm đẹp..."
                />
              </div>

              <div className="space-y-2">
                <Label>USP (Điểm khác biệt)</Label>
                <Input
                  value={usp}
                  onChange={(e) => setUsp(e.target.value)}
                  placeholder="Điểm nổi bật duy nhất so với đối thủ..."
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>Hủy</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isImport ? "Import" : isEdit ? "Lưu" : "Thêm sản phẩm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
