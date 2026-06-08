import { create } from "zustand";
import { savePreference } from "../lib/savePreference.js";

export const usePreferencesStore = create((set, get) => ({
  favourites: [],
  roomDefaults: {}, // { [roomId]: { brightness: number } }
  homeFavourites: null, // null = show first 3 rooms from config; array of room IDs otherwise

  // Called once on mount with the full /api/preferences map.
  hydrate: (prefs = {}) =>
    set({
      favourites: prefs.favourites ?? [],
      roomDefaults: prefs.roomDefaults ?? {},
      homeFavourites: prefs.home_favourites ?? null,
    }),

  addFavourite: (fav) => {
    const next = [...get().favourites, fav];
    set({ favourites: next });
    savePreference("favourites", next).catch(console.error);
  },

  removeFavourite: (name) => {
    const next = get().favourites.filter((f) => f.name !== name);
    set({ favourites: next });
    savePreference("favourites", next).catch(console.error);
  },

  saveRoomDefault: (roomId, brightness) => {
    const next = { ...get().roomDefaults, [roomId]: { brightness } };
    set({ roomDefaults: next });
    savePreference("roomDefaults", next).catch(console.error);
  },

  clearRoomDefault: (roomId) => {
    const { [roomId]: _, ...rest } = get().roomDefaults;
    set({ roomDefaults: rest });
    savePreference("roomDefaults", rest).catch(console.error);
  },

  setHomeFavourites: (roomIds) => {
    set({ homeFavourites: roomIds });
    savePreference("home_favourites", roomIds).catch(console.error);
  },
}));
