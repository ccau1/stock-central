import { Download, Copy, Check } from "lucide-react";

interface ScreenCaptureToolboxProps {
  copied: boolean;
  onDownload: () => void;
  onCopy: () => void;
}

export default function ScreenCaptureToolbox({ copied, onDownload, onCopy }: ScreenCaptureToolboxProps) {
  return (
    <div
      className="screen-capture-toolbox fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 rounded-xl bg-gray-900/95 px-3 py-2 shadow-2xl border border-gray-700/50 backdrop-blur-sm"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onDownload}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors"
      >
        <Download size={14} />
        Download
      </button>
      <button
        type="button"
        onClick={onCopy}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          copied
            ? "bg-green-600 text-white hover:bg-green-500"
            : "bg-gray-700 text-white hover:bg-gray-600"
        }`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
