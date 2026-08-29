import { ChannelType } from "../constants";
import { log } from "../logger";
import { sendWhatsAppText } from "./whatsapp";
import { sendInstagramText } from "./instagram";

export type OutboundConversation = {
  id: string;
  organizationId: string;
  channelType: string;
  externalThreadId: string | null;
};

export type DeliveryResult = {
  delivered: boolean;
  channel: string;
  mode: "poll" | "push" | "none";
  reason?: string;
};

/**
 * Routes an outbound agent/human message to the correct channel.
 * WEBSITE/API conversations are delivered by the client polling the
 * conversation endpoint, so there is nothing to push. WhatsApp/Instagram push
 * through their provider adapters (which require connected credentials).
 */
export async function deliverOutbound(convo: OutboundConversation, text: string): Promise<DeliveryResult> {
  switch (convo.channelType) {
    case ChannelType.WEBSITE:
    case ChannelType.API:
      return { delivered: true, channel: convo.channelType, mode: "poll" };
    case ChannelType.WHATSAPP: {
      const r = await sendWhatsAppText(convo.organizationId, convo.externalThreadId, text);
      return { delivered: r.delivered, channel: convo.channelType, mode: "push", reason: "reason" in r ? r.reason : undefined };
    }
    case ChannelType.INSTAGRAM: {
      const r = await sendInstagramText(convo.organizationId, convo.externalThreadId, text);
      return { delivered: r.delivered, channel: convo.channelType, mode: "push", reason: "reason" in r ? r.reason : undefined };
    }
    default:
      log.warn("channel.deliver_unknown", { channelType: convo.channelType });
      return { delivered: false, channel: convo.channelType, mode: "none" };
  }
}
