/**
 * Standalone end-to-end check of the core Velrix flow against the real database
 * and the local salesperson engine. Not a unit test — a live smoke run:
 *   enquiry -> AI reply -> qualification -> lead -> score -> HOT -> notify -> takeover -> AI stops
 */
import { PrismaClient } from "@prisma/client";
import { startEnquiry, runAgentTurn } from "../src/lib/agent/engine";
import { ChannelType, ConversationStatus, NotificationKind } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUniqueOrThrow({ where: { slug: "prestige-estates" } });
  const thread = `e2e-${Date.now()}`;

  console.log("1. Customer enquiry: 'Hi, I'm looking for a 2BHK.'");
  let turn = await startEnquiry({
    organizationId: org.id,
    channelType: ChannelType.WEBSITE,
    externalThreadId: thread,
    openingText: "Hi, I'm looking for a 2BHK in Whitefield.",
    visitorName: "Test Buyer",
  });
  if (turn.stopped) throw new Error("unexpected stop");
  console.log("   AI:", turn.reply);
  console.log("   score:", turn.score?.score, turn.score?.temperature);

  const convo = await prisma.conversation.findFirstOrThrow({
    where: { organizationId: org.id, externalThreadId: thread },
  });

  const followUps = [
    "My budget is around 90 lakh.",
    "I want to buy this month, ready to move in.",
    "My name is Rahul and my number is 9812345678.",
  ];
  for (const text of followUps) {
    console.log(`\n2. Customer: '${text}'`);
    turn = await runAgentTurn({ organizationId: org.id, conversationId: convo.id, customerText: text });
    if (turn.stopped) {
      console.log("   [stopped]", turn.reason);
      continue;
    }
    console.log("   AI:", turn.reply);
    console.log("   score:", turn.score?.score, turn.score?.temperature, "| status:", turn.lead?.status);
  }

  const lead = await prisma.lead.findFirstOrThrow({ where: { id: convo.leadId } });
  console.log("\n3. Final lead:", {
    name: lead.name,
    interest: lead.interest,
    location: lead.location,
    budget: lead.budget,
    timeline: lead.timeline,
    score: lead.score,
    temperature: lead.temperature,
    status: lead.status,
    qualified: lead.qualified,
  });
  console.log("   score reasons:", lead.scoreReasonsJson);

  const notif = await prisma.notification.findFirst({
    where: { organizationId: org.id, kind: NotificationKind.HOT_LEAD, dataJson: { path: "$.leadId", equals: lead.id } as never },
    orderBy: { createdAt: "desc" },
  });
  // SQLite JSON path filter may not match; fall back to scanning.
  const hotNotif =
    notif ??
    (await prisma.notification.findMany({ where: { organizationId: org.id, kind: NotificationKind.HOT_LEAD }, orderBy: { createdAt: "desc" }, take: 5 })).find(
      (n) => (n.dataJson as { leadId?: string })?.leadId === lead.id,
    );
  console.log("\n4. Hot-lead notification created:", Boolean(hotNotif), hotNotif ? `→ "${hotNotif.title}"` : "");

  const fjobs = await prisma.followUpJob.count({ where: { conversationId: convo.id, status: "scheduled" } });
  console.log("5. Follow-up jobs scheduled:", fjobs);

  console.log("\n6. Human takes over → AI should stop replying");
  await prisma.conversation.update({ where: { id: convo.id }, data: { status: ConversationStatus.HUMAN_TAKEOVER } });
  turn = await runAgentTurn({ organizationId: org.id, conversationId: convo.id, customerText: "Are you still there?" });
  console.log("   AI stopped:", turn.stopped, "| reason:", "reason" in turn ? turn.reason : "-");
  const scheduledAfter = await prisma.followUpJob.count({ where: { conversationId: convo.id, status: "scheduled" } });
  console.log("   Follow-ups cancelled after takeover:", scheduledAfter === 0);

  const pass =
    lead.interest != null &&
    lead.budget != null &&
    lead.score > 0 &&
    Boolean(hotNotif) === (lead.temperature === "HOT") &&
    turn.stopped === true &&
    scheduledAfter === 0;
  console.log("\n" + (pass ? "✅ E2E FLOW PASSED" : "❌ E2E FLOW FAILED"));

  // Cleanup this test's conversation + lead so it doesn't pollute demo data.
  await prisma.conversation.delete({ where: { id: convo.id } }).catch(() => {});
  await prisma.lead.delete({ where: { id: lead.id } }).catch(() => {});
  if (!pass) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
