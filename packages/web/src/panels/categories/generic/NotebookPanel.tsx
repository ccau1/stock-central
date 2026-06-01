import { useState, useCallback, useEffect } from "react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { PanelContainer } from "../../core";

export function NotebookPanel({ title, inputs, onRefresh, description }: PanelProps) {
  const [text, setText] = useState<string>(inputs.notes || "");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setText(inputs.notes || "");
    setSaved(true);
  }, [inputs.notes]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    inputs.notes = text;
    setSaved(true);
  }, [text, inputs]);

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={false} description={description}>
      <div className="flex flex-col h-full">
        <textarea
          value={text}
          onChange={handleChange}
          className="flex-1 min-h-0 w-full resize-none bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          placeholder="Type your notes here..."
          spellCheck={false}
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[10px] ${saved ? "text-green-600" : "text-gray-400"}`}>
            {saved ? "Saved" : "Unsaved changes"}
          </span>
          <button
            onClick={handleSave}
            className="text-[10px] font-medium px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </PanelContainer>
  );
}

export const notebookPanel: PanelDefinition = {
  id: "notebook",
  name: "Notebook",
  description: "A simple notepad for jotting down ideas and observations.",
  category: "generic",
  component: NotebookPanel,
  filterConfig: { tickerMode: "none" },
};
