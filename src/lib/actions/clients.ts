"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";

export type ClientListItem = {
  client_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  campaign_count: number;
  created_at: string;
};

export async function getClients(): Promise<ActionResult<ClientListItem[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("client_id, company_name, contact_name, email, phone, status, created_at, campaigns(count)")
    .order("company_name");

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: (data ?? []).map((c) => ({
      client_id: c.client_id,
      company_name: c.company_name,
      contact_name: c.contact_name,
      email: c.email,
      phone: c.phone,
      status: c.status,
      created_at: c.created_at,
      campaign_count: Number((c.campaigns as unknown as [{ count: number }])[0]?.count ?? 0),
    })),
  };
}

const ClientSchema = z.object({
  company_name: z.string().min(1, "Tên công ty không được trống"),
  contact_name: z.string().nullable().optional(),
  email: z
    .string()
    .email("Email không hợp lệ")
    .nullable()
    .optional()
    .or(z.literal("")),
  phone: z.string().nullable().optional(),
  status: z.string(),
});

export type ClientFormData = z.infer<typeof ClientSchema>;

export async function createClientRecord(
  formData: ClientFormData
): Promise<ActionResult<{ client_id: string }>> {
  const parsed = ClientSchema.safeParse(formData);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const data = { ...parsed.data, email: parsed.data.email || null };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("clients")
    .insert(data)
    .select("client_id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/clients");
  revalidatePath("/admin/campaigns/new");
  return { success: true, data: { client_id: created.client_id } };
}

export async function updateClientRecord(
  clientId: string,
  formData: Partial<ClientFormData>
): Promise<ActionResult> {
  const data = { ...formData, email: formData.email || null };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(data)
    .eq("client_id", clientId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/clients");
  return { success: true, data: undefined };
}
