import { create } from "zustand";

export const useEntityStore = create((set) => ({
  entities: new Map(),

  setEntity: (entity) =>
    set((state) => {
      const next = new Map(state.entities);
      next.set(entity.id, entity);
      return { entities: next };
    }),

  removeEntity: (id) =>
    set((state) => {
      const next = new Map(state.entities);
      next.delete(id);
      return { entities: next };
    }),
}));
