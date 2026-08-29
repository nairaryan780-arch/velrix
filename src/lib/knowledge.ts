import { prisma } from "./db";
import { log } from "./logger";
import { chunkText, embedChunks } from "./agent/rag";
import { KnowledgeStatus } from "./constants";

/** Fetches a URL and extracts readable text (best-effort HTML strip). */
export async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "VelrixBot/1.0 (+knowledge-ingest)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
  const html = (await res.text()).slice(0, 500_000);
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ingests a knowledge source end-to-end: resolves its text, chunks it, embeds
 * each chunk, and stores the chunks — flipping status PROCESSING -> READY (or
 * FAILED with an error message). This is what makes retrieval real.
 */
export async function ingestSource(sourceId: string) {
  const source = await prisma.knowledgeSource.findUnique({ where: { id: sourceId } });
  if (!source) return;

  await prisma.knowledgeSource.update({ where: { id: sourceId }, data: { status: KnowledgeStatus.PROCESSING, errorMessage: null } });
  try {
    let text = source.content ?? "";
    if (source.type === "URL" && source.url) {
      text = await fetchUrlText(source.url);
      await prisma.knowledgeSource.update({ where: { id: sourceId }, data: { content: text.slice(0, 50_000) } });
    }
    if (!text.trim()) throw new Error("No text content to index");

    // Replace any existing chunks (re-index safe).
    await prisma.knowledgeChunk.deleteMany({ where: { sourceId } });
    const chunks = chunkText(text);
    const embedded = await embedChunks(chunks);
    if (embedded.length) {
      await prisma.knowledgeChunk.createMany({
        data: embedded.map((c) => ({ sourceId, content: c.content, embedding: c.embedding, tokenCount: c.tokenCount })),
      });
    }

    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { status: KnowledgeStatus.READY, lastIndexedAt: new Date(), errorMessage: null },
    });
    log.info("knowledge.indexed", { sourceId, chunks: embedded.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexing failed";
    await prisma.knowledgeSource.update({ where: { id: sourceId }, data: { status: KnowledgeStatus.FAILED, errorMessage: message } });
    log.error("knowledge.index_failed", { sourceId, error: message });
  }
}
