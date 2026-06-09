export default function InvalidApplyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <h1 className="text-xl font-bold text-zinc-800 mb-2">Link không hợp lệ</h1>
        <p className="text-sm text-zinc-500">
          Link đăng ký này không tồn tại hoặc đã hết hạn. Vui lòng liên hệ CityAds để được hỗ trợ.
        </p>
      </div>
    </div>
  );
}
