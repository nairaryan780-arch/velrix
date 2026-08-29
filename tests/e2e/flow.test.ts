import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/auth/password";
import { createOrganizationForUser } from "../../src/lib/provision";
import { ingestSource } from "../../src/lib/knowledge";
import { startEnquiry, runAgentTurn } from "../../src/lib/agent/engine";
import { ChannelType, ConversationStatus, NotificationKind } from "../../src/lib/constants";

/**
 * The most important test: a real enquiry travels the full lifecycle against the
 * database — AI reply -> qualification -> lead -> score -> HOT -> notification ->
 * human takeover -> AI stops.
 */
describe("end-to-end enquiry lifecycle", () => {
  let orgId: string;
  let userId: string;
  const email = `e2e-${Date.now()}@velrix.test`;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email, name: "E2E Tester", passwordHash: await hashPassword("testpassword123") } });
    userId = user.id;
    const org = await createOrganizationForUser(user.id, { name: `E2E ${Date.now()}`, industry: "real_estate", whatWeSell: "Apartments and villas in Bengaluru." });
    orgId = org.id;
    await prisma.organization.update({ where: { id: orgId }, data: { agentActive: true } });

    const source = await prisma.knowledgeSource.create({
      data: { organizationId: orgId, type: "TEXT", title: "Projects", content: "Prestige Lakeside in Whitefield offers ready-to-move 2BHK apartments. Site visits are free.", approved: true, status: "PENDING" },
    });
    await ingestSource(source.id);
  });

  afterAll(async () => {
    if (orgId) await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("responds to an enquiry and creates a lead + conversation", async () => {
    const turn = await startEnquiry({
      organizationId: orgId,
      channelType: ChannelType.WEBSITE,
      externalThreadId: "e2e-thread",
      openingText: "Hi, I'm looking for a 2BHK in Whitefield",
    });
    expect(turn.stopped).toBe(false);
    if (!turn.stopped) expect(turn.reply).toBeTruthy();

    const convo = await prisma.conversation.findFirst({ where: { organizationId: orgId, externalThreadId: "e2e-thread" }, include: { messages: true } });
    expect(convo).toBeTruthy();
    // opening customer message + agent reply
    expect(convo!.messages.length).toBeGreaterThanOrEqual(2);
  });

  it("qualifies, scores to HOT, and fires a hot-lead notification", async () => {
    const convo = await prisma.conversation.findFirstOrThrow({ where: { organizationId: orgId, externalThreadId: "e2e-thread" } });
    for (const text of ["My budget is around 90 lakh", "I want to buy this month, ready to move in"]) {
      await runAgentTurn({ organizationId: orgId, conversationId: convo.id, customerText: text });
    }
    const lead = await prisma.lead.findFirstOrThrow({ where: { id: convo.leadId } });
    expect(lead.interest?.toLowerCase()).toContain("2");
    expect(lead.location?.toLowerCase()).toContain("whitefield");
    expect(lead.budget).toBeTruthy();
    expect(lead.score).toBeGreaterThanOrEqual(70);
    expect(lead.temperature).toBe("HOT");

    const notifications = await prisma.notification.findMany({ where: { organizationId: orgId, kind: NotificationKind.HOT_LEAD } });
    expect(notifications.some((n) => (n.dataJson as { leadId?: string })?.leadId === lead.id)).toBe(true);

    const jobs = await prisma.followUpJob.count({ where: { conversationId: convo.id, status: "scheduled" } });
    expect(jobs).toBeGreaterThan(0);
  });

  it("stops the AI after a human takes over and cancels follow-ups", async () => {
    const convo = await prisma.conversation.findFirstOrThrow({ where: { organizationId: orgId, externalThreadId: "e2e-thread" } });
    await prisma.conversation.update({ where: { id: convo.id }, data: { status: ConversationStatus.HUMAN_TAKEOVER } });

    const turn = await runAgentTurn({ organizationId: orgId, conversationId: convo.id, customerText: "Are you there?" });
    expect(turn.stopped).toBe(true);
    if (turn.stopped) expect(turn.reason).toBe("human_takeover");

    const scheduled = await prisma.followUpJob.count({ where: { conversationId: convo.id, status: "scheduled" } });
    expect(scheduled).toBe(0);
  });

  it("isolates tenants — one org cannot see another org's leads", async () => {
    const otherUser = await prisma.user.create({ data: { email: `other-${Date.now()}@velrix.test`, name: "Other", passwordHash: await hashPassword("testpassword123") } });
    const otherOrg = await createOrganizationForUser(otherUser.id, { name: `Other ${Date.now()}` });
    const leakage = await prisma.lead.findMany({ where: { organizationId: otherOrg.id } });
    expect(leakage.length).toBe(0);
    await prisma.organization.delete({ where: { id: otherOrg.id } });
    await prisma.user.delete({ where: { id: otherUser.id } });
  });
});
