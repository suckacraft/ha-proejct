import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App.jsx";

vi.mock("../config/index.js", () => ({
  loadConfig: vi.fn().mockResolvedValue({
    clientName: "Test Home",
    logoUrl: "/logo.png",
    colours: { primary: "#2563eb", secondary: "#64748b" },
    rooms: [
      { id: "living-room", name: "Living Room", entityIds: [] },
      { id: "bedroom", name: "Bedroom", entityIds: [] },
    ],
    scenes: [],
  }),
}));

vi.mock("../hooks/useHA.js", () => ({
  useHA: vi.fn(),
}));

vi.mock("../hooks/useClock.js", () => ({
  useClock: vi.fn(() => new Date("2024-01-01T20:00:00")),
}));

describe("App shell", () => {
  it("renders the client name on the home screen", async () => {
    render(<App />);
    expect(await screen.findByText("Test Home")).toBeInTheDocument();
  });

  it("renders favourite rooms on the home screen", async () => {
    render(<App />);
    expect(await screen.findByText("Living Room")).toBeInTheDocument();
    expect(screen.getByText("Bedroom")).toBeInTheDocument();
  });

  it("renders bottom nav with all five tabs", async () => {
    render(<App />);
    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Rooms")).toBeInTheDocument();
    expect(screen.getByText("Scenes")).toBeInTheDocument();
    expect(screen.getByText("Cameras")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
