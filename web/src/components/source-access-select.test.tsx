import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SourceAccessSelect } from "@/components/source-access-select";

describe("SourceAccessSelect", () => {
  afterEach(cleanup);

  it("keeps the selected access explanation associated with the control", () => {
    const { rerender } = render(
      <SourceAccessSelect value="OWNER_ONLY" onValueChange={vi.fn()} />,
    );

    expect(screen.getByRole("button")).toHaveAccessibleDescription(
      "只有发布此来源的节点可以从 Telegram 获取该文件。适合私密聊天、群组和频道；其他节点不会收到消息定位信息。",
    );

    rerender(<SourceAccessSelect value="PUBLIC" onValueChange={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveAccessibleDescription(
      "符合条件的节点可以从你提供的公开 t.me 消息 URL 获取该文件。仅当无需加群或额外授权即可访问该消息时使用。",
    );
  });

  it("updates one English detail panel as keyboard focus moves", async () => {
    render(<SourceAccessSelect value="OWNER_ONLY" onValueChange={vi.fn()} />);

    const trigger = screen.getByRole("button");
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });

    const members = await screen.findByRole("menuitemradio", {
      name: "持有独立证明的成员。其他节点只有在独立证明自己能访问同一 Telegram 来源后，才能获取该文件。仅属于同一用户或只是登录状态并不足够。",
    });
    fireEvent.focus(members);

    expect(
      screen.getByText(
        "其他节点只有在独立证明自己能访问同一 Telegram 来源后，才能获取该文件。仅属于同一用户或只是登录状态并不足够。",
      ),
    ).toBeVisible();
  });
});
