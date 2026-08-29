/**
 * Demo seed — clearly labeled demo data (isDemo=true on org, leads, conversations).
 * Creates a real-estate workspace with an owner, a configured agent, qualification
 * rules, knowledge (chunked + embedded), a follow-up sequence, a website channel,
 * a subscription, three sample leads with conversations, and 14 days of analytics.
 *
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { ChannelType, ConversationStatus, LeadStatus, LeadTemperature, MessageAuthor } from "../src/lib/constants";
import { hashPassword } from "../src/lib/auth/password";
import { getIndustry } from "../src/lib/industries";
import { embedChunks, chunkText } from "../src/lib/agent/rag";
import { randomToken } from "../src/lib/crypto";
import { startOfUtcDay } from "../src/lib/analytics";

const prisma = new PrismaClient();

const DEMO_EMAIL = "owner@velrix.dev";
const DEMO_PASSWORD = "velrixdemo123";
const DEMO_SLUG = "prestige-estates";

async function main() {
  console.log("Seeding Velrix demo workspace…");

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, emailVerifiedAt: new Date() },
    create: { email: DEMO_EMAIL, name: "Priya Nair", passwordHash, emailVerifiedAt: new Date() },
  });

  // Fresh demo org each run (cascade clears prior demo data).
  const existing = await prisma.organization.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) await prisma.organization.delete({ where: { id: existing.id } });

  const org = await prisma.organization.create({
    data: {
      name: "Prestige Estates",
      slug: DEMO_SLUG,
      industry: "real_estate",
      website: "https://prestige-estates.example",
      whatWeSell: "Premium 2–4 BHK apartments and villas across Bengaluru (Whitefield, Sarjapur, Hebbal).",
      onboardingStep: 10,
      onboardingComplete: true,
      agentActive: true,
      isDemo: true,
      memberships: { create: { userId: user.id, role: "OWNER" } },
      subscription: {
        create: { plan: "GROWTH", status: "TRIALING", currentPeriodEnd: new Date(Date.now() + 14 * 86_400_000) },
      },
    },
  });

  const agent = await prisma.agent.create({
    data: {
      organizationId: org.id,
      name: "Aria",
      tone: "professional",
      businessDescription:
        "Prestige Estates is a Bengaluru real-estate developer. We help buyers find apartments and villas that fit their budget, location and timeline.",
      instructions:
        "Greet warmly, qualify on location, budget, property type and timeline, and offer a site visit to serious buyers. Never quote prices unless they appear in approved knowledge.",
      policies: "Site visits are free. Home-loan assistance is available. Prices are indicative and confirmed by a sales manager.",
      scoringJson: { thresholds: { hot: 70, warm: 40 } },
      handoffJson: { hotAutoNotify: true, hotScore: 70, onHumanRequest: true, onLowConfidence: true },
      widgetJson: {
        agentName: "Aria",
        businessName: "Prestige Estates",
        accent: "#0891b2",
        position: "right",
        welcomeMessage: "Hi! I'm Aria from Prestige Estates. What kind of home are you looking for?",
        showBranding: true,
      },
    },
  });

  // Qualification rules from the industry template.
  const industry = getIndustry("real_estate");
  await prisma.qualificationRule.createMany({
    data: industry.qualification.map((q, i) => ({
      organizationId: org.id,
      key: q.key,
      prompt: q.prompt,
      required: q.required,
      weight: q.weight,
      sortOrder: i,
    })),
  });

  // Follow-up sequence.
  await prisma.followUpSequence.create({
    data: {
      organizationId: org.id,
      name: "Default inactivity follow-up",
      active: true,
      maxAttempts: 2,
      stepsJson: [
        { delayMinutes: 120, message: "Just checking in — would you still like details on the homes we discussed? Happy to help." },
        { delayMinutes: 1440, message: "Following up once more in case you're still exploring. I can arrange a site visit whenever suits you." },
      ],
    },
  });

  // Website channel with a public embed key.
  await prisma.channel.create({
    data: {
      organizationId: org.id,
      type: ChannelType.WEBSITE,
      name: "Website chat",
      status: "CONNECTED",
      publicKey: `web_${randomToken(12)}`,
      configJson: {},
    },
  });

  // Knowledge base (chunked + embedded via lexical fallback when no AI key).
  const knowledgeDocs = [
    {
      title: "Whitefield project — Prestige Lakeside",
      type: "TEXT" as const,
      content:
        "Prestige Lakeside is a gated community in Whitefield, Bengaluru. It offers 2BHK (1150 sq ft) and 3BHK (1600 sq ft) apartments. Amenities include a clubhouse, gym, swimming pool, and 24/7 security. Possession is ready-to-move. The community is 10 minutes from ITPL and close to reputed schools.",
    },
    {
      title: "Sarjapur project — Prestige Green Valley",
      type: "TEXT" as const,
      content:
        "Prestige Green Valley in Sarjapur Road offers 3BHK and 4BHK villas with private gardens. Plot sizes range from 2400 to 3200 sq ft. The project has a landscaped park, jogging track, and a community hall. Possession is expected within 6 months. Home-loan assistance is available through partner banks.",
    },
    {
      title: "Buying process & assistance FAQ",
      type: "FAQ" as const,
      content:
        "Q: Do you offer site visits? A: Yes, site visits are free and can be scheduled any day between 9am and 6pm. Q: Do you help with home loans? A: Yes, we assist with home loans through partner banks. Q: Is the price negotiable? A: Final pricing is confirmed by a sales manager during your visit.",
    },
  ];

  for (const doc of knowledgeDocs) {
    const source = await prisma.knowledgeSource.create({
      data: {
        organizationId: org.id,
        type: doc.type,
        title: doc.title,
        content: doc.content,
        approved: true,
        status: "READY",
        lastIndexedAt: new Date(),
      },
    });
    const chunks = chunkText(doc.content);
    const embedded = await embedChunks(chunks);
    await prisma.knowledgeChunk.createMany({
      data: embedded.map((c) => ({
        sourceId: source.id,
        content: c.content,
        embedding: c.embedding,
        tokenCount: c.tokenCount,
      })),
    });
  }

  // Sample leads + conversations (clearly demo).
  await seedLead(org.id, {
    name: "Rahul Sharma",
    phone: "+919812345678",
    interest: "2BHK",
    location: "Whitefield",
    budget: "₹90L",
    timeline: "this month",
    intent: "high",
    score: 92,
    temperature: LeadTemperature.HOT,
    status: LeadStatus.QUALIFIED,
    qualified: true,
    reasons: ["Budget confirmed (+22)", "Property type matched (+16)", "Immediate timeline (+20)", "High buying intent (+18)", "Location confirmed (+16)"],
    transcript: [
      ["CUSTOMER", "Hi, I'm looking for a 2BHK."],
      ["AGENT", "Absolutely — I'd love to help. Which area are you considering?"],
      ["CUSTOMER", "Whitefield."],
      ["AGENT", "Great choice. What budget range are you working with?"],
      ["CUSTOMER", "Around ₹90 lakh."],
      ["AGENT", "Perfect. Are you looking to buy this month or over the next few months?"],
      ["CUSTOMER", "This month, ready to buy."],
      ["AGENT", "Wonderful. Prestige Lakeside in Whitefield has ready-to-move 2BHKs. Would you like to book a free site visit?"],
    ],
  });

  await seedLead(org.id, {
    name: "Ananya Mehta",
    phone: "+919898989898",
    interest: "3BHK villa",
    location: "Sarjapur",
    budget: "₹1.4Cr",
    timeline: "3-6 months",
    intent: "medium",
    score: 64,
    temperature: LeadTemperature.WARM,
    status: LeadStatus.QUALIFYING,
    qualified: false,
    reasons: ["Property type matched (+16)", "Location confirmed (+16)", "Moderate buying intent (+10)", "Missing 1 required field (timeline soft)"],
    transcript: [
      ["CUSTOMER", "Do you have villas in Sarjapur?"],
      ["AGENT", "Yes! Prestige Green Valley in Sarjapur has 3 and 4 BHK villas. What size are you looking for?"],
      ["CUSTOMER", "3BHK, maybe in the next few months."],
      ["AGENT", "Got it. Do you have a budget range in mind so I can suggest the best options?"],
      ["CUSTOMER", "Around 1.4 crore."],
    ],
  });

  await seedLead(org.id, {
    name: "Arjun",
    interest: "plot",
    location: "unknown",
    intent: "low",
    score: 21,
    temperature: LeadTemperature.COLD,
    status: LeadStatus.CONTACTED,
    qualified: false,
    reasons: ["Just browsing (-6)", "No budget shared", "No timeline shared"],
    transcript: [
      ["CUSTOMER", "just browsing, what do you have"],
      ["AGENT", "Happy to help you explore! Are you looking for an apartment, a villa, or a plot?"],
      ["CUSTOMER", "not sure yet, maybe later"],
    ],
  });

  // Analytics: 14 days of modest activity.
  const today = startOfUtcDay();
  for (let i = 13; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86_400_000);
    const enquiries = 2 + ((i * 7) % 5);
    const qualified = Math.max(0, enquiries - 2 - (i % 2));
    await prisma.analyticsDaily.create({
      data: {
        organizationId: org.id,
        day,
        enquiries,
        qualified,
        hot: i % 3 === 0 ? 1 : 0,
        warm: qualified,
        cold: enquiries - qualified,
        handoffs: i % 4 === 0 ? 1 : 0,
        followUps: i % 2,
        responseMsSum: enquiries * 1400,
        responseCount: enquiries,
      },
    });
  }

  console.log("\nSeed complete.");
  console.log(`  Login:    ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Org:      ${org.name} (${org.slug})`);
  const channel = await prisma.channel.findFirst({ where: { organizationId: org.id, type: "WEBSITE" } });
  console.log(`  Widget:   publicKey ${channel?.publicKey}`);
}

async function seedLead(
  organizationId: string,
  data: {
    name: string;
    phone?: string;
    interest: string;
    location: string;
    budget?: string;
    timeline?: string;
    intent: string;
    score: number;
    temperature: LeadTemperature;
    status: LeadStatus;
    qualified: boolean;
    reasons: string[];
    transcript: [string, string][];
  },
) {
  const lead = await prisma.lead.create({
    data: {
      organizationId,
      name: data.name,
      phone: data.phone,
      source: ChannelType.WEBSITE,
      interest: data.interest,
      location: data.location,
      budget: data.budget,
      timeline: data.timeline,
      intent: data.intent,
      score: data.score,
      temperature: data.temperature,
      scoreReasonsJson: data.reasons,
      status: data.status,
      qualified: data.qualified,
      requirementsJson: {
        interest: data.interest,
        location: data.location,
        budget: data.budget,
        timeline: data.timeline,
      },
      tags: ["demo"],
      isDemo: true,
      lastContactAt: new Date(Date.now() - 3_600_000),
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      organizationId,
      leadId: lead.id,
      channelType: ChannelType.WEBSITE,
      status: data.temperature === "HOT" ? ConversationStatus.AI_ACTIVE : ConversationStatus.AI_ACTIVE,
      summary: `${data.name} · interested in ${data.interest}${data.budget ? ` · budget ${data.budget}` : ""} · score ${data.score} (${data.temperature})`,
      stateJson: {
        name: data.name,
        interest: data.interest,
        location: data.location,
        budget: data.budget,
        timeline: data.timeline,
        answers: { interest: data.interest, location: data.location, budget: data.budget ?? "", timeline: data.timeline ?? "" },
      },
      isDemo: true,
      lastMessageAt: new Date(Date.now() - 3_600_000),
      messages: {
        create: data.transcript.map(([author, body], i) => ({
          organizationId,
          author: author as MessageAuthor,
          body,
          createdAt: new Date(Date.now() - (data.transcript.length - i) * 60_000),
        })),
      },
    },
  });

  if (data.temperature === "HOT") {
    await prisma.notification.create({
      data: {
        organizationId,
        kind: "HOT_LEAD",
        title: `Hot lead: ${data.name}`,
        body: `${data.name} · ${data.interest} · ${data.location} · ${data.budget} · ${data.timeline}. Confirmed budget and immediate purchase intent.`,
        dataJson: { leadId: lead.id, conversationId: conversation.id, score: data.score },
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
