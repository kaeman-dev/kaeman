import type { Session } from "koishi";
import { InputError } from "../../error/handle";
import type { QQKeyboard } from "./keyboard";

export { createQQButton, createQQKeyboard } from "./keyboard";
export type { QQButtonOptions, QQButton, QQKeyboard } from "./keyboard";

export interface QQMessageResult {
  id?: string;
  timestamp?: string;
  audit_id?: string;
  audit_tips?: string;
}

interface QQInternal {
  sendMessage(id: string, data: object): Promise<QQMessageResult>;
  sendPrivateMessage?(id: string, data: object): Promise<QQMessageResult>;
  sendDM?(id: string, data: object): Promise<QQMessageResult>;
  sendPrivateStreamMessage?(id: string, data: object): Promise<QQMessageResult>;
  acknowledgeInteraction?(id: string, data: { code: number }): Promise<unknown>;
}

interface QQEvent {
  id?: string;
  d?: { id?: string; chat_type?: number };
}

type QQSession = Session & {
  seq?: number;
  qq?: QQEvent;
  qqguild?: QQEvent;
};

export interface QQSendOptions {
  active?: boolean;
  wakeup?: boolean;
  reference?: string;
}

export interface QQMarkdownOptions extends QQSendOptions {
  keyboard?: QQKeyboard;
  promptKeyboard?: QQKeyboard;
  verifyImages?: boolean;
}

export type QQMarkdown = string | {
  custom_template_id: string;
  params: { key: string; values: string[] }[];
};

export const getQQInternal = (session: Session): QQInternal => {
  if (session.platform !== "qq" && session.platform !== "qqguild")
    throw new InputError("QQ official bot required", "qq.errors.platform");
  const internal = (session.bot as Session["bot"] & { internal?: QQInternal }).internal;
  if (!internal) throw new InputError("QQ adapter unavailable", "qq.errors.adapter");
  return internal;
};

export const requireQQDirect = (session: Session): QQInternal => {
  const internal = getQQInternal(session);
  if (session.platform !== "qq" || !session.isDirect)
    throw new InputError("QQ direct message required", "qq.errors.direct");
  return internal;
};

export const createQQReply = (session: Session, options: QQSendOptions = {}) => {
  if (options.wakeup) {
    requireQQDirect(session);
    if (options.reference)
      throw new InputError("Wakeup cannot quote a message", "qq.errors.wakeupReference");
    return { is_wakeup: true };
  }
  const reference = options.reference
    ? { message_reference: { message_id: options.reference } }
    : {};
  if (options.active) return reference;
  const qqSession = session as QQSession;
  const event = session.platform === "qq" ? qqSession.qq : qqSession.qqguild;
  if (session.type === "interaction/button" || !session.messageId) {
    if (event?.id) return { ...reference, event_id: event.id };
    throw new InputError("Missing reply source", "qq.errors.source");
  }
  return {
    ...reference,
    msg_id: session.messageId,
    ...(session.platform === "qq"
      ? { msg_seq: (qqSession.seq = (qqSession.seq ?? 0) + 1) }
      : {}),
  };
};

export const sendQQMarkdown = async (
  session: Session,
  markdown: QQMarkdown,
  options: QQMarkdownOptions = {},
): Promise<QQMessageResult> => {
  let internal = getQQInternal(session);
  const channelInteraction = session.type === "interaction/button"
    && (session as QQSession).qq?.d?.chat_type === 3;
  const guild = session.platform === "qqguild" || channelInteraction;
  if (channelInteraction) {
    internal = (session.bot as Session["bot"] & {
      guildBot?: { internal?: QQInternal };
    }).guildBot?.internal;
    if (!internal) throw new InputError("QQ guild adapter unavailable", "qq.errors.adapter");
  }
  if (options.promptKeyboard && guild)
    throw new InputError("Prompt keyboard requires QQ", "qq.errors.prompt");
  const data = {
    markdown: {
      ...(typeof markdown === "string" ? { content: markdown } : markdown),
      ...(options.verifyImages === undefined ? {} : {
        force_verify_image_resource: options.verifyImages,
      }),
    },
    ...(options.keyboard ? { keyboard: options.keyboard } : {}),
    ...(options.promptKeyboard ? { prompt_keyboard: { keyboard: options.promptKeyboard } } : {}),
    ...createQQReply(session, options),
  };
  if (!guild) {
    const send = session.isDirect ? internal.sendPrivateMessage : internal.sendMessage;
    if (!send) throw new InputError("QQ send API unavailable", "qq.errors.adapter");
    return send.call(internal, session.channelId, { msg_type: 2, ...data });
  }
  if (session.isDirect) {
    if (!internal.sendDM) throw new InputError("QQ DM API unavailable", "qq.errors.adapter");
    return internal.sendDM(session.channelId.split("_")[0], data);
  }
  return internal.sendMessage(session.channelId, data);
};

export const sendQQInputNotify = async (session: Session, seconds = 5) => {
  const internal = requireQQDirect(session);
  if (!Number.isInteger(seconds) || seconds <= 0)
    throw new InputError("Invalid typing duration", "qq.errors.duration");
  if (!internal.sendPrivateMessage)
    throw new InputError("QQ send API unavailable", "qq.errors.adapter");
  return internal.sendPrivateMessage(session.channelId, {
    msg_type: 6,
    input_notify: { input_type: 1, input_second: seconds },
  });
};

export const acknowledgeQQInteraction = async (session: Session, code = 0) => {
  const internal = getQQInternal(session);
  const bot = session.bot as Session["bot"] & { config?: { manualAcknowledge?: boolean } };
  if (!bot.config?.manualAcknowledge || session.type !== "interaction/button") return false;
  const qqSession = session as QQSession;
  const id = (session.platform === "qq" ? qqSession.qq : qqSession.qqguild)?.d?.id;
  if (!id || !internal.acknowledgeInteraction)
    throw new InputError("Missing interaction API or ID", "qq.errors.interaction");
  await internal.acknowledgeInteraction(id, { code });
  return true;
};
