/**
 * Domain enums as typed constants.
 *
 * The Prisma schema stores these as String columns (not native DB enums) so the
 * exact same schema runs on SQLite in development and PostgreSQL in production.
 * These objects are the single source of truth for the allowed values and are
 * validated at the API boundary with zod. Import these instead of enum objects
 * from "@prisma/client".
 */

export const Role = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  SALESPERSON: "SALESPERSON",
  VIEWER: "VIEWER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const LeadTemperature = {
  HOT: "HOT",
  WARM: "WARM",
  COLD: "COLD",
} as const;
export type LeadTemperature = (typeof LeadTemperature)[keyof typeof LeadTemperature];

export const LeadStatus = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  QUALIFYING: "QUALIFYING",
  QUALIFIED: "QUALIFIED",
  HANDED_OFF: "HANDED_OFF",
  WON: "WON",
  LOST: "LOST",
  DORMANT: "DORMANT",
  OPTED_OUT: "OPTED_OUT",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const ConversationStatus = {
  OPEN: "OPEN",
  AI_ACTIVE: "AI_ACTIVE",
  HUMAN_TAKEOVER: "HUMAN_TAKEOVER",
  CLOSED: "CLOSED",
  DORMANT: "DORMANT",
} as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const MessageAuthor = {
  CUSTOMER: "CUSTOMER",
  AGENT: "AGENT",
  HUMAN: "HUMAN",
  SYSTEM: "SYSTEM",
} as const;
export type MessageAuthor = (typeof MessageAuthor)[keyof typeof MessageAuthor];

export const ChannelType = {
  WEBSITE: "WEBSITE",
  WHATSAPP: "WHATSAPP",
  INSTAGRAM: "INSTAGRAM",
  API: "API",
} as const;
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

export const ChannelStatus = {
  DISCONNECTED: "DISCONNECTED",
  CONNECTED: "CONNECTED",
  ERROR: "ERROR",
} as const;
export type ChannelStatus = (typeof ChannelStatus)[keyof typeof ChannelStatus];

export const KnowledgeType = {
  TEXT: "TEXT",
  FAQ: "FAQ",
  URL: "URL",
  PDF: "PDF",
  CATALOGUE: "CATALOGUE",
  PRICING: "PRICING",
  DOCUMENT: "DOCUMENT",
} as const;
export type KnowledgeType = (typeof KnowledgeType)[keyof typeof KnowledgeType];

export const KnowledgeStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  READY: "READY",
  FAILED: "FAILED",
} as const;
export type KnowledgeStatus = (typeof KnowledgeStatus)[keyof typeof KnowledgeStatus];

export const NotificationKind = {
  HOT_LEAD: "HOT_LEAD",
  HANDOFF: "HANDOFF",
  AGENT_ERROR: "AGENT_ERROR",
  INTEGRATION_FAILURE: "INTEGRATION_FAILURE",
  FOLLOWUP_ATTENTION: "FOLLOWUP_ATTENTION",
} as const;
export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

export const SubscriptionStatus = {
  INCOMPLETE: "INCOMPLETE",
  TRIALING: "TRIALING",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const PlanCode = {
  STARTER: "STARTER",
  GROWTH: "GROWTH",
  PRO: "PRO",
} as const;
export type PlanCode = (typeof PlanCode)[keyof typeof PlanCode];
