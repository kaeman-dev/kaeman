import type { Context, Session } from "koishi";
import messages from "../assets/debug-messages.json";

const linkButton = (id: string, label: string, href: string) => ({
  id,
  render_data: { label, visited_label: label, style: 1 },
  action: { type: 0, permission: { type: 2 }, data: href },
});

const buildCard = (userId: string, active: boolean) => ({
  msg_type: 2,
  markdown: {
    content: [
      ...messages.card[active ? "active" : "passive"],
      messages.card.body,
      ...(active ? [] : [`<@${userId}>`]),
    ].join("\n"),
  },
  keyboard: {
    content: {
      rows: [
        {
          buttons: messages.card.buttons.map(({ id, label, href }) => linkButton(id, label, href)),
        },
      ],
    },
  },
});

const sendCard = async (
  session: Session,
  card: ReturnType<typeof buildCard>,
  active: boolean,
) => {
  const internal = (session.bot as any).internal;
  const passive =
    active || !session.messageId
      ? {}
      : {
          msg_id: session.messageId,
          msg_seq: ((session as any).seq = ((session as any).seq ?? 0) + 1),
        };
  if (typeof internal.sendPrivateMessage === "function") {
    const send = session.isDirect
      ? internal.sendPrivateMessage
      : internal.sendMessage;
    return send.call(internal, session.channelId, { ...card, ...passive });
  }
  const { msg_type: _, ...channelCard } = card;
  if (session.isDirect)
    return internal.sendDM(session.guildId, { ...channelCard, ...passive });
  return internal.sendMessage(session.channelId, { ...channelCard, ...passive });
};

const sendStream = async (session: Session) => {
  const internal = (session.bot as any).internal;
  if (!session.isDirect || typeof internal?.sendPrivateStreamMessage !== "function")
    return session.send("Streaming test only supports QQ direct messages; DM the bot and send /debug stream.");
  const lines = messages.stream.lines;
  let streamId: string | undefined;
  for (let index = 0; index < lines.length; index++) {
    if (index) await new Promise((resolve) => setTimeout(resolve, messages.stream.interval));
    const result = await internal.sendPrivateStreamMessage(session.channelId, {
      input_mode: "replace",
      input_state: index === lines.length - 1 ? 10 : 1,
      index,
      content_type: "markdown",
      content_raw: lines.slice(0, index + 1).join("\n\n"),
      msg_id: session.messageId,
      msg_seq: ((session as any).seq = ((session as any).seq ?? 0) + 1),
      stream_msg_id: streamId,
    });
    streamId = result?.id ?? streamId;
    if (!streamId) throw new Error("Streaming API did not return a message ID");
  }
};

const executeDebug = async (
  ctx: Context,
  session: Session,
  label: string,
  task: () => Promise<unknown>,
) => {
  const logger = ctx.logger("kaeman");
  logger.info(
    "cmd /debug%s by %s (%s) in %s",
    label,
    session.username,
    session.uid,
    session.cid,
  );
  await task();
  logger.info("cmd /debug%s done", label);
};

export const registerDebug = (ctx: Context) => {
  const debug = ctx
    .command("debug", "Send a QQ markdown card test (passive reply)")
    .action(({ session }) =>
      executeDebug(ctx, session, "", () =>
        sendCard(session, buildCard(session.userId, false), false),
      ),
    );
  debug
    .subcommand(".active", "Send a proactive markdown card test")
    .action(({ session }) =>
      executeDebug(ctx, session, " active", () =>
        sendCard(session, buildCard(session.userId, true), true),
      ),
    );
  debug
    .subcommand(".stream", "QQ direct-message streaming test: updates every 3 seconds, 2 rounds")
    .action(({ session }) =>
      executeDebug(ctx, session, " stream", () => sendStream(session)),
    );
  debug
    .subcommand(".whoami", "Show caller identity info")
    .action(({ session }) =>
      session.send([
        `openid: ${session.userId}`,
        `Name: ${session.event.user?.name ?? "(unknown)"}`,
        `Avatar: ${session.event.user?.avatar ?? "(unknown)"}`,
        `Session: ${session.isDirect ? "DM" : "Group/Channel"}`,
        `Roles: ${session.event.member?.roles?.map((role) => role.id).join(", ") || "(unknown)"}`,
      ].join("\n")),
    );
};
