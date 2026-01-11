// State
let processedData = null;

// DOM Elements
const dropzone = document.getElementById('dropzone');
const folderInput = document.getElementById('folderInput');
const status = document.getElementById('status');
const statusText = document.getElementById('statusText');
const results = document.getElementById('results');
const entryCount = document.getElementById('entryCount');
const wordCount = document.getElementById('wordCount');
const dateRange = document.getElementById('dateRange');
const downloadFull = document.getElementById('downloadFull');
const downloadZip = document.getElementById('downloadZip');
const resetBtn = document.getElementById('reset');

// Event Listeners
dropzone.addEventListener('click', () => folderInput.click());
dropzone.addEventListener('dragover', handleDragOver);
dropzone.addEventListener('dragleave', handleDragLeave);
dropzone.addEventListener('drop', handleDrop);
folderInput.addEventListener('change', handleFolderSelect);
downloadFull.addEventListener('click', handleDownloadFull);
downloadZip.addEventListener('click', handleDownloadZip);
resetBtn.addEventListener('click', handleReset);

function handleDragOver(e) {
    e.preventDefault();
    dropzone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropzone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    dropzone.classList.remove('dragover');

    const items = e.dataTransfer.items;
    if (items) {
        const files = [];
        for (const item of items) {
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                if (entry) {
                    collectFiles(entry, files).then(() => processFiles(files));
                    return;
                }
            }
        }
    }
}

function handleFolderSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

async function collectFiles(entry, files, path = '') {
    if (entry.isFile) {
        const file = await new Promise(resolve => entry.file(resolve));
        file.relativePath = path + entry.name;
        files.push(file);
    } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries = await new Promise(resolve => reader.readEntries(resolve));
        for (const e of entries) {
            await collectFiles(e, files, path + entry.name + '/');
        }
    }
}

async function processFiles(files) {
    showStatus('Finding journal entries...');

    // Filter for HTML files in Entries folder
    const htmlFiles = files.filter(f => {
        const path = f.relativePath || f.webkitRelativePath || f.name;
        return path.includes('Entries/') && path.endsWith('.html');
    });

    if (htmlFiles.length === 0) {
        showStatus('No journal entries found. Make sure you selected the AppleJournalEntries folder.');
        setTimeout(() => handleReset(), 3000);
        return;
    }

    showStatus(`Processing ${htmlFiles.length} entries...`);

    const entries = [];

    for (const file of htmlFiles) {
        const entry = await parseEntry(file);
        if (entry) {
            entries.push(entry);
        }
    }

    // Sort by date
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Group by year
    const byYear = {};
    for (const entry of entries) {
        const year = entry.date.substring(0, 4);
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(entry);
    }

    // Calculate stats
    const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);
    const years = Object.keys(byYear).sort();
    const range = years.length > 1
        ? `${years[0]}-${years[years.length - 1]}`
        : years[0] || '-';

    // Store processed data
    processedData = {
        entries,
        byYear,
        stats: {
            entries: entries.length,
            words: totalWords,
            range
        }
    };

    showResults();
}

async function parseEntry(file) {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    // Extract date from filename
    const path = file.relativePath || file.webkitRelativePath || file.name;
    const filename = path.split('/').pop();
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) return null;
    const date = dateMatch[1];

    // Extract mood if present
    let mood = null;
    const moodElem = doc.querySelector('.assetType_stateOfMind .gridItemOverlayHeader');
    if (moodElem) {
        mood = moodElem.textContent.trim();
    }

    // Extract body text
    const paragraphs = [];
    for (const p of doc.querySelectorAll('p.p2')) {
        let text = p.textContent.trim();
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        if (text) {
            paragraphs.push(text);
        }
    }

    if (paragraphs.length === 0) return null;

    const content = paragraphs.join('\n\n');
    const wordCount = content.split(/\s+/).length;

    return { date, mood, content, wordCount };
}

function generateMarkdown(entries, title = 'Complete Journal') {
    let md = `# ${title}\n\n`;

    for (const entry of entries) {
        md += `## ${entry.date}\n`;
        if (entry.mood) {
            md += `*Mood: ${entry.mood}*\n`;
        }
        md += `\n${entry.content}\n\n---\n\n`;
    }

    return md;
}

function showStatus(message) {
    dropzone.classList.add('hidden');
    results.classList.add('hidden');
    status.classList.remove('hidden');
    statusText.textContent = message;
}

function showResults() {
    dropzone.classList.add('hidden');
    status.classList.add('hidden');
    results.classList.remove('hidden');

    entryCount.textContent = processedData.stats.entries.toLocaleString();
    wordCount.textContent = processedData.stats.words.toLocaleString();
    dateRange.textContent = processedData.stats.range;
}

function handleReset() {
    processedData = null;
    folderInput.value = '';
    dropzone.classList.remove('hidden');
    status.classList.add('hidden');
    results.classList.add('hidden');
}

function handleDownloadFull() {
    const md = generateMarkdown(processedData.entries);
    downloadFile('journal_full.md', md);
}

async function handleDownloadZip() {
    const zip = new JSZip();

    // Add full journal
    zip.file('journal_full.md', generateMarkdown(processedData.entries));

    // Add per-year files
    for (const [year, entries] of Object.entries(processedData.byYear)) {
        const md = generateMarkdown(entries, `Journal ${year}`);
        zip.file(`journal_${year}.md`, md);
    }

    // Add stats
    let stats = 'Apple Journal Export Statistics\n';
    stats += '='.repeat(40) + '\n\n';
    for (const year of Object.keys(processedData.byYear).sort()) {
        const entries = processedData.byYear[year];
        const words = entries.reduce((sum, e) => sum + e.wordCount, 0);
        stats += `${year}: ${entries.length} entries, ${words.toLocaleString()} words\n`;
    }
    stats += `\nTotal: ${processedData.stats.entries} entries, ${processedData.stats.words.toLocaleString()} words\n`;
    zip.file('stats.txt', stats);

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob('apple-journal-export.zip', blob);
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown' });
    downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
