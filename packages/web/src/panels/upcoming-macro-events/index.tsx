import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import type { MacroEvent } from "../../lib/api";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import { formatUsDateShort, formatUsDateFull, daysUntilUsDate } from "../../lib/usTime";

function formatEventDate(dateStr: string): string {
  const diff = daysUntilUsDate(dateStr);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatUsDateShort(dateStr);
}

function formatEventDateFull(dateStr: string): string {
  return formatUsDateFull(dateStr);
}

function impactColor(impact: string): string {
  switch (impact) {
    case "high":
      return "bg-red-100 text-red-700 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function categoryIcon(category: string): string {
  switch (category) {
    case "monetary":
      return "🏦";
    case "employment":
      return "💼";
    case "inflation":
      return "📈";
    case "activity":
      return "🏭";
    case "sentiment":
      return "📊";
    default:
      return "📅";
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case "monetary":
      return "Monetary Policy";
    case "employment":
      return "Employment";
    case "inflation":
      return "Inflation";
    case "activity":
      return "Economic Activity";
    case "sentiment":
      return "Sentiment";
    default:
      return category;
  }
}

function eventDescription(event: MacroEvent): string {
  switch (event.category) {
    case "monetary":
      return "The Federal Open Market Committee (FOMC) announces its target for the federal funds rate and releases a policy statement. This decision affects borrowing costs across the economy and often moves equity, bond, and currency markets.";
    case "employment":
      return "The monthly jobs report tracks nonfarm payroll employment, unemployment rate, and wage growth. It is a leading signal of labor market health and heavily influences Fed policy expectations.";
    case "inflation":
      return "This release measures changes in consumer or producer prices. Inflation data is a key input for Fed rate decisions and can shift expectations for interest rates and real returns.";
    case "activity":
      return "This indicator tracks the pace of real economic activity, such as manufacturing activity or retail spending. It helps gauge business cycle momentum and demand strength.";
    case "sentiment":
      return "This survey-based indicator captures consumer or business confidence. Sentiment readings can foreshadow changes in spending, saving, and hiring behavior.";
    default:
      return "Upcoming macroeconomic announcement that may influence financial markets.";
  }
}

function EventDetailModal({ event, onClose }: { event: MacroEvent; onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg" aria-hidden="true">
              {categoryIcon(event.category)}
            </span>
            <h3 className="text-sm font-bold text-gray-900 truncate">{event.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded shrink-0"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Date</span>
            <span className="text-xs font-medium text-gray-900">{formatEventDateFull(event.date)}</span>
          </div>
          {event.time && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Time</span>
              <span className="text-xs font-medium text-gray-900">{event.time}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Category</span>
            <span className="text-xs font-medium text-gray-900">{categoryLabel(event.category)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Impact</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${impactColor(
                event.impact
              )}`}
            >
              {event.impact}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-600 leading-relaxed">{eventDescription(event)}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function UpcomingMacroEventsPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getUpcomingMacroEvents(45),
    [refreshKey]
  );

  const [selectedEvent, setSelectedEvent] = useState<MacroEvent | null>(null);
  const events = useMemo(() => data ?? [], [data]);

  if (loading && !data) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}>
        <PanelLoading />
      </PanelContainer>
    );
  }

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}

      {events.length > 0 ? (
        <div className="flex items-center gap-2 h-full overflow-x-auto overflow-y-hidden thin-scrollbar">
          {events.map((event, idx) => (
            <button
              key={`${event.date}-${event.name}-${idx}`}
              onClick={() => setSelectedEvent(event)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 rounded-md px-2 py-1 border border-gray-100 text-left"
              title={`${event.name} (${categoryLabel(event.category)})`}
            >
              <span className="text-sm leading-none" aria-hidden="true">
                {categoryIcon(event.category)}
              </span>
              <span className="text-xs font-semibold text-gray-900 truncate">{event.name}</span>
              <span className="text-[10px] text-gray-500 whitespace-nowrap">
                {formatEventDate(event.date)}
                {event.time && ` • ${event.time}`}
              </span>
              <span
                className={`text-[9px] px-1 py-0.5 rounded border font-medium uppercase ${impactColor(
                  event.impact
                )}`}
              >
                {event.impact}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-2">No upcoming macro events in the next 45 days.</div>
      )}

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </PanelContainer>
  );
}

export const upcomingMacroEventsPanel: PanelDefinition = {
  id: "upcoming-macro-events",
  name: "Upcoming Macro Events",
  description: "Upcoming financial announcements including FOMC decisions, jobs reports, CPI/PPI releases, and other key macro events.",
  categories: ["macro"],
  component: UpcomingMacroEventsPanel,
  filterConfig: { tickerMode: "none" },
};
