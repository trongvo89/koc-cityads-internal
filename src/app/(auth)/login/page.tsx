import { LoginForm } from "@/components/shared/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập — KOC CityAds",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">KOC CityAds</h1>
          <p className="mt-2 text-sm text-zinc-500">Đăng nhập để tiếp tục</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
