import { prisma } from "./db";
import { getIndustry } from "./industries";
import { randomToken } from "./crypto";
import { ChannelType, ChannelStatus, Role } from "./constants";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

/**
 * Provisions a fully working workspace for a new owner: organization, OWNER
 * membership, a configured agent, qualification rules from the industry
 * template, a default follow-up sequence, a website channel with an embed key,
 * and a trial subscription. Onboarding then refines these.
 */
export async function createOrganizationForUser(
  userId: string,
  input: { name: string; industry?: string; website?: string; whatWeSell?: string },
) {
  const industryKey = input.industry ?? "real_estate";
  const industry = getIndustry(industryKey);
  const slug = await uniqueSlug(input.name);

  const org = await prisma.organization.create({
    data: {
      name: input.name,
      slug,
      industry: industry.key,
      website: input.website,
      whatWeSell: input.whatWeSell,
      onboardingStep: 1,
      onboardingComplete: false,
      agentActive: false,
      memberships: { create: { userId, role: Role.OWNER } },
      subscription: {
        create: { plan: "STARTER", status: "TRIALING", currentPeriodEnd: new Date(Date.now() + 14 * 86_400_000) },
      },
      agents: {
        create: {
          name: "Velrix",
          tone: "professional",
          businessDescription: input.whatWeSell ?? "",
          instructions: "",
          policies: "",
          scoringJson: { thresholds: { hot: 70, warm: 40 } },
          handoffJson: { hotAutoNotify: true, hotScore: 70, onHumanRequest: true, onLowConfidence: true },
          widgetJson: {
            agentName: "Velrix",
            businessName: input.name,
            accent: "#0891b2",
            position: "right",
            welcomeMessage: "Hi! How can I help you today?",
            showBranding: true,
          },
        },
      },
      qualificationRules: {
        create: industry.qualification.map((q, i) => ({
          key: q.key,
          prompt: q.prompt,
          required: q.required,
          weight: q.weight,
          sortOrder: i,
        })),
      },
      followUpSequences: {
        create: {
          name: "Default inactivity follow-up",
          active: true,
          maxAttempts: 2,
          stepsJson: [
            { delayMinutes: 120, message: "Just checking in — would you still like details? Happy to help." },
            { delayMinutes: 1440, message: "Following up once more in case you're still exploring. I'm here whenever you're ready." },
          ],
        },
      },
      channels: {
        create: {
          type: ChannelType.WEBSITE,
          name: "Website chat",
          status: ChannelStatus.CONNECTED,
          publicKey: `web_${randomToken(12)}`,
          configJson: {},
        },
      },
    },
    include: { channels: true },
  });

  return org;
}
