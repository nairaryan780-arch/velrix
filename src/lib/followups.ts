import { ConversationStatus, LeadStatus, MessageAuthor } from "./constants";
import { prisma } from "./db";
import { log } from "./logger";
import { bumpAnalytics } from "./analytics";
import { deliverOutbound } from "./channels/deliver";

export type FollowUpStep = { delayMinutes: number; message: string };

/**
 * Default inactivity ladder used when an organization has not customized one.
 * 2 hours, then 24 hours, then the conversation is marked dormant by the sweep.
 */
export const DEFAULT_FOLLOWUP_STEPS: FollowUpStep[] = [
  {
    delayMinutes: 120,
    message: "Just checking in — would you still like me to help with your enquiry? Happy to pick up where we left off.",
  },
  {
    delayMinutes: 24 * 60,
    message: "Following up once more in case you're still exploring options. I'm here whenever you're ready to continue.",
  },
];

export function parseSteps(stepsJson: unknown): FollowUpStep[] {
  const raw = Array.isArray(stepsJson)
    ? stepsJson
    : stepsJson && typeof stepsJson === "object" && Array.isArray((stepsJson as { steps?: unknown[] }).steps)
      ? (stepsJson as { steps: unknown[] }).steps
      : null;
  if (!raw) return DEFAULT_FOLLOWUP_STEPS;
  const steps = raw
    .filter((s): s is { delayMinutes?: unknown; message?: unknown } => Boolean(s) && typeof s === "object")
    .map((s) => ({
      delayMinutes: Number(s.delayMinutes) > 0 ? Number(s.delayMinutes) : 120,
      message: typeof s.message === "string" && s.message.trim() ? s.message.trim() : DEFAULT_FOLLOWUP_STEPS[0].message,
    }));
  return steps.length ? steps : DEFAULT_FOLLOWUP_STEPS;
}

/**
 * Cancels any pending follow-up jobs. Called whenever the customer replies,
 * a human takes over, or the conversation closes — so follow-ups never spam.
 */
export async function cancelFollowUpsForConversation(conversationId: string) {
  await prisma.followUpJob.updateMany({
    where: { conversationId, status: "scheduled" },
    data: { status: "canceled" },
  });
}

/**
 * (Re)schedules the full follow-up ladder for a conversation from "now".
 * The engine cancels + reschedules on every customer turn so timers reset.
 * Requires a sequence (jobs are FK-bound to one); no-ops if none is provided.
 */
export async function scheduleFollowUps(conversationId: string, sequenceId?: string) {
  if (!sequenceId) return;
  const sequence = await prisma.followUpSequence.findUnique({ where: { id: sequenceId } });
  if (!sequence || !sequence.active) return;

  const steps = parseSteps(sequence.stepsJson);
  const max = Math.min(steps.length, sequence.maxAttempts > 0 ? sequence.maxAttempts : steps.length);
  const now = Date.now();
  let cumulativeMinutes = 0;
  const data = [];
  for (let i = 0; i < max; i++) {
    cumulativeMinutes += steps[i].delayMinutes;
    data.push({
      sequenceId: sequence.id,
      conversationId,
      attempt: i + 1,
      runAt: new Date(now + cumulativeMinutes * 60_000),
      status: "scheduled",
    });
  }
  if (data.length) await prisma.followUpJob.createMany({ data });
}

export type FollowUpRunResult = { processed: number; sent: number; skipped: number; dormant: number };

/**
 * Processes all due follow-up jobs. Idempotent per job (status transition guards
 * against double-send). Invoked by the /api/cron/followups worker route.
 */
export async function runDueFollowUps(now = new Date(), limit = 100): Promise<FollowUpRunResult> {
  const due = await prisma.followUpJob.findMany({
    where: { status: "scheduled", runAt: { lte: now } },
    orderBy: { runAt: "asc" },
    take: limit,
    include: { conversation: { include: { lead: true, channel: true } }, sequence: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const job of due) {
    // Atomically claim the job so concurrent workers can't double-send.
    const claimed = await prisma.followUpJob.updateMany({
      where: { id: job.id, status: "scheduled" },
      data: { status: "processing" },
    });
    if (claimed.count === 0) continue;

    const convo = job.conversation;
    const stop =
      !convo ||
      convo.optOut ||
      convo.status === ConversationStatus.CLOSED ||
      convo.status === ConversationStatus.HUMAN_TAKEOVER;

    if (stop) {
      await prisma.followUpJob.update({ where: { id: job.id }, data: { status: "skipped" } });
      skipped++;
      continue;
    }

    // If the customer already replied (last message is theirs), a new turn will
    // have rescheduled; skip this stale job defensively.
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "desc" },
    });
    if (lastMessage?.author === MessageAuthor.CUSTOMER) {
      await prisma.followUpJob.update({ where: { id: job.id }, data: { status: "skipped" } });
      skipped++;
      continue;
    }

    const steps = parseSteps(job.sequence.stepsJson);
    const step = steps[job.attempt - 1];
    if (!step) {
      await prisma.followUpJob.update({ where: { id: job.id }, data: { status: "skipped" } });
      skipped++;
      continue;
    }

    const message = await prisma.message.create({
      data: {
        conversationId: convo.id,
        organizationId: convo.organizationId,
        author: MessageAuthor.AGENT,
        body: step.message,
        metaJson: { followUp: true, attempt: job.attempt },
      },
    });
    await prisma.followUpJob.update({ where: { id: job.id }, data: { status: "sent", sentAt: new Date() } });
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: new Date() },
    });
    await bumpAnalytics(convo.organizationId, { followUps: 1 });

    // Deliver on the conversation's channel (website widget picks it up on poll;
    // WhatsApp/Instagram push via provider API when credentials are configured).
    await deliverOutbound(convo, step.message).catch((err) =>
      log.warn("followup.deliver_failed", { conversationId: convo.id, error: err instanceof Error ? err.message : "unknown" }),
    );

    log.info("followup.sent", { conversationId: convo.id, attempt: job.attempt, messageId: message.id });
    sent++;
  }

  const dormant = await sweepDormant(now);
  return { processed: due.length, sent, skipped, dormant };
}

/**
 * Marks conversations dormant once their follow-up ladder is exhausted and
 * they've been quiet past the dormancy window.
 */
export async function sweepDormant(now = new Date(), quietHours = 72): Promise<number> {
  const cutoff = new Date(now.getTime() - quietHours * 60 * 60 * 1000);
  const candidates = await prisma.conversation.findMany({
    where: {
      status: ConversationStatus.AI_ACTIVE,
      lastMessageAt: { lt: cutoff },
      followUpJobs: { none: { status: "scheduled" } },
    },
    select: { id: true, leadId: true, organizationId: true },
    take: 200,
  });

  let count = 0;
  for (const c of candidates) {
    await prisma.conversation.update({
      where: { id: c.id },
      data: { status: ConversationStatus.DORMANT },
    });
    await prisma.lead.updateMany({
      where: {
        id: c.leadId,
        status: { notIn: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.HANDED_OFF, LeadStatus.OPTED_OUT] },
      },
      data: { status: LeadStatus.DORMANT },
    });
    count++;
  }
  if (count) log.info("followup.dormant_swept", { count });
  return count;
}
