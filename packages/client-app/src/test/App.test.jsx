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
  }),
}));

vi.mock("../hooks/useHA.js", () => ({
  useHA: vi.fn(),
}));

describe("App shell", () => {
  it("renders the client name in the header", async () => {
    render(<App />);
    expect(await screen.findByText("Test Home")).toBeInTheDocument();
  });

  it("renders a card for each room in the config", async () => {
    render(<App />);
    expect(await screen.findByText("Living Room")).toBeInTheDocument();
    expect(screen.getByText("Bedroom")).toBeInTheDocument();
  });

  it("renders bottom nav with all four tabs", async () => {
    render(<App />);
    expect(await screen.findByText("Rooms")).toBeInTheDocument();
    expect(screen.getByText("Scenes")).toBeInTheDocument();
    expect(screen.getByText("Cameras")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
