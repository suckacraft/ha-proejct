import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomeScreen from "../components/home/HomeScreen.jsx";
import { useEntityStore } from "../store/entities.js";
import { usePreferencesStore } from "../store/preferences.js";

vi.mock("../lib/callService.js", () => ({
  callService: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/savePreference.js", () => ({
  savePreference: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../hooks/useClock.js", () => ({
  useClock: vi.fn(() => new Date("2024-01-01T20:00:00")),
}));

import { callService } from "../lib/callService.js";

const ROOMS = [
  { id: "living-room", name: "Living Room", entityIds: ["light.ceiling"] },
  { id: "bedroom", name: "Bedroom", entityIds: [] },
  { id: "kitchen", name: "Kitchen", entityIds: [] },
  { id: "office", name: "Office", entityIds: [] },
];

const SCENES = [
  { id: "evening", name: "Evening", icon: "sunset", sceneId: "scene.evening" },
  { id: "sleep", name: "Sleep", icon: "moon", sceneId: "scene.sleep" },
];

function renderHome(props = {}) {
  return render(
    <MemoryRouter>
      <HomeScreen
        rooms={ROOMS}
        scenes={SCENES}
        clientName="Test Home"
        firstName="Josh"
        {...props}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useEntityStore.setState({ entities: new Map() });
  usePreferencesStore.setState({
    homeFavourites: null,
    favourites: [],
    roomDefaults: {},
  });
  vi.clearAllMocks();
});

describe("HomeScreen", () => {
  it("shows client name", () => {
    renderHome();
    expect(screen.getByText("Test Home")).toBeInTheDocument();
  });

  it("shows evening greeting at 20:00", () => {
    renderHome();
    expect(screen.getByText("Good evening, Josh")).toBeInTheDocument();
  });

  it("shows first 3 rooms by default when homeFavourites is null", () => {
    renderHome();
    expect(screen.getByText("Living Room")).toBeInTheDocument();
    expect(screen.getByText("Bedroom")).toBeInTheDocument();
    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.queryByText("Office")).not.toBeInTheDocument();
  });

  it("shows favourite rooms from prefs when homeFavourites is set", () => {
    usePreferencesStore.setState({
      homeFavourites: ["office", "bedroom"],
      favourites: [],
      roomDefaults: {},
    });
    renderHome();
    expect(screen.getByText("Office")).toBeInTheDocument();
    expect(screen.getByText("Bedroom")).toBeInTheDocument();
    expect(screen.queryByText("Living Room")).not.toBeInTheDocument();
    expect(screen.queryByText("Kitchen")).not.toBeInTheDocument();
  });

  it("shows scene buttons", () => {
    renderHome();
    expect(
      screen.getByRole("button", { name: /evening/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sleep/i })).toBeInTheDocument();
  });

  it("triggers scene service on scene button click", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: /evening/i }));
    expect(callService).toHaveBeenCalledWith("scene", "turn_on", {
      entity_id: "scene.evening",
    });
  });

  it("shows active lights count when lights are on", () => {
    useEntityStore.setState({
      entities: new Map([
        [
          "light.one",
          {
            id: "light.one",
            domain: "light",
            name: "One",
            state: "on",
            attributes: {},
            lastChanged: null,
          },
        ],
        [
          "light.two",
          {
            id: "light.two",
            domain: "light",
            name: "Two",
            state: "on",
            attributes: {},
            lastChanged: null,
          },
        ],
      ]),
    });
    renderHome();
    expect(screen.getByText(/2 lights on/i)).toBeInTheDocument();
  });

  it("does not show lights pill when all lights are off", () => {
    renderHome();
    expect(screen.queryByText(/\d+ lights? on/i)).not.toBeInTheDocument();
  });

  it("shows weather widget when weather entity exists", () => {
    useEntityStore.setState({
      entities: new Map([
        [
          "weather.home",
          {
            id: "weather.home",
            domain: "weather",
            name: "Home Weather",
            state: "sunny",
            attributes: { temperature: 24, temperatureUnit: "°C" },
            lastChanged: null,
          },
        ],
      ]),
    });
    renderHome();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("does not show now playing section when no media_player is playing", () => {
    renderHome();
    expect(screen.queryByText(/now playing/i)).not.toBeInTheDocument();
  });

  it("shows now playing section when a media_player is playing", () => {
    useEntityStore.setState({
      entities: new Map([
        [
          "media_player.speaker",
          {
            id: "media_player.speaker",
            domain: "media_player",
            name: "Speaker",
            state: "playing",
            attributes: { mediaTitle: "Test Song", mediaArtist: "Test Artist" },
            lastChanged: null,
          },
        ],
      ]),
    });
    renderHome();
    expect(screen.getByText(/now playing/i)).toBeInTheDocument();
    expect(screen.getByText("Test Song")).toBeInTheDocument();
  });
});
