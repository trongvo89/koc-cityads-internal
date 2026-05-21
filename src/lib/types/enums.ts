import type { Enums } from "./database.types";

export type UserRole = Enums<"user_role">;
export type CampaignStatus = Enums<"campaign_status">;
export type KocStatus = Enums<"koc_status">;
export type OperationStatus = Enums<"operation_status">;
export type ClientApprovalStatus = Enums<"client_approval_status">;
export type AddressStatus = Enums<"address_status">;
export type SampleStatus = Enums<"sample_status">;
export type ContentStatus = Enums<"content_status">;
export type FinalStatus = Enums<"final_status">;
export type NotificationChannel = Enums<"notification_channel">;
export type NotificationStatus = Enums<"notification_status">;
export type NotificationType = Enums<"notification_type">;

export const USER_ROLES: UserRole[] = ["super_admin", "admin", "operator", "client"];
export const INTERNAL_ROLES: UserRole[] = ["super_admin", "admin", "operator"];
export const CAMPAIGN_STATUSES: CampaignStatus[] = ["draft", "active", "completed", "paused", "cancelled"];
export const KOC_STATUSES: KocStatus[] = ["active", "inactive", "blacklisted"];
export const OPERATION_STATUSES: OperationStatus[] = [
  "draft", "sent_to_client", "client_approved", "client_rejected",
  "waiting_address", "address_submitted", "waiting_sample_sent",
  "sample_sent", "sample_received", "waiting_video",
  "video_submitted", "need_revision", "video_approved", "completed", "failed",
];
