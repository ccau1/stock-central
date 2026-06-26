# Technical Patterns

Technical patterns are recognizable shapes that price action forms on a chart. Traders use them to anticipate where a trend might continue or reverse. Like candlestick signals, patterns are about probability, not certainty.

Patterns work best when they form over longer timeframes and are confirmed by volume. A pattern on a 5-minute chart is far less reliable than the same pattern on a daily or weekly chart.

## Reversal Patterns

These patterns suggest an existing trend may be ending.

### Head and Shoulders

A topping pattern that signals a potential reversal to the downside. It has three peaks:

- **Left shoulder:** a peak followed by a dip.
- **Head:** a higher peak followed by a dip.
- **Right shoulder:** a lower peak that roughly matches the left shoulder.

The **neckline** connects the two dips. A break below the neckline, ideally on increased volume, confirms the pattern.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Head and Shoulders</text>
  <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="20,140 50,100 80,120 120,50 160,120 200,95 240,140"/>
  <line x1="80" y1="120" x2="160" y2="120" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="240" y1="95" x2="240" y2="160" stroke="#ef4444" stroke-width="2" marker-end="url(#redarrow)"/>
  <text x="55" y="95" class="text-xs fill-gray-500">LS</text>
  <text x="115" y="40" class="text-xs fill-gray-500">H</text>
  <text x="195" y="90" class="text-xs fill-gray-500">RS</text>
  <text x="170" y="135" class="text-xs fill-gray-500">neckline</text>
  <defs>
    <marker id="redarrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/></marker>
  </defs>
</svg>

### Inverse Head and Shoulders

The mirror image of the head and shoulders. It forms after a downtrend and signals a potential reversal to the upside. A break above the neckline confirms it.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Inverse Head and Shoulders</text>
  <polyline fill="none" stroke="#10b981" stroke-width="2.5" points="20,60 50,120 80,100 120,150 160,100 200,120 240,50"/>
  <line x1="80" y1="100" x2="160" y2="100" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="240" y1="120" x2="240" y2="40" stroke="#10b981" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="55" y="135" class="text-xs fill-gray-500">LS</text>
  <text x="120" y="165" class="text-xs fill-gray-500">H</text>
  <text x="195" y="135" class="text-xs fill-gray-500">RS</text>
  <text x="170" y="95" class="text-xs fill-gray-500">neckline</text>
  <defs>
    <marker id="greenarrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 7, 10 3.5, 0 0" fill="#10b981"/></marker>
  </defs>
</svg>

### Double Top

Two peaks at roughly the same price level with a moderate dip between them. It resembles the letter “M” and suggests that buyers failed twice to push price higher. A break below the middle trough confirms the reversal.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Double Top</text>
  <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="20,130 60,60 100,120 160,60 220,120 260,160"/>
  <line x1="60" y1="60" x2="160" y2="60" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="100" y1="120" x2="220" y2="120" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="220" y1="120" x2="220" y2="165" stroke="#ef4444" stroke-width="2" marker-end="url(#redarrow2)"/>
  <text x="90" y="50" class="text-xs fill-gray-500">resistance</text>
  <text x="135" y="135" class="text-xs fill-gray-500">support</text>
  <defs>
    <marker id="redarrow2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/></marker>
  </defs>
</svg>

### Double Bottom

Two troughs at roughly the same price level with a moderate rally between them. It resembles the letter “W” and suggests sellers failed twice to push price lower. A break above the middle peak confirms the reversal.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Double Bottom</text>
  <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="20,60 60,130 100,80 160,130 220,80 260,40"/>
  <line x1="60" y1="130" x2="160" y2="130" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="100" y1="80" x2="220" y2="80" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="220" y1="80" x2="220" y2="35" stroke="#10b981" stroke-width="2" marker-end="url(#greenarrow2)"/>
  <text x="85" y="145" class="text-xs fill-gray-500">support</text>
  <text x="135" y="70" class="text-xs fill-gray-500">resistance</text>
  <defs>
    <marker id="greenarrow2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 7, 10 3.5, 0 0" fill="#10b981"/></marker>
  </defs>
</svg>

## Continuation Patterns

These patterns suggest a pause in the current trend, after which the trend is likely to resume.

### Ascending Triangle

A flat resistance line on top and a rising support line below. It forms in an uptrend and usually resolves with a breakout to the upside.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Ascending Triangle</text>
  <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="20,150 60,130 100,140 140,110 180,125 220,105 260,60"/>
  <line x1="20" y1="110" x2="260" y2="110" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="20,150 80,140 140,125 220,105 250,90"/>
  <line x1="250" y1="90" x2="250" y2="45" stroke="#10b981" stroke-width="2" marker-end="url(#greenarrow3)"/>
  <text x="190" y="100" class="text-xs fill-gray-500">resistance</text>
  <text x="40" y="165" class="text-xs fill-gray-500">rising support</text>
  <defs>
    <marker id="greenarrow3" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 7, 10 3.5, 0 0" fill="#10b981"/></marker>
  </defs>
</svg>

### Descending Triangle

A flat support line below and a falling resistance line above. It forms in a downtrend and usually resolves with a breakdown to the downside.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Descending Triangle</text>
  <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="20,50 60,70 100,55 140,85 180,70 220,95 260,140"/>
  <line x1="20" y1="90" x2="260" y2="90" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="20,50 80,65 140,80 220,95 250,105"/>
  <line x1="250" y1="105" x2="250" y2="160" stroke="#ef4444" stroke-width="2" marker-end="url(#redarrow3)"/>
  <text x="190" y="105" class="text-xs fill-gray-500">support</text>
  <text x="30" y="45" class="text-xs fill-gray-500">falling resistance</text>
  <defs>
    <marker id="redarrow3" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/></marker>
  </defs>
</svg>

### Symmetrical Triangle

Both support and resistance slope toward each other, forming a cone. The breakout direction is uncertain until it happens. Volume often shrinks inside the triangle and expands on the breakout.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Symmetrical Triangle</text>
  <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="20,60 60,110 100,70 140,100 180,80 220,95 260,50"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="20,60 140,80 260,50"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="20,140 140,95 260,150"/>
  <line x1="250" y1="60" x2="250" y2="35" stroke="#10b981" stroke-width="2" marker-end="url(#greenarrow4)"/>
  <text x="200" y="110" class="text-xs fill-gray-500">breakout direction unknown</text>
  <defs>
    <marker id="greenarrow4" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 7, 10 3.5, 0 0" fill="#10b981"/></marker>
  </defs>
</svg>

### Flags and Pennants

Both form after a strong price move and represent a brief consolidation.

- **Flag:** a small rectangular channel that slopes against the prior trend.
- **Pennant:** a small symmetrical triangle.

The pattern is confirmed when price breaks out in the direction of the original move.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="80" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Flag</text>
  <text x="240" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Pennant</text>
  <polyline fill="none" stroke="#10b981" stroke-width="2.5" points="20,150 50,90 90,95 130,85 170,40"/>
  <line x1="50" y1="95" x2="130" y2="85" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="60" y1="102" x2="120" y2="92" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <polyline fill="none" stroke="#10b981" stroke-width="2.5" points="180,150 210,90 230,105 250,80 270,40"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="210,90 250,80 270,55"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="210,105 250,95 270,95"/>
</svg>

## Wedge Patterns

Wedges are similar to triangles, but both boundary lines slope in the same direction.

### Rising Wedge

Both support and resistance slope upward, but the slope of support is steeper than resistance. It often forms in an uptrend and signals a potential reversal to the downside.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Rising Wedge</text>
  <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="20,150 60,120 100,130 140,100 180,110 220,80 260,95 280,130"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="20,150 100,130 180,110 260,70"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="20,120 100,105 180,90 260,60"/>
  <line x1="280" y1="95" x2="280" y2="150" stroke="#ef4444" stroke-width="2" marker-end="url(#redarrow4)"/>
  <defs>
    <marker id="redarrow4" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/></marker>
  </defs>
</svg>

### Falling Wedge

Both support and resistance slope downward, but the slope of resistance is steeper than support. It often forms in a downtrend and signals a potential reversal to the upside.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Falling Wedge</text>
  <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="20,40 60,70 100,55 140,90 180,75 220,110 260,90 280,50"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="20,40 100,60 180,80 260,110"/>
  <polyline fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" points="20,70 100,85 180,100 260,125"/>
  <line x1="280" y1="90" x2="280" y2="35" stroke="#10b981" stroke-width="2" marker-end="url(#greenarrow5)"/>
  <defs>
    <marker id="greenarrow5" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 7, 10 3.5, 0 0" fill="#10b981"/></marker>
  </defs>
</svg>

## Other Patterns

### Cup and Handle

A rounded “U” shaped bottom followed by a small consolidation that drifts downward, called the handle. A breakout above the handle signals a continuation of the prior uptrend.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="160" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Cup and Handle</text>
  <path fill="none" stroke="#3b82f6" stroke-width="2.5" d="M 40,60 Q 90,150 140,80 L 180,90 L 200,75 L 260,40"/>
  <line x1="40" y1="60" x2="200" y2="75" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="200" y1="75" x2="200" y2="30" stroke="#10b981" stroke-width="2" marker-end="url(#greenarrow6)"/>
  <text x="90" y="140" class="text-xs fill-gray-500">cup</text>
  <text x="170" y="105" class="text-xs fill-gray-500">handle</text>
  <defs>
    <marker id="greenarrow6" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 7, 10 3.5, 0 0" fill="#10b981"/></marker>
  </defs>
</svg>

### Rounding Bottom / Rounding Top

A gradual, curved transition from downtrend to uptrend (rounding bottom) or uptrend to downtrend (rounding top). These patterns develop slowly and reflect a gradual shift in control between buyers and sellers.

<svg viewBox="0 0 320 180" class="w-full max-w-md h-auto my-4 border border-gray-200 rounded-lg bg-white">
  <text x="80" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Rounding Bottom</text>
  <text x="240" y="20" text-anchor="middle" class="text-xs font-semibold fill-gray-700">Rounding Top</text>
  <path fill="none" stroke="#10b981" stroke-width="2.5" d="M 20,60 Q 80,160 140,80 L 160,50"/>
  <path fill="none" stroke="#ef4444" stroke-width="2.5" d="M 180,120 Q 240,20 300,100 L 320,130"/>
</svg>

## How to Use Patterns Responsibly

1. **Wait for confirmation.** Do not trade the pattern before it completes. A breakout or breakdown confirms it.
2. **Check volume.** A valid breakout usually comes with a noticeable volume increase.
3. **Measure the target.** Many patterns have a measured move based on the height of the formation. It is a rough guide, not a guarantee.
4. **Define your stop.** Place a stop loss on the other side of the pattern. If the pattern fails, exit quickly.
5. **Consider the trend.** Patterns that form in the direction of the larger trend are generally more reliable.

## Limitations

- Patterns fail. A breakout can reverse immediately, which is called a **fakeout**.
- Patterns look obvious in hindsight but messy in real time.
- Automated trading and algorithms can create false breakouts to trigger stop orders.
- Patterns should be combined with risk management, not used alone.

## Key Takeaways

- Reversal patterns hint that a trend may be ending.
- Continuation patterns hint that a trend is pausing before resuming.
- Wedges, triangles, and flags each have their own typical outcomes, but confirmation is essential.
- Always use patterns within a broader process that includes volume analysis, trend context, and risk management.
