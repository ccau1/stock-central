import type { PanelDefinition } from "./types";

const panelModules = import.meta.glob("../*/index.tsx");

const registry = new Map<string, PanelDefinition>();
let loadPromise: Promise<void> | null = null;

function isPanelDefinition(val: unknown): val is PanelDefinition {
  return (
    typeof val === "object" &&
    val !== null &&
    "id" in val &&
    typeof (val as any).id === "string" &&
    "component" in val &&
    typeof (val as any).component === "function"
  );
}

async function ensureLoaded(): Promise<void> {
  if (loadPromise) return loadPromise;
  if (registry.size > 0) return;

  loadPromise = Promise.all(
    Object.entries(panelModules).map(async ([, loader]) => {
      const mod = (await loader()) as Record<string, unknown>;
      for (const key in mod) {
        const val = mod[key];
        if (isPanelDefinition(val)) {
          registry.set(val.id, val);
          break; // one panel per file
        }
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
  return Array.from(registry.values()).filter((p) =>
    category === "others"
      ? !p.categories || p.categories.length === 0
      : p.categories?.includes(category) ?? false
  );
}
