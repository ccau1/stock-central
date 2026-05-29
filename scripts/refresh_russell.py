#!/usr/bin/env python3
"""
Refresh Russell index constituent lists from NASDAQ screener data.

Generates:
  packages/server/internal/data/russell_1000.json
  packages/server/internal/data/russell_2000.json

Usage:
  python3 scripts/refresh_russell.py
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

import requests

NASDAQ_SCREENER_URL = (
    "https://api.nasdaq.com/api/screener/stocks"
    "?tableonly=true&limit=10000&offset=0&download=true"
)

# Map duplicate share classes to canonical ticker
SHARE_CLASS_MAP = {
    "GOOG": "GOOGL",
    "FOX": "FOXA",
    "NWS": "NWSA",
    "BRK-A": "BRK-B",
    "BRK-B": "BRK-B",
    "BF-A": "BF-B",
    "BF-B": "BF-B",
    "UA": "UAA",
}

# Map NASDAQ screener sectors to our display sectors
SECTOR_MAP = {
    "Finance": "Financials",
    "Consumer Discretionary": "Consumer Discretionary",
    "Health Care": "Health Care",
    "Technology": "Information Technology",
    "Industrials": "Industrials",
    "Real Estate": "Real Estate",
    "Energy": "Energy",
    "Utilities": "Utilities",
    "Consumer Staples": "Consumer Staples",
    "Basic Materials": "Materials",
    "Telecommunications": "Communication Services",
    "Miscellaneous": "Other",
    "": "Other",
}

# Name patterns that indicate non-equity securities to skip
SKIP_PATTERNS = [
    "Notes", "Note ", "Bond", "Debenture", "Warrant", "Right ", "Unit ",
    "Depositary Shares", "Preferred Stock", "Preferred",
    "Cumulative Redeemable", "Perpetual Preferred",
    "Municipal Income Trust", "Closed-End Fund",
]


def fetch_nasdaq_screener() -> list[dict]:
    """Fetch all stocks from NASDAQ screener API."""
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }
    resp = requests.get(NASDAQ_SCREENER_URL, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", {}).get("rows", [])


def load_sp500_symbols(go_file_path: str) -> dict[str, str]:
    """Parse S&P 500 symbol->sector map from Go source file."""
    with open(go_file_path, "r") as f:
        content = f.read()
    matches = re.findall(r'"([A-Z-]+)"\s*:\s*"([^"]+)"', content)
    return {sym: sector for sym, sector in matches}


def filter_us_equities(rows: list[dict]) -> list[dict]:
    """Filter NASDAQ rows to US equities with positive market cap."""
    stocks = []
    for row in rows:
        country = row.get("country", "")
        market_cap = row.get("marketCap", "0")
        if not market_cap or market_cap == "":
            continue
        try:
            mc = float(market_cap)
        except (ValueError, TypeError):
            continue

        if country != "United States" or mc <= 0:
            continue

        symbol = row["symbol"].replace("/", "-")
        name = row.get("name", "")

        # Skip non-equity securities by name pattern
        if any(pattern in name for pattern in SKIP_PATTERNS):
            continue

        sector = SECTOR_MAP.get(row.get("sector", ""), "Other")
        stocks.append({
            "symbol": symbol,
            "name": name,
            "market_cap": mc,
            "sector": sector,
        })
    return stocks


def dedup_share_classes(stocks: list[dict]) -> list[dict]:
    """Apply explicit share-class mappings and remove duplicates."""
    result = []
    seen = set()
    for stock in stocks:
        sym = stock["symbol"]
        if sym in SHARE_CLASS_MAP:
            canonical = SHARE_CLASS_MAP[sym]
            if canonical in seen:
                continue
            sym = canonical
            stock["symbol"] = canonical
        if sym in seen:
            continue
        seen.add(sym)
        result.append(stock)
    return result


def build_russell_universes(
    stocks: list[dict], sp500: dict[str, str]
) -> tuple[dict[str, str], dict[str, str]]:
    """Build Russell 1000 and Russell 2000 maps."""
    # Sort by market cap descending
    stocks.sort(key=lambda x: x["market_cap"], reverse=True)

    russell1000 = {}
    russell2000 = {}

    # First, add all S&P 500 stocks that appear in our sorted list
    sp500_seen = set()
    for stock in stocks:
        sym = stock["symbol"]
        if sym in sp500 and sym not in sp500_seen:
            russell1000[sym] = sp500[sym]
            sp500_seen.add(sym)

    # Fill Russell 1000 to 1,000 with next largest non-S&P 500 stocks
    for stock in stocks:
        if len(russell1000) >= 1000:
            break
        sym = stock["symbol"]
        if sym not in russell1000:
            russell1000[sym] = stock["sector"]

    # Russell 2000 = next 2,000 stocks not in Russell 1000
    for stock in stocks:
        if len(russell2000) >= 2000:
            break
        sym = stock["symbol"]
        if sym not in russell1000 and sym not in russell2000:
            russell2000[sym] = stock["sector"]

    return russell1000, russell2000


def write_json(path: str, tickers: dict[str, str]) -> None:
    """Write ticker map to JSON with metadata."""
    data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "NASDAQ screener",
        "count": len(tickers),
        "tickers": tickers,
    }
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, sort_keys=False)
        f.write("\n")


def main() -> int:
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sp500_path = os.path.join(
        project_root,
        "packages", "server", "internal", "api", "heatmap_sp500.go",
    )
    data_dir = os.path.join(
        project_root,
        "packages", "server", "internal", "data",
    )

    print("Fetching NASDAQ screener data...")
    rows = fetch_nasdaq_screener()
    print(f"  Total rows: {len(rows)}")

    print("Filtering US equities...")
    stocks = filter_us_equities(rows)
    print(f"  US equities: {len(stocks)}")

    print("Deduplicating share classes...")
    stocks = dedup_share_classes(stocks)
    print(f"  After dedup: {len(stocks)}")

    print("Loading S&P 500 constituents...")
    sp500 = load_sp500_symbols(sp500_path)
    print(f"  S&P 500 symbols: {len(sp500)}")

    print("Building Russell universes...")
    russell1000, russell2000 = build_russell_universes(stocks, sp500)
    print(f"  Russell 1000: {len(russell1000)}")
    print(f"  Russell 2000: {len(russell2000)}")

    r1k_path = os.path.join(data_dir, "russell_1000.json")
    r2k_path = os.path.join(data_dir, "russell_2000.json")

    write_json(r1k_path, russell1000)
    write_json(r2k_path, russell2000)

    print(f"\nWritten:")
    print(f"  {r1k_path}")
    print(f"  {r2k_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
