import type { Session } from "koishi";
import { InputError } from "../../error/handle";
import { createQQReply, requireQQDirect } from ".";
import type { QQMessageResult, QQSendOptions } from ".";

export interface QQStreamOptions extends Omit<QQSendOptions, "reference"> {
  contentType?: "text" | "markdown";
  interval?: number;
}

// 分片上传是一种增量的方式发送
export const sendQQStream = async (
  session: Session,
  snapshots: readonly string[],
  options: QQStreamOptions = {},
): Promise<QQMessageResult> => {
  const internal = requireQQDirect(session);
  if (!internal.sendPrivateStreamMessage)
    throw new InputError("QQ stream API unavailable", "qq.errors.adapter");
  const interval = options.interval ?? 0;
  if (!snapshots.length || snapshots.some((text) => !text.trim()))
    throw new InputError("Empty stream content", "qq.errors.streamContent");
  if (!Number.isFinite(interval) || interval < 0 || interval > 50_000)
    throw new InputError("Invalid stream interval", "qq.errors.streamInterval");
  const reply = createQQReply(session, options);
  const started = Date.now();
  let result: QQMessageResult;
  let streamId: string;
  let index = 0;
  for (let frame = 0; frame < snapshots.length; frame++) {
    if (frame) {
      if (Date.now() - started + interval >= 53_000) frame = snapshots.length - 1;
      else if (interval) await new Promise((resolve) => setTimeout(resolve, interval));
    }
    result = await internal.sendPrivateStreamMessage(session.channelId, {
      ...reply,
      input_mode: "replace",
      input_state: frame === snapshots.length - 1 ? 10 : 1,
      index: index++,
      content_type: options.contentType ?? "markdown",
      content_raw: snapshots[frame],
      ...(streamId ? { stream_msg_id: streamId } : {}),
    });
    streamId ??= result?.id;
    if (!streamId) throw new Error("QQ streaming API did not return a message ID");
  }
  return { ...result, id: streamId };
};
