# Apple Journal AI

Export Apple Journal entries to markdown files for analysis via Claude Projects.

## Web App

**Try it online:** [https://dhanjit.github.io/apple-journal-ai](https://dhanjit.github.io/apple-journal-ai)

- Drop your AppleJournalEntries folder
- Download markdown instantly
- 100% client-side - your data never leaves your browser

## Features

- Parses Apple Journal HTML exports
- Extracts text content and mood tags
- Generates per-year markdown files
- Creates combined `journal_full.md` for easy upload
- Outputs export statistics

## CLI Usage

For local command-line usage:

```bash
# Clone repository
git clone https://github.com/dhanjit/apple-journal-ai.git
cd apple-journal-ai

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install beautifulsoup4 lxml

# Run export
python export.py
```

## Output

```
output/
├── journal_2021.md      # Per-year exports
├── journal_2022.md
├── journal_2023.md
├── journal_2024.md
├── journal_2025.md
├── journal_2026.md
├── journal_full.md      # All entries combined
└── stats.txt            # Export statistics
```

## Requirements

- Python 3.11+ (CLI)
- Modern browser (Web App)
- Apple Journal entries exported as HTML

## License

MIT
