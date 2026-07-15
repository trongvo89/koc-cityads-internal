import { redirect } from "next/navigation";
import { headers } from "next/headers";

// proxy.ts already redirects "/" before this ever renders — this is just a
// safety net. Reads the role proxy resolved instead of re-querying, so this
// can never disagree with proxy and cause a redirect loop.
export default async function RootPage() {
  const roleHeader = (await headers()).get("x-koc-role");
  if (roleHeader === "client") redirect("/client/dashboard");
  if (roleHeader) redirect("/admin/dashboard");
  redirect("/login");
}
