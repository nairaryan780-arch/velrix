import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getRequestId } from "./logger";

export async function audit(input: {
  action: string;
  organizationId?: string | null;
  userId?: string | null;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        entity: input.entity,
        entityId: input.entityId,
        requestId: getRequestId(),
        metaJson: (input.meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Audit must never break the request path.
  }
}
