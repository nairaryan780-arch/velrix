import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { ConversationStatus, LeadStatus, MessageAuthor, NotificationKind } from "./constants";
import { cancelFollowUpsForConversation, scheduleFollowUps } from "./followups";
import { createNotification } from "./notifications";
import { bumpAnalytics } from "./analytics";
import { deliverOutbound } from "./channels/deliver";
import { audit } from "./audit";
import { notFound } from "./http";

async function loadConversation(organizationId: string, conversationId: string) {
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { lead: true },
  });
  if (!convo) throw notFound("Conversation not found");
  return convo;
}

/**
 * Human takes over a conversation. This is the hard stop: the AI will not reply
 * again (runAgentTurn returns stopped for HUMAN_TAKEOVER), follow-ups are
 * cancelled, and the lead is marked handed off.
 */
export async function takeoverConversation(organizationId: string, conversationId: string, userId: string) {
  const convo = await loadConversation(organizationId, conversationId);
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { status: ConversationStatus.HUMAN_TAKEOVER, assignedToId: userId },
  });
  await prisma.lead.update({
    where: { id: convo.leadId },
    data: {
      status: convo.lead.status === LeadStatus.WON || convo.lead.status === LeadStatus.LOST ? convo.lead.status : LeadStatus.HANDED_OFF,
      assignedToId: convo.lead.assignedToId ?? userId,
    },
  });
  await cancelFollowUpsForConversation(convo.id);
  await bumpAnalytics(organizationId, { handoffs: 1 });
  await prisma.message.create({
    data: { conversationId: convo.id, organizationId, author: MessageAuthor.SYSTEM, body: "A team member joined the conversation.", metaJson: { system: "takeover" } },
  });
  await audit({ action: "conversation.takeover", organizationId, userId, entity: "conversation", entityId: convo.id });
  return { ok: true };
}

/** Returns control to the AI. */
export async function releaseConversation(organizationId: string, conversationId: string, userId: string) {
  const convo = await loadConversation(organizationId, conversationId);
  const sequence = await prisma.followUpSequence.findFirst({ where: { organizationId, active: true } });
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { status: ConversationStatus.AI_ACTIVE },
  });
  await prisma.message.create({
    data: { conversationId: convo.id, organizationId, author: MessageAuthor.SYSTEM, body: "Velrix resumed the conversation.", metaJson: { system: "release" } },
  });
  if (!convo.optOut) await scheduleFollowUps(convo.id, sequence?.id);
  await audit({ action: "conversation.release", organizationId, userId, entity: "conversation", entityId: convo.id });
  return { ok: true };
}

export async function closeConversation(organizationId: string, conversationId: string, userId: string) {
  const convo = await loadConversation(organizationId, conversationId);
  await prisma.conversation.update({ where: { id: convo.id }, data: { status: ConversationStatus.CLOSED } });
  await cancelFollowUpsForConversation(convo.id);
  await audit({ action: "conversation.close", organizationId, userId, entity: "conversation", entityId: convo.id });
  return { ok: true };
}

export async function assignConversation(organizationId: string, conversationId: string, assignedToId: string | null, userId: string) {
  const convo = await loadConversation(organizationId, conversationId);
  if (assignedToId) {
    const member = await prisma.membership.findFirst({ where: { organizationId, userId: assignedToId } });
    if (!member) throw notFound("That team member is not in this workspace");
  }
  await prisma.conversation.update({ where: { id: convo.id }, data: { assignedToId } });
  await prisma.lead.update({ where: { id: convo.leadId }, data: { assignedToId } });
  await audit({ action: "conversation.assign", organizationId, userId, entity: "conversation", entityId: convo.id, meta: { assignedToId } });
  return { ok: true };
}

/**
 * A human agent sends a message. Requires the conversation to be in human
 * takeover (so the AI and a human never both reply). Delivered on the channel.
 */
export async function humanMessage(organizationId: string, conversationId: string, body: string, userId: string) {
  const convo = await loadConversation(organizationId, conversationId);
  if (convo.status !== ConversationStatus.HUMAN_TAKEOVER) {
    await prisma.conversation.update({ where: { id: convo.id }, data: { status: ConversationStatus.HUMAN_TAKEOVER, assignedToId: userId } });
    await cancelFollowUpsForConversation(convo.id);
  }
  const message = await prisma.message.create({
    data: { conversationId: convo.id, organizationId, author: MessageAuthor.HUMAN, body, metaJson: { userId } as Prisma.InputJsonValue },
  });
  await prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });
  await deliverOutbound(convo, body).catch(() => {});
  await audit({ action: "conversation.human_message", organizationId, userId, entity: "conversation", entityId: convo.id });
  return { ok: true, messageId: message.id };
}

export async function markLeadOutcome(organizationId: string, leadId: string, status: string, note: string | undefined, userId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } });
  if (!lead) throw notFound("Lead not found");
  await prisma.lead.update({ where: { id: lead.id }, data: { status, outcomeNote: note ?? lead.outcomeNote } });
  if (status === LeadStatus.WON) await bumpAnalytics(organizationId, { won: 1 });
  if (status === LeadStatus.LOST) await bumpAnalytics(organizationId, { lost: 1 });
  await createNotificationIfHandoff(organizationId, status, lead.name);
  await audit({ action: "lead.status", organizationId, userId, entity: "lead", entityId: lead.id, meta: { status } });
  return { ok: true };
}

async function createNotificationIfHandoff(organizationId: string, status: string, name: string | null) {
  if (status === LeadStatus.HANDED_OFF) {
    await createNotification({
      organizationId,
      kind: NotificationKind.HANDOFF,
      title: `Lead handed off: ${name ?? "Unknown"}`,
      body: "A lead is ready for a human to take over.",
    });
  }
}
