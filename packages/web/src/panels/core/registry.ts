import type { PanelDefinition } from "./types";

const categoryModules = import.meta.glob("../categories/*/index.ts");

const registry = new Map<string, PanelDefinition>();
let loadPromise: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
  if (loadPromise) return loadPromise;
  if (registry.size > 0) return;

  loadPromise = Promise.all(
    Object.entries(categoryModules).map(async ([, loader]) => {
      const mod = (await loader()) as { panels?: PanelDefinition[] };
      if (mod.panels) {
        mod.panels.forEach((p) => registry.set(p.id, p));
      }
    })
  ).then(() => {
    /* loaded */
  });

  return loadPromise;
}

export async function getPanelType(id: string): Promise<PanelDefinition | undefined> {
  await ensureLoaded();
  return registry.get(id);
}

export function isRegistryLoaded(): boolean {
  return registry.size > 0;
}

export async function getAllPanelTypes(): Promise<PanelDefinition[]> {
  await ensureLoaded();
  return Array.from(registry.values());
}

export async function getPanelsByCategory(category: string): Promise<PanelDefinition[]> {
  await ensureLoaded();
  return Array.from(registry.values()).filter((p) => p.category === category);
}
