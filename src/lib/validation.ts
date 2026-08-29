import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email().max(200),
  password: z.string().min(10, "Password must be at least 10 characters").max(200),
  organizationName: z.string().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const resetRequestSchema = z.object({ email: z.string().email() });
export const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(10).max(200),
});

export const agentConfigSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().min(1).max(60).optional(),
  tone: z.enum(["professional", "friendly", "premium", "conversational", "concise"]).optional(),
  businessDescription: z.string().max(4000).optional(),
  instructions: z.string().max(4000).optional(),
  policies: z.string().max(4000).optional(),
  scoring: z.object({ thresholds: z.object({ hot: z.number().min(1).max(100), warm: z.number().min(0).max(100) }) }).optional(),
  handoff: z
    .object({
      hotAutoNotify: z.boolean().optional(),
      hotScore: z.number().min(1).max(100).optional(),
      onHumanRequest: z.boolean().optional(),
      onLowConfidence: z.boolean().optional(),
    })
    .optional(),
  widget: z
    .object({
      agentName: z.string().max(60).optional(),
      businessName: z.string().max(120).optional(),
      accent: z.string().max(20).optional(),
      position: z.enum(["left", "right"]).optional(),
      welcomeMessage: z.string().max(300).optional(),
      showBranding: z.boolean().optional(),
    })
    .optional(),
});

export const qualificationRulesSchema = z.object({
  rules: z
    .array(
      z.object({
        key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores"),
        prompt: z.string().min(1).max(300),
        required: z.boolean(),
        weight: z.number().min(0).max(100),
      }),
    )
    .max(15),
});

export const knowledgeCreateSchema = z.object({
  type: z.enum(["TEXT", "FAQ", "URL", "PDF", "CATALOGUE", "PRICING", "DOCUMENT"]),
  title: z.string().min(1).max(200),
  content: z.string().max(50_000).optional(),
  url: z.string().url().optional(),
});

export const leadUpdateSchema = z.object({
  status: z
    .enum(["NEW", "CONTACTED", "QUALIFYING", "QUALIFIED", "HANDED_OFF", "WON", "LOST", "DORMANT", "OPTED_OUT"])
    .optional(),
  assignedToId: z.string().nullable().optional(),
  outcomeNote: z.string().max(2000).optional(),
});

export const conversationActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("takeover") }),
  z.object({ action: z.literal("release") }),
  z.object({ action: z.literal("close") }),
  z.object({ action: z.literal("assign"), assignedToId: z.string().nullable() }),
  z.object({ action: z.literal("human_message"), body: z.string().min(1).max(4000) }),
]);

export const integrationSchema = z.object({
  provider: z.enum(["whatsapp", "instagram", "razorpay"]),
  credentials: z.record(z.string(), z.string().max(4000)),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  role: z.enum(["ADMIN", "SALESPERSON", "VIEWER"]),
});

export const orgUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  industry: z.string().max(40).optional(),
  website: z.string().url().max(300).optional().or(z.literal("")),
  whatWeSell: z.string().max(2000).optional(),
  timezone: z.string().max(60).optional(),
});

export const onboardingSchema = z.object({
  step: z.number().min(1).max(10),
  data: z.record(z.string(), z.unknown()).optional(),
  complete: z.boolean().optional(),
});

// Public widget (untrusted origin).
export const widgetStartSchema = z.object({
  publicKey: z.string().min(6).max(80),
  message: z.string().min(1).max(4000),
  visitorName: z.string().max(80).optional(),
  conversationToken: z.string().max(120).optional(),
});

export const widgetMessageSchema = z.object({
  publicKey: z.string().min(6).max(80),
  conversationToken: z.string().min(6).max(120),
  message: z.string().min(1).max(4000),
});

export const simulateSchema = z.object({
  message: z.string().min(1).max(4000),
  reset: z.boolean().optional(),
  conversationId: z.string().optional(),
});
