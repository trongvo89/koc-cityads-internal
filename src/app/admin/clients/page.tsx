import type { Metadata } from "next";
import { getClients } from "@/lib/actions/clients";
import ClientsPageClient from "@/components/admin/clients-page-client";

export const metadata: Metadata = {
  title: "Clients — KOC CityAds",
};

export default async function ClientsPage() {
  const result = await getClients();
  const clients = result.success ? result.data : [];

  return (
    <div>
      <ClientsPageClient clients={clients} />
    </div>
  );
}
