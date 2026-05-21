"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ClientFormDialog from "@/components/admin/client-form-dialog";
import type { ClientListItem } from "@/lib/actions/clients";

export default function ClientsPageClient({
  clients,
}: {
  clients: ClientListItem[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientListItem | undefined>();

  function openEdit(client: ClientListItem) {
    setEditingClient(client);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingClient(undefined);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clients</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {clients.length} clients / nhãn hàng
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm client
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {clients.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            Chưa có client nào.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Công ty
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Người liên hệ
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Liên hệ
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Campaigns
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                  Trạng thái
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.client_id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{c.company_name}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{c.contact_name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    <div>{c.email ?? "—"}</div>
                    {c.phone && (
                      <div className="text-xs text-zinc-400">{c.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {c.campaign_count}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={c.status === "active" ? "success" : "secondary"}
                    >
                      {c.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ClientFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        client={editingClient}
      />
    </>
  );
}
