import { useState, useEffect } from "react";

export function useEditMode(storageKey: string) {
  const [isEditMode, setIsEditMode] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(isEditMode));
  }, [isEditMode, storageKey]);

  return { isEditMode, setIsEditMode };
}
