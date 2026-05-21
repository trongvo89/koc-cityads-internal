import type { Tables } from "./database.types";
import type { UserRole } from "./enums";

export type Profile = Tables<"profiles">;
export type Client = Tables<"clients">;
export type Campaign = Tables<"campaigns">;
export type Koc = Tables<"kocs">;
export type CampaignKoc = Tables<"campaign_kocs">;
export type Notification = Tables<"notifications">;
export type ClientCampaignKocView = Tables<"client_campaign_kocs_view">;
export type KocActiveCampaignCount = Tables<"koc_active_campaign_counts">;

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  clientId: string | null;
};

export type KocTokenData = {
  campaign_koc_id: string;
  campaign_name: string;
  koc_name: string;
  operation_status: string;
  address_status: string;
  sample_status: string;
  content_status: string;
  deadline_date: string | null;
  revision_note: string | null;
};
