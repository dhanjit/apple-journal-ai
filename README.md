# Apple Journal AI

Export Apple Journal entries to markdown files for analysis via Claude Projects.

## Features

- Parses Apple Journal HTML exports
- Extracts text content and mood tags
- Generates per-year markdown files
- Creates combined `journal_full.md` for easy upload
- Outputs export statistics

## Installation

```bash
# Clone repository
git clone https://github.com/dhanjit/apple-journal-ai.git
cd apple-journal-ai

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install beautifulsoup4 lxml
```

## Usage

1. Export your Apple Journal entries to `~/Documents/AppleJournalEntries/`

2. Run the export script:
   ```bash
   source .venv/bin/activate
   python export.py
   ```

3. Upload files from `output/` to Claude Projects

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

- Python 3.11+
- Apple Journal entries exported as HTML

## License

MIT
