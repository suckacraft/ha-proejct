import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FallbackTile from "../components/devices/FallbackTile.jsx";

describe("FallbackTile", () => {
  it("shows entity name and state", () => {
    render(
      <FallbackTile
        entity={{
          id: "lock.front",
          domain: "lock",
          name: "Front Door",
          state: "locked",
          attributes: {},
          lastChanged: null,
        }}
      />,
    );
    expect(screen.getByText("Front Door")).toBeInTheDocument();
    expect(screen.getByText("locked")).toBeInTheDocument();
  });

  it("renders any state string", () => {
    render(
      <FallbackTile
        entity={{
          id: "media_player.tv",
          domain: "media_player",
          name: "TV",
          state: "playing",
          attributes: {},
          lastChanged: null,
        }}
      />,
    );
    expect(screen.getByText("TV")).toBeInTheDocument();
    expect(screen.getByText("playing")).toBeInTheDocument();
  });
});
