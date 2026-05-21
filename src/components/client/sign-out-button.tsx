"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ClientSignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
      onClick={handleSignOut}
    >
      <LogOut className="h-4 w-4 mr-2" />
      Đăng xuất
    </Button>
  );
}
