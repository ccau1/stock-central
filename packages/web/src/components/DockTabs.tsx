import RealTimeNewsBox from "./RealTimeNewsBox";
import MarketsBox from "./MarketsBox";
import ScreenDrawTool from "./ScreenDrawTool";

export default function DockTabs() {
  return (
    <>
      {/* Desktop: both panels side by side, aligned to bottom-right */}
      <div className="hidden sm:flex items-end gap-2">
        <RealTimeNewsBox variant="desktop" />
        <MarketsBox variant="desktop" />
        <ScreenDrawTool variant="desktop" />
      </div>

      {/* Mobile: pills to open either panel */}
      <div className="flex sm:hidden items-center gap-2">
        <RealTimeNewsBox variant="mobile" />
        <MarketsBox variant="mobile" />
        <ScreenDrawTool variant="mobile" />
      </div>
    </>
  );
}
