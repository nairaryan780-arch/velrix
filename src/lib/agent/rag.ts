import { cosine, embedTexts, lexicalVector } from "../ai";
import { sanitizeKnowledgeChunk } from "./safety";

export function chunkText(text: string, size = 700, overlap = 80) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += size - overlap) {
    chunks.push(clean.slice(i, i + size));
  }
  return chunks;
}

export async function embedChunks(chunks: string[]) {
  const sanitized = chunks.map(sanitizeKnowledgeChunk);
  const vectors = await embedTexts(sanitized);
  return sanitized.map((content, i) => ({
    content,
    embedding: vectors[i],
    tokenCount: Math.ceil(content.length / 4),
  }));
}

export function retrieveChunks(
  query: string,
  chunks: { content: string; embedding?: number[] | null }[],
  k = 5,
) {
  const q = lexicalVector(query);
  const ranked = chunks
    .map((c) => {
      const v = Array.isArray(c.embedding) ? (c.embedding as number[]) : lexicalVector(c.content);
      const lexical = cosine(q, lexicalVector(c.content));
      const semantic = Array.isArray(c.embedding) ? cosine(q, v) : lexical;
      return { content: c.content, score: semantic * 0.7 + lexical * 0.3 };
    })
    .sort((a, b) => b.score - a.score);
  return ranked.filter((r) => r.score > 0.08).slice(0, k);
}
