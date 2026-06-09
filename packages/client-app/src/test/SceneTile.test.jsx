import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SceneTile from "../components/scenes/SceneTile.jsx";
import SceneList from "../components/scenes/SceneList.jsx";

vi.mock("../lib/callService.js", () => ({
  callService: vi.fn().mockResolvedValue(undefined),
}));

import { callService } from "../lib/callService.js";

const SCENE = { id: "evening", name: "Evening", icon: "sunset", sceneId: "scene.evening" };

const SCENES = [
  { id: "morning", name: "Morning", icon: "sunrise", sceneId: "scene.morning" },
  { id: "sleep", name: "Sleep", icon: "moon", sceneId: "scene.sleep" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SceneTile", () => {
  it("renders scene name", () => {
    render(<SceneTile scene={SCENE} />);
    expect(screen.getByText("Evening")).toBeInTheDocument();
  });

  it("calls callService on click", () => {
    render(<SceneTile scene={SCENE} />);
    fireEvent.click(screen.getByRole("button", { name: /activate evening scene/i }));
    expect(callService).toHaveBeenCalledWith("scene", "turn_on", {
      entity_id: "scene.evening",
    });
  });

  it("applies flash class on click and removes it after 1500ms", () => {
    render(<SceneTile scene={SCENE} />);
    const btn = screen.getByRole("button", { name: /activate evening scene/i });

    fireEvent.click(btn);
    expect(btn.className).toMatch(/bg-\[--color-primary\]/);

    act(() => vi.advanceTimersByTime(1500));
    expect(btn.className).not.toMatch(/bg-\[--color-primary\]/);
  });
});

describe("SceneList", () => {
  it('shows "No scenes" when scenes array is empty', () => {
    render(<SceneList scenes={[]} />);
    expect(screen.getByText(/no scenes/i)).toBeInTheDocument();
  });

  it("renders a tile for each scene", () => {
    render(<SceneList scenes={SCENES} />);
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Sleep")).toBeInTheDocument();
  });
});
