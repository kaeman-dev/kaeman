# QQ 官方机器人能力（注意：这个内容是AI写上去的，摘抄自 AtriMeow Bot Docs，有删改）

下面的导入路径按在 `src/commands/*.ts` 中调用编写，`session` 为当前命令或按钮事件的 Koishi 会话
当前说明包括：本次发送的变动（基本上只有新增）

```ts
import {
  acknowledgeQQInteraction,
  createQQButton,
  createQQKeyboard,
  createQQReply,
  getQQInternal,
  requireQQDirect,
  sendQQInputNotify,
  sendQQMarkdown,
} from "../service/qq";
import { sendQQStream } from "../service/qq/stream";
```

## sendQQMarkdown(session, markdown, options?)

发送 Markdown 到当前会话，支持 QQ 群聊、单聊、频道及频道私聊。返回 `Promise<QQMessageResult>`。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `session` | `Session` | 决定发送目标和默认回复来源 |
| `markdown` | `string` 或模板对象 | Markdown 正文，或下面示例中的模板参数 |
| `options` | `QQMarkdownOptions` | 可省略，默认被动回复 |

`QQMarkdownOptions` 的字段：

| 字段 | 类型 / 默认值 | 作用 |
| --- | --- | --- |
| `active` | `boolean`，默认不启用 | 主动发送，不附带被动回复来源 |
| `wakeup` | `boolean`，默认不启用 | 单聊唤醒消息，不附带回复来源；优先于 `active` |
| `reference` | `string` | 要引用展示的消息 ID；不能和唤醒同时使用 |
| `keyboard` | `QQKeyboard` | 消息内键盘，由 `createQQKeyboard()` 构造 |
| `promptKeyboard` | `QQKeyboard` | 提示键盘，仅支持 QQ 群聊和单聊 |
| `verifyImages` | `boolean`，默认不传 | 显式设置图片资源校验字段 |

```ts
const result = await sendQQMarkdown(session, "# 处理结果\n已完成。");

await sendQQMarkdown(session, "引用这条消息", {
  reference: session.messageId,
});

await sendQQMarkdown(session, "主动通知", { active: true });
await sendQQMarkdown(session, "单聊唤醒通知", { wakeup: true });

await sendQQMarkdown(session, {
  custom_template_id: "模板 ID",
  params: [
    { key: "title", values: ["处理结果"] },
    { key: "content", values: ["已完成。"] },
  ],
});
```

默认取当前消息 ID 进行回复；按钮事件或没有消息 ID 时，取事件外层 ID。缺少回复来源会抛出 `InputError`，不会自动改为主动发送。`reference` 仅控制引用展示，不改变被动回复来源。

`QQMessageResult` 的字段均可缺省：`id`、`timestamp`、`audit_id`、`audit_tips`。使用消息 ID 前应判断是否存在。

## createQQButton(options)

构造一个按钮，返回 `QQButton`，不发送消息。

| 字段 | 必填 / 默认值 | 说明 |
| --- | --- | --- |
| `id` | 必填 | 按钮 ID，回调时用于识别按钮 |
| `label` | 必填 | 显示文字 |
| `type` | 必填 | `"link"`、`"command"` 或 `"callback"` |
| `data` | 必填 | 链接地址、指令文本或回调数据，取决于 `type` |
| `visitedLabel` | 默认同 `label` | 点击后的显示文字 |
| `style` | 默认 `1` | `0` 灰色线框，`1` 蓝色线框 |
| `permission` | 默认 `{ type: 2 }` | 操作权限，见下面的取值 |
| `enter` | 默认 `false` | 仅指令按钮：点击后是否直接发送指令 |
| `reply` | 默认 `false` | 仅指令按钮：发送指令时是否引用按钮所在消息 |
| `modal` | 可省略 | 确认框，含 `content`，可另填 `confirm_text`、`cancel_text` |
| `groupId` | 可省略 | 写入按钮的 `group_id` 字段 |

`permission` 支持以下结构：

```ts
{ type: 0, specify_user_ids: [session.userId] } // 指定用户
{ type: 1 }                                  // 管理员
{ type: 2 }                                  // 所有人
{ type: 3, specify_role_ids: ["身份组 ID"] }    // 频道身份组
```

三种按钮的构造示例：

```ts
const link = createQQButton({
  id: "kaeman_docs",
  label: "查看文档",
  type: "link",
  data: "https://bot.q.qq.com/wiki/",
});

const command = createQQButton({
  id: "kaeman_identity",
  label: "查看身份",
  type: "command",
  data: "/debug whoami",
  enter: true,
  reply: true,
  permission: { type: 0, specify_user_ids: [session.userId] },
});

const callback = createQQButton({
  id: "kaeman_confirm",
  label: "确认",
  visitedLabel: "已点击",
  type: "callback",
  data: "confirm",
  permission: { type: 0, specify_user_ids: [session.userId] },
  modal: {
    content: "确认执行？",
    confirm_text: "确认",
    cancel_text: "取消",
  },
});
```

指令文本中的前缀应与当前项目配置一致。按钮权限和确认框按传入值组装，函数不负责校验所有 QQ 平台限制。

## createQQKeyboard(rows, fontSize?)

将按钮按行排布，返回 `QQKeyboard`，供 `sendQQMarkdown()` 使用。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `rows` | `readonly (readonly QQButton[])[]` | 外层数组为行，每行数组为该行的按钮 |
| `fontSize` | `"small"`，可省略 | 设置小字号；省略则不传字号字段 |

接着上面的按钮示例：

```ts
const keyboard = createQQKeyboard([
  [link],
  [command, callback],
], "small");

await sendQQMarkdown(session, "请选择操作", { keyboard });

await sendQQMarkdown(session, "请选择操作", {
  promptKeyboard: createQQKeyboard([[command]]),
});
```

## acknowledgeQQInteraction(session, code?)

确认当前按钮回调，返回 `Promise<boolean>`。`code` 为传给 QQ 的确认状态码，默认 `0`。

- 适配器开启 `manualAcknowledge`，且当前是按钮事件：调用确认接口，成功后返回 `true`。
- 适配器自动确认，或当前不是按钮事件：不调用确认接口，返回 `false`。
- 缺少回调 ID、所需接口或请求失败：抛出错误。

确认与发送回复是两个动作。下面处理前面 `kaeman_confirm` 按钮的回调：

```ts
import { logError } from "../error/handle";
import { withTrace } from "../error/trace";

ctx.on("interaction/button", (session) => {
  if (session.platform !== "qq"
    || session.event.button?.id !== "kaeman_confirm") return;

  return withTrace(async () => {
    try {
      await acknowledgeQQInteraction(session);
      await sendQQMarkdown(session, "已确认。");
    } catch (error) {
      logError(ctx, error, "QQ confirmation callback failed");
    }
  });
});
```

传入事件本身的 `session` 即可：确认函数读取回调内容中的 ID，回复函数读取事件外层 ID，无需调用方手动替换。

## sendQQStream(session, snapshots, options?)

发送 QQ 单聊流式消息，返回 `Promise<QQMessageResult>`；返回结果的 `id` 为第一次响应取得的流式消息 ID。

| 参数 / 选项 | 类型 / 默认值 | 说明 |
| --- | --- | --- |
| `session` | `Session` | 必须是 QQ 单聊 |
| `snapshots` | `readonly string[]` | 至少一项，每项均为非空的完整内容快照 |
| `options.contentType` | `"text"` 或 `"markdown"`，默认后者 | 内容格式 |
| `options.interval` | `number`，默认 `0` | 更新间隔，单位毫秒，范围 0～50000 |
| `options.active` | `boolean` | 显式主动发送 |
| `options.wakeup` | `boolean` | 唤醒发送，优先于 `active` |

```ts
const result = await sendQQStream(session, [
  "正在处理…",
  "正在处理…\n第一步完成。",
  "正在处理…\n第一步完成。\n全部完成。",
], {
  contentType: "markdown",
  interval: 1000,
});
```

**传入完整快照，不是新增片段。** 例如要逐步显示 `A`、`AB`、`ABC`，应传 `["A", "AB", "ABC"]`。当前接口接收预先准备好的数组，不接收异步生成器。

函数负责共用消息序号、递增更新索引、携带流式消息 ID，并将最后一项标记为结束。接近本地时间预算时会跳过中间项，因此最后一项必须包含最终完整内容。平台超时或接口错误仍会抛出，不会自动重发。

## sendQQInputNotify(session, seconds?)

显示 QQ 单聊输入状态，返回 `Promise<QQMessageResult>`。

`seconds` 默认为 `5`，必须是正整数，单位为秒。非 QQ 单聊或时长不合法时抛出 `InputError`。

```ts
await sendQQInputNotify(session);     // 默认 5 秒
await sendQQInputNotify(session, 10); // 指定 10 秒
```

## 底层辅助方法

以下三个函数用于扩展发送能力。调用前面的发送函数时，它们已经在内部使用，无需再调用一次。

### getQQInternal(session)

校验平台为 `qq` 或 `qqguild`，返回当前 `session.bot.internal`，不发送请求。不支持的平台或缺少适配器对象时抛出 `InputError`。返回的是当前机器人的接口，不会自动切换到频道子机器人；可选接口调用前需要判断是否存在。

```ts
const internal = getQQInternal(session);
```

### requireQQDirect(session)

在 `getQQInternal()` 的基础上要求 `session.platform === "qq"` 且 `session.isDirect`，返回当前机器人的接口。不满足条件时抛出 `InputError`。

```ts
const internal = requireQQDirect(session);
```

### createQQReply(session, options?)

构造回复字段，不发送请求。`options` 类型为 `QQSendOptions`，支持 `active`、`wakeup`、`reference`，含义同 `sendQQMarkdown()`。

| 场景 | 返回字段 |
| --- | --- |
| QQ 消息回复 | `msg_id`、`msg_seq` |
| 频道消息回复 | `msg_id` |
| 按钮事件或只有事件来源 | `event_id` |
| 主动消息 | 不附带回复来源 |
| 唤醒消息 | `is_wakeup: true` |
| 设置 `reference` | 额外附带 `message_reference`；唤醒不允许引用 |

在 QQ 消息回复场景，每调用一次都会递增 `session.seq`，因此应在准备发送时调用一次，不要为了预览反复调用。

下面展示在 QQ 单聊原始接口中使用回复字段：

```ts
const internal = requireQQDirect(session);
if (!internal.sendPrivateMessage) {
  throw new Error("QQ adapter does not expose sendPrivateMessage");
}

const reply = createQQReply(session);
await internal.sendPrivateMessage(session.channelId, {
  msg_type: 0,
  content: "处理完成",
  ...reply,
});
```
