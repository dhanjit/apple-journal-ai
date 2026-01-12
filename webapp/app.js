// State
let processedData = null;
let moodChart = null;
let fileMap = new Map(); // Store all files for resource lookup

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
const timelineContainer = document.getElementById('timelineContainer');
const moodChartCanvas = document.getElementById('moodChart');
const showImagesToggle = document.getElementById('showImagesToggle');
// Chat Elements
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatHistory = document.getElementById('chatHistory');
const aiStatus = document.getElementById('aiStatus');
const aiStatusText = document.getElementById('aiStatusText');

// Tabs
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Event Listeners
dropzone.addEventListener('click', () => folderInput.click());
dropzone.addEventListener('dragover', handleDragOver);
dropzone.addEventListener('dragleave', handleDragLeave);
dropzone.addEventListener('drop', handleDrop);
folderInput.addEventListener('change', handleFolderSelect);
downloadFull.addEventListener('click', handleDownloadFull);
downloadZip.addEventListener('click', handleDownloadZip);
resetBtn.addEventListener('click', handleReset);
showImagesToggle.addEventListener('change', () => {
    if (processedData) renderTimeline();
});
// Chat Listeners
sendChatBtn.addEventListener('click', handleChatSubmit);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleChatSubmit();
    }
});

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Deactivate all
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Activate current
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.getElementById(`${target}-tab`).classList.add('active');

        // Render chart if analytics tab
        if (target === 'analytics' && processedData && !moodChart) {
            renderCharts();
        }

        // Initialize AI if chat tab
        if (target === 'chat' && processedData) {
            initAIChat();
        }
    });
});

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

    // Clear and populate file map for resource lookup
    fileMap.clear();
    files.forEach(f => {
        // Map by filename (approximate, might need better matching if duplicates exist)
        // Apple Journal exports usually have unique IDs in filenames
        fileMap.set(f.name, f);
    });

    // Filter for HTML files in Entries folder
    const htmlFiles = files.filter(f => {
        const path = f.webkitRelativePath || f.relativePath || f.name;
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

    // Sort by date (newest first for timeline)
    entries.sort((a, b) => b.date.localeCompare(a.date));

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

    renderTimeline();
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

    // Extract Title
    let title = 'Journal Entry';
    const titleElem = doc.querySelector('.title span.s2') || doc.querySelector('.title');
    if (titleElem) {
        title = titleElem.textContent.trim();
    }

    // Extract mood details
    let mood = null;
    let moodContext = null;
    let moodColor = null;

    const stateOfMind = doc.querySelector('.assetType_stateOfMind');
    if (stateOfMind) {
        const moodHeader = stateOfMind.querySelector('.gridItemOverlayHeader');
        const moodFooter = stateOfMind.querySelector('.gridItemOverlayFooter');

        if (moodHeader) mood = moodHeader.textContent.trim();
        if (moodFooter) moodContext = moodFooter.textContent.trim();
        moodColor = stateOfMind.style.backgroundColor;
    }

    // Extract First Image (Key Image)
    let imageUrl = null;
    try {
        const img = doc.querySelector('.asset_image');
        if (img) {
            const src = img.getAttribute('src');
            if (src) {
                // src is usually "../Resources/FILENAME.EXT"
                const imgFilename = src.split('/').pop();
                imageUrl = imgFilename;
            }
        }
    } catch (e) {
        console.error('Image parsing error', e);
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

    if (paragraphs.length === 0 && !mood && !imageUrl) return null;

    const content = paragraphs.join('\n\n');
    const wordCount = content.split(/\s+/).length;

    return {
        date,
        title,
        mood,
        moodContext,
        moodColor,
        imageUrl,
        content,
        wordCount
    };
}

function renderTimeline() {
    timelineContainer.innerHTML = '';
    const showImages = showImagesToggle.checked;

    // Filter entries that have mood or significant content? 
    // Let's show all, but highlight moods.
    const timelineEntries = processedData.entries; // Already sorted desc

    if (timelineEntries.length === 0) {
        timelineContainer.innerHTML = '<p style="text-align:center;color:#666;">No entries found.</p>';
        return;
    }

    timelineEntries.forEach(entry => {
        const dateObj = new Date(entry.date);
        const dateStr = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const item = document.createElement('div');
        item.className = 'timeline-item';

        let moodBadgeHtml = '';
        let dotColor = '#fff';

        if (entry.mood) {
            const bgColor = entry.moodColor || '#E3E9FC';
            dotColor = bgColor;
            // Calculate text color based on background mostly light so black is safe
            moodBadgeHtml = `
                <div class="mood-badge" style="background:${bgColor}">
                    ${entry.mood}
                    <span class="mood-context">${entry.moodContext || ''}</span>
                </div>
            `;
        }

        let imageHtml = '';
        if (showImages && entry.imageUrl) {
            const file = fileMap.get(entry.imageUrl);
            if (file) {
                const url = URL.createObjectURL(file);
                imageHtml = `
                    <div class="timeline-image">
                        <img src="${url}" loading="lazy" alt="Entry image">
                    </div>
                `;
            }
        }

        item.innerHTML = `
            <div class="timeline-dot" style="background:${dotColor}"></div>
            <div class="timeline-date">${dateStr}</div>
            <div class="timeline-card">
                <div class="timeline-title">${entry.title}</div>
                <div class="timeline-preview" style="color:#888;font-size:0.9rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">
                    ${entry.content}
                </div>
                ${moodBadgeHtml}
                ${imageHtml}
            </div>
        `;

        timelineContainer.appendChild(item);
    });
}

function renderCharts() {
    if (moodChart) {
        moodChart.destroy();
    }

    const moodCounts = {};
    processedData.entries.forEach(e => {
        if (e.mood) {
            moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        }
    });

    const labels = Object.keys(moodCounts);
    const data = Object.values(moodCounts);

    if (labels.length === 0) return;

    // Sort by count
    const sorted = labels.map((label, i) => ({ label, count: data[i] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

    const ctx = moodChartCanvas.getContext('2d');

    moodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(i => i.label),
            datasets: [{
                label: 'Top Moods',
                data: sorted.map(i => i.count),
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#333' },
                    ticks: { color: '#888' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#888' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function generateMarkdown(entries, title = 'Complete Journal') {
    let md = `# ${title}\n\n`;

    // Sort ascending for export (book style)
    const exportEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    for (const entry of exportEntries) {
        md += `## ${entry.date}\n`;
        if (entry.title && entry.title !== 'Journal Entry') {
            md += `### ${entry.title}\n`;
        }
        if (entry.mood) {
            md += `*Mood: ${entry.mood}`;
            if (entry.moodContext) md += ` (${entry.moodContext})`;
            md += `*\n`;
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

    // Reset tabs
    document.querySelector('[data-tab="overview"]').click();
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

// AI Chat Logic
let aiSession = null;
let aiAvailable = false;

async function initAIChat() {
    if (aiAvailable) return;

    if (!window.ai) {
        updateAIStatus('error', 'AI Not Supported');
        addMessage('system', '❌ <strong>AI Not Detected</strong><br>It looks like your browser doesn\'t support the Prompt API.<br><br>Please verify:<br>1. You are using Chrome Canary or Dev.<br>2. You have enabled <code>chrome://flags/#prompt-api-for-gemini-nano</code><br>3. You have enabled <code>chrome://flags/#optimization-guide-on-device-model</code>');
        return;
    }

    try {
        const capability = await window.ai.languageModel.capabilities();

        if (capability.available === 'no') {
            updateAIStatus('error', 'Model Not Ready');
            addMessage('system', '⚠️ <strong>Model Not Ready</strong><br>The AI model is not downloaded or available on this device yet.<br>Check <code>chrome://components</code> for "Optimization Guide On Device Model".');
            return;
        }

        updateAIStatus('loading', 'Initializing AI...');

        // Prepare context from journal entries
        const context = getJournalContext();
        const systemPrompt = `You are a helpful, private journal assistant. 
        Analyze the following journal entries to answer the user's questions. 
        Be empathetic and insightful. 
        Keep answers concise.
        
        Journal Entries:
        ${context}`;

        aiSession = await window.ai.languageModel.create({
            systemPrompt: systemPrompt
        });

        aiAvailable = true;
        updateAIStatus('ready', 'AI Ready');

    } catch (e) {
        console.error('AI Init Error:', e);
        updateAIStatus('error', 'AI Init Failed');
        addMessage('system', `Error initializing AI: ${e.message}`);
    }
}

function getJournalContext() {
    // Limit context to avoid token limits (approx 4 chars per token, safe limit ~3000 tokens for now)
    // We'll take the most recent entries up to ~10k chars
    let context = '';
    const limit = 12000;

    // Use sorted entries (newest first)
    for (const entry of processedData.entries) {
        const entryText = `Date: ${entry.date}\nMood: ${entry.mood || 'N/A'}\nContent: ${entry.content}\n\n`;
        if (context.length + entryText.length > limit) break;
        context += entryText;
    }

    return context;
}

async function handleChatSubmit() {
    const text = chatInput.value.trim();
    if (!text || !aiSession) return;

    // Add user message
    addMessage('user', text);
    chatInput.value = '';

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
        const stream = await aiSession.promptStreaming(text);

        let aiMsgElement = null;
        let accumulatedText = '';

        for await (const chunk of stream) {
            // Remove typing indicator on first chunk
            if (document.getElementById(typingId)) {
                removeTypingIndicator(typingId);
            }

            accumulatedText = chunk;

            if (!aiMsgElement) {
                aiMsgElement = createMessageElement('ai', '');
                chatHistory.appendChild(aiMsgElement);
            }

            // Render markdown-like text (simple replacement for now)
            aiMsgElement.querySelector('.message-content').innerHTML = formatAIResponse(accumulatedText);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

    } catch (e) {
        if (document.getElementById(typingId)) removeTypingIndicator(typingId);
        addMessage('error', 'Error generating response. Try again.');
        console.error(e);
    }
}

function addMessage(type, text) {
    const el = createMessageElement(type, text);
    chatHistory.appendChild(el);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function createMessageElement(type, text) {
    const div = document.createElement('div');
    div.className = `chat-message ${type}-message`;
    div.innerHTML = `<div class="message-content">${formatAIResponse(text)}</div>`;
    return div;
}

function formatAIResponse(text) {
    // Basic Markdown Formatting
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    return formatted;
}

function addTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'typing-indicator';
    div.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function updateAIStatus(state, text) {
    aiStatus.classList.remove('hidden');
    aiStatusText.textContent = text;

    const dot = aiStatus.querySelector('.status-dot');
    dot.className = 'status-dot'; // reset
    if (state === 'loading') dot.classList.add('loading');
    if (state === 'error') dot.classList.add('error');
}
