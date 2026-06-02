import type { ReactNode } from "react";

interface BottomRightDockProps {
  children: ReactNode;
}

export default function BottomRightDock({ children }: BottomRightDockProps) {
  return (
    <>
      {/* Desktop: stacked boxes touching bottom-right */}
      <div className="hidden sm:flex fixed bottom-0 right-0 z-40 flex-col items-end pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-end gap-2 p-0">
          {children}
        </div>
      </div>

      {/* Mobile: horizontal scrollable bar at bottom */}
      <div className="flex sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-2 py-1.5 gap-2 overflow-x-auto pointer-events-auto">
        {children}
      </div>
    </>
  );
}
