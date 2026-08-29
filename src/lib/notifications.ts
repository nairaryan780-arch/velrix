import type { Prisma } from "@prisma/client";
import { NotificationKind } from "./constants";
import { prisma } from "./db";
import { log } from "./logger";

export async function createNotification(input: {
  organizationId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const n = await prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      dataJson: (input.data ?? {}) as Prisma.InputJsonValue,
    },
  });
  log.info("notification.created", { id: n.id, kind: input.kind, organizationId: input.organizationId });
  return n;
}
