const STORAGE_KEY = "stockcentral_my_dashboards";

export function getMyDashboardIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

export function setMyDashboardIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function addMyDashboard(id: string) {
  const ids = getMyDashboardIds();
  if (!ids.includes(id)) {
    setMyDashboardIds([...ids, id]);
  }
}

export function removeMyDashboard(id: string) {
  const ids = getMyDashboardIds();
  setMyDashboardIds(ids.filter((i) => i !== id));
}

export function isMyDashboard(id: string): boolean {
  return getMyDashboardIds().includes(id);
}
