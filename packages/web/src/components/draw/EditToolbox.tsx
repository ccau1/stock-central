import { Trash2 } from "lucide-react";

interface EditToolboxProps {
  onDelete: () => void;
}

export default function EditToolbox({ onDelete }: EditToolboxProps) {
  return (
    <div
      className="edit-toolbox fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 rounded-xl bg-gray-900/95 px-3 py-2 shadow-2xl border border-gray-700/50 backdrop-blur-sm"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}
