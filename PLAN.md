# Apple Journal AI - Implementation Plan

## Overview
Export Apple Journal entries to clean markdown files for analysis via Claude Projects.

## Data Source
- **Location**: `~/Documents/AppleJournalEntries/Entries/`
- **Format**: 595 HTML files (one per day, named `YYYY-MM-DD.html`)
- **Content**: Personal reflections, lists, emotions, daily activities
- **Media**: Photos, videos with JSON metadata in `Resources/` (not included in export)

## Output
```
output/
├── journal_2021.md      # All 2021 entries
├── journal_2022.md      # All 2022 entries
├── journal_2023.md      # All 2023 entries
├── journal_2024.md      # All 2024 entries
├── journal_2025.md      # All 2025 entries (if any)
└── stats.txt            # Entry counts, word counts per year
```

### Output Format
```markdown
## 2023-05-01

Today I felt anxious about the upcoming presentation...

---

## 2023-05-02

Had a great conversation with...
```

## Architecture
```
apple-journal-ai/
├── PLAN.md
├── export.py            # Single-file script
└── output/              # Generated markdown files
```

## Implementation

### 1. HTML Parser
- Use BeautifulSoup4 to parse HTML files
- Extract body text, clean HTML artifacts
- Preserve paragraph structure
- Strip style tags and metadata

### 2. Export Script (`export.py`)
- Read all HTML files from Entries directory
- Parse and extract clean text
- Group entries by year
- Write markdown files per year
- Generate stats summary

## Dependencies
- Python 3.11+
- beautifulsoup4
- lxml (HTML parser)

## Usage
```bash
uv run export.py
```

Output files will be created in `./output/` ready for Claude Projects upload.
