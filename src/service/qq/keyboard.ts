export interface QQButtonOptions {
  id: string;
  label: string;
  type: "link" | "callback" | "command";
  data: string;
  visitedLabel?: string;
  style?: 0 | 1;
  permission?:
    | { type: 0; specify_user_ids: string[] }
    | { type: 1 | 2 }
    | { type: 3; specify_role_ids: string[] };
  enter?: boolean;
  reply?: boolean;
  modal?: { content: string; confirm_text?: string; cancel_text?: string };
  groupId?: string;
}

export const createQQButton = (options: QQButtonOptions) => ({
  id: options.id,
  ...(options.groupId ? { group_id: options.groupId } : {}),
  render_data: {
    label: options.label,
    visited_label: options.visitedLabel ?? options.label,
    style: options.style ?? 1,
  },
  action: {
    type: { link: 0, callback: 1, command: 2 }[options.type],
    permission: options.permission ?? { type: 2 },
    data: options.data,
    ...(options.type === "command"
      ? {
          enter: options.enter ?? false,
          reply: options.reply ?? false,
        }
      : {}),
    ...(options.modal ? { modal: options.modal } : {}),
  },
});

export type QQButton = ReturnType<typeof createQQButton>;

export const createQQKeyboard = (rows: readonly (readonly QQButton[])[], fontSize?: "small") => ({
  content: {
    rows: rows.map((buttons) => ({ buttons: [...buttons] })),
    ...(fontSize ? { style: { font_size: fontSize } } : {}),
  },
});

export type QQKeyboard = ReturnType<typeof createQQKeyboard>;
