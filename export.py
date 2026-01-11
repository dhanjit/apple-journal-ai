#!/usr/bin/env python3
"""Export Apple Journal entries to markdown files for Claude Projects."""

import re
from collections import defaultdict
from pathlib import Path

from bs4 import BeautifulSoup

# Configuration
JOURNAL_PATH = Path.home() / "Documents" / "AppleJournalEntries" / "Entries"
OUTPUT_PATH = Path(__file__).parent / "output"


def parse_entry(html_path: Path) -> dict | None:
    """Parse a single HTML journal entry and extract text content."""
    with open(html_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "lxml")

    # Extract date from filename (YYYY-MM-DD format)
    # Handle files like 2026-01-10_(1).html
    date_match = re.match(r"(\d{4}-\d{2}-\d{2})", html_path.stem)
    if not date_match:
        return None
    date = date_match.group(1)

    # Extract mood if present (from stateOfMind asset)
    mood = None
    mood_elem = soup.select_one(".assetType_stateOfMind .gridItemOverlayHeader")
    if mood_elem:
        mood = mood_elem.get_text(strip=True)

    # Extract body text from paragraphs
    paragraphs = []
    for p in soup.select("p.p2"):
        text = p.get_text(strip=True)
        # Clean up Apple-converted-space artifacts
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            paragraphs.append(text)

    if not paragraphs:
        return None

    return {
        "date": date,
        "mood": mood,
        "text": "\n\n".join(paragraphs),
        "word_count": sum(len(p.split()) for p in paragraphs),
    }


def export_entries():
    """Export all journal entries to markdown files grouped by year."""
    OUTPUT_PATH.mkdir(exist_ok=True)

    # Parse all entries
    entries_by_year = defaultdict(list)
    total_entries = 0
    total_words = 0

    html_files = sorted(JOURNAL_PATH.glob("*.html"))
    print(f"Found {len(html_files)} HTML files")

    for html_path in html_files:
        entry = parse_entry(html_path)
        if entry:
            year = entry["date"][:4]
            entries_by_year[year].append(entry)
            total_entries += 1
            total_words += entry["word_count"]

    # Write markdown files per year
    stats = []
    all_entries = []

    for year in sorted(entries_by_year.keys()):
        entries = sorted(entries_by_year[year], key=lambda e: e["date"])
        year_words = sum(e["word_count"] for e in entries)
        all_entries.extend(entries)

        output_file = OUTPUT_PATH / f"journal_{year}.md"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(f"# Journal {year}\n\n")

            for entry in entries:
                f.write(f"## {entry['date']}\n")
                if entry["mood"]:
                    f.write(f"*Mood: {entry['mood']}*\n")
                f.write(f"\n{entry['text']}\n\n---\n\n")

        stats.append(f"{year}: {len(entries)} entries, {year_words:,} words")
        print(f"Written {output_file.name} ({len(entries)} entries)")

    # Write combined journal_full.md
    full_file = OUTPUT_PATH / "journal_full.md"
    with open(full_file, "w", encoding="utf-8") as f:
        f.write("# Complete Journal\n\n")
        for entry in all_entries:
            f.write(f"## {entry['date']}\n")
            if entry["mood"]:
                f.write(f"*Mood: {entry['mood']}*\n")
            f.write(f"\n{entry['text']}\n\n---\n\n")
    print(f"Written journal_full.md ({len(all_entries)} entries)")

    # Write stats
    stats_file = OUTPUT_PATH / "stats.txt"
    with open(stats_file, "w", encoding="utf-8") as f:
        f.write("Apple Journal Export Statistics\n")
        f.write("=" * 40 + "\n\n")
        for line in stats:
            f.write(line + "\n")
        f.write(f"\nTotal: {total_entries} entries, {total_words:,} words\n")

    print(f"\nExport complete: {total_entries} entries, {total_words:,} words")
    print(f"Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    export_entries()
