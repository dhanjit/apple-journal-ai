# Apple Journal AI

## Overview

A tool to export Apple Journal entries to markdown files for analysis via Claude Projects.

## Architecture

```
apple-journal-ai/
├── export.py           # Main export script
├── output/             # Generated markdown files (gitignored)
│   ├── journal_YYYY.md # Per-year exports
│   ├── journal_full.md # Complete journal
│   └── stats.txt       # Export statistics
└── .venv/              # Python virtual environment
```

## Setup

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install beautifulsoup4 lxml
```

## Usage

```bash
# Activate environment and run export
source .venv/bin/activate
python export.py
```

Output files are created in `./output/` ready for Claude Projects upload.

## Data Source

- **Location**: `~/Documents/AppleJournalEntries/Entries/`
- **Format**: HTML files named `YYYY-MM-DD.html`
- **Content**: Personal journal entries with optional mood tags

## Dependencies

- Python 3.11+
- beautifulsoup4
- lxml

## Code Style

- Use type hints where practical
- Keep functions focused and small
- Use pathlib for file operations

## Testing

Currently manual testing only. Run export and verify output files.

## Release Procedure

Releases are automated via GitHub Actions on push to master:
1. Merge changes to master
2. GitHub Actions creates a release with auto-generated changelog
