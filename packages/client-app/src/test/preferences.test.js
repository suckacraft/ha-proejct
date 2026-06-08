import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePreferencesStore } from "../store/preferences.js";

vi.mock("../lib/savePreference.js", () => ({
  savePreference: vi.fn().mockResolvedValue(undefined),
}));

import { savePreference } from "../lib/savePreference.js";

beforeEach(() => {
  usePreferencesStore.setState({ favourites: [], roomDefaults: {} });
  vi.clearAllMocks();
});

describe("preferences store: hydrate", () => {
  it("populates favourites and roomDefaults from the preferences map", () => {
    const fav = { name: "Sunset", type: "hs", value: [24, 90] };
    usePreferencesStore
      .getState()
      .hydrate({
        favourites: [fav],
        roomDefaults: { bedroom: { brightness: 30 } },
      });
    const { favourites, roomDefaults } = usePreferencesStore.getState();
    expect(favourites).toEqual([fav]);
    expect(roomDefaults.bedroom.brightness).toBe(30);
  });

  it("defaults to empty arrays/objects when keys are absent", () => {
    usePreferencesStore.getState().hydrate({});
    const { favourites, roomDefaults } = usePreferencesStore.getState();
    expect(favourites).toEqual([]);
    expect(roomDefaults).toEqual({});
  });

  it("defaults gracefully when called with no argument", () => {
    usePreferencesStore.getState().hydrate();
    expect(usePreferencesStore.getState().favourites).toEqual([]);
  });
});

describe("preferences store: favourites", () => {
  it("addFavourite appends to the list and persists", () => {
    const fav = { name: "Sunset", type: "hs", value: [24, 90] };
    usePreferencesStore.getState().addFavourite(fav);
    const { favourites } = usePreferencesStore.getState();
    expect(favourites).toHaveLength(1);
    expect(favourites[0]).toEqual(fav);
    expect(savePreference).toHaveBeenCalledWith("favourites", favourites);
  });

  it("addFavourite preserves existing entries", () => {
    const fav1 = { name: "A", type: "hs", value: [0, 100] };
    const fav2 = { name: "B", type: "hs", value: [120, 80] };
    usePreferencesStore.getState().addFavourite(fav1);
    usePreferencesStore.getState().addFavourite(fav2);
    expect(usePreferencesStore.getState().favourites).toHaveLength(2);
  });

  it("removeFavourite removes by name and persists", () => {
    usePreferencesStore.setState({
      favourites: [{ name: "Sunset", type: "hs", value: [24, 90] }],
    });
    usePreferencesStore.getState().removeFavourite("Sunset");
    expect(usePreferencesStore.getState().favourites).toHaveLength(0);
    expect(savePreference).toHaveBeenCalledWith("favourites", []);
  });

  it("removeFavourite is a no-op for an unknown name", () => {
    usePreferencesStore.setState({
      favourites: [{ name: "Sunset", type: "hs", value: [24, 90] }],
    });
    usePreferencesStore.getState().removeFavourite("Not There");
    expect(usePreferencesStore.getState().favourites).toHaveLength(1);
  });
});

describe("preferences store: room defaults", () => {
  it("saveRoomDefault creates a room entry and persists", () => {
    usePreferencesStore.getState().saveRoomDefault("living-room", 60);
    const { roomDefaults } = usePreferencesStore.getState();
    expect(roomDefaults["living-room"]).toEqual({ brightness: 60 });
    expect(savePreference).toHaveBeenCalledWith("roomDefaults", roomDefaults);
  });

  it("saveRoomDefault upserts without clobbering other rooms", () => {
    usePreferencesStore.setState({
      roomDefaults: { bedroom: { brightness: 30 } },
    });
    usePreferencesStore.getState().saveRoomDefault("living-room", 70);
    const { roomDefaults } = usePreferencesStore.getState();
    expect(roomDefaults.bedroom.brightness).toBe(30);
    expect(roomDefaults["living-room"].brightness).toBe(70);
  });

  it("clearRoomDefault removes the entry and persists", () => {
    usePreferencesStore.setState({
      roomDefaults: { bedroom: { brightness: 30 } },
    });
    usePreferencesStore.getState().clearRoomDefault("bedroom");
    const { roomDefaults } = usePreferencesStore.getState();
    expect(roomDefaults).not.toHaveProperty("bedroom");
    expect(savePreference).toHaveBeenCalledWith("roomDefaults", {});
  });

  it("clearRoomDefault is a no-op for an unknown room", () => {
    usePreferencesStore.getState().clearRoomDefault("nowhere");
    expect(savePreference).toHaveBeenCalledWith("roomDefaults", {});
  });
});
