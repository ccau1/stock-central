import { useState } from "react";
import { Pencil } from "lucide-react";
import DrawingCanvas from "./draw/DrawingCanvas";

interface ScreenDrawToolProps {
  variant?: "desktop" | "mobile";
}

export default function ScreenDrawTool({ variant = "desktop" }: ScreenDrawToolProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);

  function openOverlay() {
    setOpenCount((prev) => prev + 1);
    setIsOpen(true);
  }

  function closeOverlay() {
    setIsOpen(false);
  }

  function toggleOverlay() {
    if (isOpen) {
      closeOverlay();
    } else {
      openOverlay();
    }
  }

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={toggleOverlay}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
            isOpen
              ? "bg-blue-600 text-white"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          <Pencil size={12} />
          Draw
        </button>
        {isOpen && <DrawingCanvas key={openCount} isOpen={isOpen} onClose={closeOverlay} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleOverlay}
        title={isOpen ? "Close drawing tools" : "Open drawing tools"}
        className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-lg border transition-colors mb-2 mr-2 ${
          isOpen
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-gray-900 text-white border-gray-800 hover:bg-gray-800"
        }`}
      >
        <Pencil size={18} />
      </button>
      {isOpen && <DrawingCanvas key={openCount} isOpen={isOpen} onClose={closeOverlay} />}
    </>
  );
}
