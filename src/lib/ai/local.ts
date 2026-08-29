import type { AIProvider, CompletionRequest, CompletionResult } from "./provider";

/**
 * Deterministic retrieval salesperson used when no LLM key is configured.
 * It never invents facts: it quotes knowledge snippets or asks qualification questions.
 */
export class LocalSalesProvider implements AIProvider {
  id = "local";

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const system = req.messages.find((m) => m.role === "system")?.content ?? "";
    const lastUser = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const knowledge = extractSection(system, "APPROVED KNOWLEDGE");
    const missing = extractList(system, "MISSING QUALIFICATION").filter(
      (m) => m && m.toLowerCase() !== "none",
    );
    const facts = extractSection(system, "KNOWN FACTS");
    const injection = lastUser.toLowerCase().includes("injection");
    const customer = extractCustomer(lastUser);
    const snippet = knowledge.trim() ? bestSnippet(knowledge, customer) : "";

    let text: string;
    if (injection) {
      text = "I can help with our products and services. What are you looking for?";
    } else if (missing.length > 0 && !hasAnswer(customer, missing[0])) {
      // Still qualifying: lead with a relevant knowledge snippet if we have one,
      // then ask the next question.
      text = snippet ? `${snippet}\n\n${nextQuestion(missing[0], facts)}` : nextQuestion(missing[0], facts);
    } else if (snippet) {
      text = `${snippet}\n\nWould you like to book a visit or have a specialist reach out to take the next step?`;
    } else if (missing.length === 0) {
      // Fully qualified and nothing specific to quote — move to the close.
      text = "Thanks — I have everything I need. Would you like me to arrange a call or a visit with our team?";
    } else {
      text =
        "I don't have that detail on hand right now, but I can connect you with a team member who does. Would you like that?";
    }

    return {
      text,
      provider: "local",
      model: "velrix-local-salesperson",
      fallback: true,
    };
  }
}

function extractSection(text: string, title: string) {
  const re = new RegExp(`${title}:([\\s\\S]*?)(?:\\n[A-Z][A-Z ]+:|$)`);
  return re.exec(text)?.[1]?.trim() ?? "";
}

function extractList(text: string, title: string) {
  const section = extractSection(text, title);
  return section
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function extractCustomer(block: string) {
  const m = /<customer_message[^>]*>([\s\S]*?)<\/customer_message>/.exec(block);
  return (m?.[1] ?? block).trim();
}

function hasAnswer(customer: string, field: string) {
  return customer.toLowerCase().includes(field.toLowerCase().slice(0, 8));
}

function nextQuestion(field: string, facts: string) {
  if (facts.toLowerCase().includes(field.toLowerCase())) {
    return `Thanks, I have that. ${field}`;
  }
  return field.includes("?") ? field : `Could you share your ${field.toLowerCase()}?`;
}

function bestSnippet(knowledge: string, query: string) {
  const chunks = knowledge.split(/\n---\n|\n\n/).map((c) => c.trim()).filter(Boolean);
  if (!chunks.length) return "";
  const terms = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  let best = chunks[0];
  let bestScore = -1;
  for (const chunk of chunks) {
    const hay = chunk.toLowerCase();
    const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    if (score > bestScore) {
      best = chunk;
      bestScore = score;
    }
  }
  if (bestScore <= 0 && terms.length > 2) return "";
  return best.slice(0, 600);
}
