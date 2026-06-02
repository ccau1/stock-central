import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

interface CollapsibleBoxProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
  badge?: string | number;
  width?: number;
  storageKey?: string;
  onToggle?: (isOpen: boolean) => void;
}

export default function CollapsibleBox({
  title,
  children,
  defaultOpen = true,
  onClose,
  badge,
  width = 320,
  storageKey,
  onToggle,
}: CollapsibleBoxProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) return stored === "true";
      } catch {
        // ignore
      }
    }
    return defaultOpen;
  });

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(next));
        } catch {
          // ignore
        }
      }
      onToggle?.(next);
      return next;
    });
  };

  return (
    <div
      className="bg-white rounded-t-lg border border-gray-200 shadow-lg overflow-hidden flex flex-col"
      style={{ width }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 cursor-pointer select-none"
        onClick={toggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">{title}</span>
          {badge != null && (
            <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isOpen ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronUp size={14} className="text-gray-400" />
          )}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      {isOpen && <div className="max-h-80 overflow-auto">{children}</div>}
    </div>
  );
}
