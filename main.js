const firebaseConfig = {
    apiKey: "AIzaSyDa5BLDx7qpepLpUkieA2Fg6M_QBiL_c9o",
    authDomain: "neet-2026-omr.firebaseapp.com",
    projectId: "neet-2026-omr",
    storageBucket: "neet-2026-omr.firebasestorage.app",
    messagingSenderId: "720446130844",
    appId: "1:720446130844:web:c0a0048354ab506ee2bb59"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global References
let globalCSVText = "";
let extractedAppNumber = "";
let extractedFullName = "";
let extractedSetCode = "";

// AUTO-RESTORE PERSISTENT DATA ON LOAD
window.addEventListener('load', function() {
    const savedCSV = localStorage.getItem('savedOMR_CSV');
    if (savedCSV) {
        globalCSVText = savedCSV;
        processMetrics(savedCSV);
        window.showSection('resultsSection', false);
    }
});

const officialKeysMaster = { "50": {}, "60": {}, "70": {}, "80": {} };
const rawKeys = {
    "50": "4|4|4|3|1|3|1|1|4|4|1|1|3|2|2|2|3|1|3|3|4|2|3|3|4|Bonus|2|2|2|1|3|2|2|3|3|1|1|2, 3|3|4|1|3|3|3|1|3|3|1|1|3|3|4|3|3|3|2|1|1|4|2|1|1|1|3|4|1|4|4|1|1|1|4|1|1|2|4|1|1|2|2|2|1|1|1|1|4|3|3|4|4|3|1|1|4|4|1|2|2|2|2|1|2|1|3|1|2|3|1|4|1|1|4|1|2|2|4|4|4|1|4|4|2|2|2|3|4|2|3|1|3|3|3|3|1|3|1|1|2|2|1|2|3|4|2|3|3|1|2|2|1|1|1|1|2|4|3|4|4|3|4|3|3|1|2|2|4|2|1|4|1|3|1|3|4|1|1|3|2|4|1",
    "60": "3|2|2|4|1|1|2|3|1|3|3|4|4|3|1|3|4|1|3|4|1|2|1|2|1|4|2|2|3|2|3|1|1|4|1|1,4|1|1|1|3|3|1|Bonus|4|4|2|4|2|3|3|4|1|3|4|1|3|3|3|3|3|3|3|1|2|1|1|2|3|3|2|3|3|1|2|2|4|3|3|3|2|1|4|4|1|2|1|3|2|3|1|1|1|3|4|4|3|3|3|3|4|4|2|3|2|2|2|2|4|1|1|3|4|2|1|2|4|2|3|1|4|1|4|3|2|3|4|4|3|2|1|1|1|3|4|3|3|3|2|2|2|3|1|2|3|3|4|2|1|4|3|4|4|3|2|1|1|3|1|3|4|1|4|3|2|2|3|4|3|1|3|3|4|4|1|2|1|1|3|4|4",
    "70": "4|1|4|2|4|2|2|3|2|4|2|1|1|3|4|4|4|2|1|2|4|3,4|1|3|4|2|4|4|3|3|1|1|1|4|2|4|3|2|2|Bonus|3|4|4|3|3|1|1|1|4|2|1|1|1|4|4|4|2|3|1|2|2|4|2|4|2|4|3|2|2|2|1|2|4|2|2|2|3|1|3|2|4|2|2|2|2|2|1|3|3|4|4|1|3|2|1|2|2|2|2|2|3|3|1|4|2|4|3|2|4|3|1|3|3|3|1|2|3|3|4|2|4|1|3|1|1|4|1|2|1|2|3|2|4|4|4|2|4|3|2|3|2|1|1|4|1|2|4|2|1|4|3|4|2|4|3|3|2|2|2|2|4|2|2|1|1|4|1|2|1|1|4|3|2|2|3|3|3|3|4|3",
    "80": "4|Bonus|2|1|1,2|2|2|1|4|2|1|4|2|4|2|3|2|2|4|2|1|4|4|4|3|1|1|1|1|3|1|4|2|3|3|4|4|2|2|2|3|3|2|3|2|1|2|4|1|4|4|4|4|2|2|2|3|4|4|3|3|3|4|4|4|2|1|4|2|1|4|4|2|4|4|3|1|3|3|2|1|4|3|3|2|3|4|4|2|4|2|1|2|1|1|4|1|4|3|4|2|4|1|2|3|2|2|4|2|1|3|1|4|3|1|1|1|3|4|1|4|3|4|3|4|3|4|2|1|3|4|3|2|2|4|1|4|4|4|3|4|4|2|3|3|4|1|4|4|3|1|3|2|4|1|1|1|2|3|3|2|4|4|3|4|1|2|4|2|1|2|2|1|2|4|3|2|1|4|1"
};

Object.keys(rawKeys).forEach(set => {
    const arr = rawKeys[set].split("|");
    arr.forEach((ans, idx) => {
        let qNum = String(idx + 1).padStart(3, '0');
        officialKeysMaster[set][qNum] = ans;
    });
});

function maskName(name) {
    if (!name) return "Student-****";
    return name.split(' ').map(w => w.length <= 1 ? w.toUpperCase() : w[0].toUpperCase() + '****').join(' ');
}

// CLEAR SAVED LOCAL STORAGE DATA
window.clearSavedData = function() {
    if(confirm("Are you sure you want to clear your saved OMR data and calculate again?")) {
        localStorage.removeItem('savedOMR_CSV');
        globalCSVText = "";
        window._lastReportData = null;
        document.getElementById('csvFile').value = '';
        
        // Reset Upload UI
        document.getElementById('uploadText').innerText = "Choose Response CSV File";
        document.getElementById('uploadText').style.color = "";
        document.getElementById('calcBtn').disabled = true;
        document.getElementById('calcBtn').classList.remove('active');
        document.getElementById('dropZone').classList.remove('uploaded');
        window.showSection('uploadCard', false);
    }
};

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('csvFile');
const calcBtn = document.getElementById('calcBtn');
const uploadText = document.getElementById('uploadText');

['dragenter', 'dragover'].forEach(n => dropZone.addEventListener(n, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(n => dropZone.addEventListener(n, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); }));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if(e.dataTransfer.files.length) handleFileLoad(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if(e.target.files.length) handleFileLoad(e.target.files[0]);
});

function handleFileLoad(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Upload a valid .csv file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;

        const upperText = text.toUpperCase();
        const hasHeaders = upperText.includes("APPLICATION") || upperText.includes("NAME") || upperText.includes("SET");
        const hasQData = /\n\d+\s*,\s*[1-4\-]?/.test(text);

        if (!hasHeaders && !hasQData) {
            alert("Invalid CSV format! Please go to 'How to Extract OMR' and use the script provided to generate the correct file.");
            fileInput.value = '';
            return;
        }

        globalCSVText = text;
        
        // Persist data locally so users don't have to upload on refresh
        localStorage.setItem('savedOMR_CSV', text);

        calcBtn.disabled = false;
        calcBtn.classList.add('active');
        dropZone.classList.add('uploaded');
        uploadText.innerText = "CSV Ready! Click Calculate below.";
        uploadText.style.color = "var(--success)";

        const howToBtn = document.getElementById('howToBtn');
        if (howToBtn) howToBtn.style.display = 'none';
    };
    reader.readAsText(file);
}

window.executeCalculation = function() {
    if (!globalCSVText) return;
    processMetrics(globalCSVText);
    window.showSection('resultsSection', false);
};

function processMetrics(csvText) {
    const structuralMap = {
        "Physics":   { correct: 0, incorrect: 0, skipped: 0, net: 0, elements: [], reviewRows: [], id: "tab-phy" },
        "Chemistry": { correct: 0, incorrect: 0, skipped: 0, net: 0, elements: [], reviewRows: [], id: "tab-chem" },
        "Biology":   { correct: 0, incorrect: 0, skipped: 0, net: 0, elements: [], reviewRows: [], id: "tab-bio" }
    };

    let grandTotal = 0;
    let totalCorrect = 0, totalIncorrect = 0, totalSkipped = 0;
    const rows = csvText.split('\n');

    for (let i = 0; i < Math.min(15, rows.length); i++) {
        const rowUpper = rows[i].toUpperCase();
        if (rowUpper.includes("APPLICATION") || rowUpper.includes("ROLL")) extractedAppNumber = rows[i].split(',')[1]?.trim();
        if (rowUpper.includes("NAME")) extractedFullName = rows[i].split(',')[1]?.trim();
        if (rowUpper.includes("SET") || rowUpper.includes("BOOKLET") || rowUpper.includes("PAPERCODE")) {
            extractedSetCode = rows[i].split(',')[1]?.trim().toUpperCase();
        }
    }

    if (!extractedAppNumber) extractedAppNumber = "GUEST" + Math.floor(Math.random() * 99999);
    if (!extractedFullName) extractedFullName = "Anonymous Student";
    if (!extractedSetCode) extractedSetCode = "50";

    const targetAnswerKey = officialKeysMaster[extractedSetCode];
    if (!targetAnswerKey) {
        alert(`Error: Booklet code "${extractedSetCode}" is not registered in our database.`);
        return;
    }

    const responseMap = {};
    for (let i = 0; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const fragments = rows[i].split(',');
        if (fragments.length < 2) continue;
        const num = parseInt(fragments[0].trim(), 10);
        if (isNaN(num) || num < 1 || num > 180) continue;
        responseMap[String(num).padStart(3, '0')] = fragments[1] ? fragments[1].trim() : "";
    }

    for (let num = 1; num <= 180; num++) {
        const targetQ = String(num).padStart(3, '0');
        const key = targetAnswerKey[targetQ];
        if (!key) continue;

        const sector = (num <= 45) ? "Physics" : (num <= 90) ? "Chemistry" : "Biology";
        const ans = responseMap.hasOwnProperty(targetQ) ? responseMap[targetQ] : "";

        if (key === "Bonus") {
            structuralMap[sector].correct++; structuralMap[sector].net += 4; grandTotal += 4; totalCorrect++;
            structuralMap[sector].elements.push(`<div class="q-item correct-item"><span>Q${targetQ}</span><div class="q-item-details"><span class="bonus-text">Bonus (+4)</span><br><small style="color:var(--text-muted)">Dropped by NTA</small></div></div>`);
            structuralMap[sector].reviewRows.push({ q: targetQ, status: 'bonus', marked: ans, key: 'Bonus' });
            continue;
        }

        if (ans === "" || ans === "-") {
            structuralMap[sector].skipped++; totalSkipped++;
            structuralMap[sector].elements.push(`<div class="q-item skipped-item"><span>Q${targetQ}</span><div class="q-item-details"><span style="color:var(--text-muted)">Skipped (0)</span><br><small style="color:var(--text-muted)">Your Ans: — | Key: ${key}</small></div></div>`);
            structuralMap[sector].reviewRows.push({ q: targetQ, status: 'skipped', marked: '', key: key });
        } else {
            const validOptions = key.includes(",") ? key.split(",") : [key];
            const isMultipleMarked = ans.replace(/[^1-4]/g, '').length > 1;

            if (!isMultipleMarked && validOptions.includes(ans)) {
                structuralMap[sector].correct++; structuralMap[sector].net += 4; grandTotal += 4; totalCorrect++;
                structuralMap[sector].elements.push(`<div class="q-item correct-item"><span>Q${targetQ}</span><div class="q-item-details"><span class="correct-text">Correct (+4)</span><br><small style="color:var(--text-muted)">Your Ans: ${ans} | Key: ${key}</small></div></div>`);
                structuralMap[sector].reviewRows.push({ q: targetQ, status: 'correct', marked: ans, key: key });
            } else {
                let reason = isMultipleMarked ? "Multiple Marked" : "Incorrect";
                structuralMap[sector].incorrect++; structuralMap[sector].net -= 1; grandTotal -= 1; totalIncorrect++;
                structuralMap[sector].elements.push(`<div class="q-item incorrect-item"><span>Q${targetQ}</span><div class="q-item-details"><span class="wrong-text">${reason} (-1)</span><br><small style="color:var(--text-muted)">Your Ans: ${ans} | Key: ${key}</small></div></div>`);
                structuralMap[sector].reviewRows.push({ q: targetQ, status: 'incorrect', marked: ans, key: key });
            }
        }
    }

    const totalAttempted = totalCorrect + totalIncorrect;
    renderDashboard(structuralMap, grandTotal, totalCorrect, totalIncorrect, totalSkipped, totalAttempted);
}

function renderDashboard(map, total, totalCorrect, totalIncorrect, totalSkipped, totalAttempted) {
    document.getElementById('grandTotal').innerHTML = `${total}<span>/720</span>`;
    const accuracyPct = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    document.getElementById('accuracyMetric').innerText = `Accuracy: ${accuracyPct}% (${totalAttempted} attempted out of 180, ${totalCorrect} correct)`;
    document.getElementById('setMetric').innerText = `Booklet Set: ${extractedSetCode}`;

    const positiveMarks = totalCorrect * 4;
    const negativeMarks = totalIncorrect * 1;

    document.getElementById('overallStatsGrid').innerHTML = `
        <div class="stat-chip correct-chip"><span class="stat-value">${totalCorrect}</span><span class="stat-label">Total Correct</span></div>
        <div class="stat-chip incorrect-chip"><span class="stat-value">${totalIncorrect}</span><span class="stat-label">Total Incorrect</span></div>
        <div class="stat-chip skipped-chip"><span class="stat-value">${totalSkipped}</span><span class="stat-label">Total Skipped</span></div>
        <div class="stat-chip positive-chip"><span class="stat-value">+${positiveMarks}</span><span class="stat-label">Positive Marks</span></div>
        <div class="stat-chip negative-chip"><span class="stat-value">-${negativeMarks}</span><span class="stat-label">Negative Penalty</span></div>
    `;

    const grid = document.getElementById('subjectGrid');
    grid.innerHTML = "";
    const subjectClass = { Physics: 'phy', Chemistry: 'chem', Biology: 'bio' };
    const subjectEmoji = { Physics: '⚛️', Chemistry: '🧪', Biology: '🧬' };

    Object.keys(map).forEach(k => {
        const d = map[k];
        const maxScore = (k === "Biology") ? 360 : 180;
        grid.innerHTML += `
            <div class="subject-card ${subjectClass[k]}">
                <h3><span>${subjectEmoji[k]}</span> ${k}</h3>
                <div class="stat-row"><span>Correct</span><span class="correct-text">${d.correct}</span></div>
                <div class="stat-row"><span>Incorrect</span><span class="wrong-text">${d.incorrect}</span></div>
                <div class="stat-row"><span>Skipped</span><span>${d.skipped}</span></div>
                <div class="stat-row" style="font-weight:700; margin-top:10px; padding-top:10px; border-top:1px solid rgba(0,0,0,0.08)"><span>Subtotal</span><span>${d.net} / ${maxScore}</span></div>
            </div>
        `;
        document.getElementById(d.id).innerHTML = d.elements.length ? d.elements.join('') : '<p>No data</p>';
    });

    window._lastReportData = { total, map };
    document.getElementById('premiumTabsCard').style.display = 'block';

    executeCloudSync(total, map);
}

// ===== LEADERBOARD =====
window._leaderboardRaw = [];

async function executeCloudSync(score, map) {
    const safeName = maskName(extractedFullName);

    try {
        await db.collection("leaderboard").doc(extractedAppNumber).set({
            name: safeName,
            score: score,
            phy: map["Physics"].net, chem: map["Chemistry"].net, bio: map["Biology"].net,
            set: extractedSetCode,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(e) { console.error(e); }

    try {
        const snaps = await db.collection("leaderboard").get();
        window._leaderboardRaw = [];
        snaps.forEach((docRef) => {
            const data = docRef.data();
            window._leaderboardRaw.push({
                id: docRef.id,
                name: data.name || "Anonymous",
                score: data.score || 0,
                phy: data.phy || 0,
                chem: data.chem || 0,
                bio: data.bio || 0,
                set: data.set || 'N/A'
            });
        });
        window.renderLeaderboard();
    } catch (err) { console.error(err); }
}

window.renderLeaderboard = function() {
    const data = window._leaderboardRaw || [];
    const sortBySelect = document.getElementById('lbSortBy');
    const orderSelect = document.getElementById('lbOrder');
    const sortBy = sortBySelect ? sortBySelect.value : 'score';
    const order = orderSelect ? orderSelect.value : 'desc';

    const sorted = [...data].sort((a, b) => {
        const diff = (b[sortBy] || 0) - (a[sortBy] || 0);
        return order === 'asc' ? -diff : diff;
    });

    let rank = 0;
    let userRank = null;
    let htmlStr = "";

    sorted.forEach((entry) => {
        rank++;
        if (entry.id === extractedAppNumber) userRank = rank;
        htmlStr += `
            <div class="leaderboard-row">
                <div class="lb-top-row">
                    <span><span class="lb-rank">#${rank}</span>${entry.name}</span>
                    <span style="color:var(--accent)">${entry.score} / 720</span>
                </div>
                <div class="lb-sub-row">
                    <span>Phy: ${entry.phy}</span><span>Chem: ${entry.chem}</span><span>Bio: ${entry.bio}</span>
                    <span>Code: ${entry.set}</span>
                </div>
            </div>
        `;
    });

    if (htmlStr === "") htmlStr = "<p style='text-align:center; color:var(--text-muted); padding: 20px;'>No scores yet. Be the first!</p>";
    document.getElementById('leaderboardContainer').innerHTML = htmlStr;

    const rankDisplay = document.getElementById('userRankDisplay');
    if (rankDisplay) {
        rankDisplay.innerText = userRank ? `Your rank: ${userRank} out of ${sorted.length}` : `Your rank: Not found`;
    }
};

window.generateComprehensiveReport = function() {
    if (!window._lastReportData) { alert('Please calculate your score first.'); return; }
    const { total, map } = window._lastReportData;
    const reportDiv = document.getElementById('comprehensiveReport');
    
    const mode = (document.querySelector('input[name="reportMode"]:checked') || {}).value || 'incorrect';
    const modeLabel = { incorrect: 'Incorrect Questions Only', skipped: 'Skipped Questions Only', all: 'All Questions' };

    let html = `
      <div class="report-header">
        <h1>Re-NEET 2026 — Comprehensive Score Report</h1>
        <p><strong>Candidate:</strong> ${extractedFullName} &nbsp;|&nbsp; <strong>Application No:</strong> ${extractedAppNumber} &nbsp;|&nbsp; <strong>Booklet Set:</strong> ${extractedSetCode}</p>
        <p><strong>Report Type:</strong> ${modeLabel[mode]}</p>
        <h2>Total Marks: ${total} / 720</h2>
      </div>`;

    Object.keys(map).forEach(subject => {
        const d = map[subject];
        const maxScore = (subject === "Biology") ? 360 : 180;
        html += `<div class="report-subject">
            <h3>${subject} — Score: ${d.net} / ${maxScore}</h3>
            <p>Correct: ${d.correct} &nbsp; Incorrect: ${d.incorrect} &nbsp; Skipped: ${d.skipped}</p>`;

        let rows;
        if (mode === 'incorrect') rows = d.reviewRows.filter(r => r.status === 'incorrect');
        else if (mode === 'skipped') rows = d.reviewRows.filter(r => r.status === 'skipped');
        else rows = d.reviewRows;

        if (rows.length) {
            html += `<table class="report-table"><thead><tr><th>Question</th><th>Status</th><th>Your Answer</th><th>Correct Answer</th></tr></thead><tbody>`;
            rows.forEach(r => {
                html += `<tr><td>Q${r.q}</td><td style="text-transform:capitalize">${r.status}</td><td>${r.marked || '—'}</td><td>${r.key}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else {
            html += `<p>No questions match this report type in this section. 🎉</p>`;
        }
        html += `</div>`;
    });

    reportDiv.innerHTML = html;
    
    // Switch to printing mode (CSS will hide the dashboard & show only the report Div)
    document.body.classList.add('printing-report');
    
    // Safely remove the class after the print dialog finishes/closes
    window.addEventListener('afterprint', () => {
        document.body.classList.remove('printing-report');
        reportDiv.innerHTML = ''; // Clear DOM memory
    }, { once: true });

    // Fallback trigger for some Safari/iOS edge cases
    setTimeout(() => { window.print(); }, 150);
};

window.toggleSidebar = function() { document.getElementById('sidebar').classList.toggle('open'); }

window.showSection = function(sectionId, fromMenu = false) {
    document.getElementById('uploadCard').style.display = 'none';
    document.getElementById('instructionsSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('leaderboardSection').style.display = 'none';
    document.getElementById('premiumTabsCard').style.display = 'none';

    const mainTitles = document.getElementById('pageHeaderGroup');
    const isLeaderboard = (sectionId === 'leaderboardSection');

    document.body.classList.toggle('hide-top-ui', isLeaderboard);

    if (sectionId === 'uploadCard') {
        if (mainTitles) mainTitles.style.display = 'block';
    } else {
        if (mainTitles) mainTitles.style.display = 'none';
    }

    if (sectionId === 'resultsSection' && window._lastReportData) {
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('premiumTabsCard').style.display = 'block';
    } else if (sectionId === 'resultsSection' && !window._lastReportData) {
        document.getElementById('uploadCard').style.display = 'block';
        if (mainTitles) mainTitles.style.display = 'block';
    } else {
        const target = document.getElementById(sectionId);
        if(target) target.style.display = 'block';
    }

    if (fromMenu) window.toggleSidebar();
}

window.handlePrintReportCardClick = function(fromMenu = false) {
    if (fromMenu) window.toggleSidebar();

    if (window._lastReportData) {
        window.showSection('resultsSection', false);
        window.switchUnlockTab('report');
        const target = document.getElementById('premiumTabsCard');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        alert("Please calculate your score first!");
    }
}

window.switchTab = function(id, event) {
    document.querySelectorAll('.q-list').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.q-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    if (event && event.target) {
        event.target.classList.add('active');
    } else if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }

    window.applyReviewFilter();
}

window.applyReviewFilter = function() {
    const filterVal = document.getElementById('reviewFilter').value;
    const items = document.querySelectorAll('.q-item');
    items.forEach(item => {
        if (filterVal === 'all') { item.style.display = 'flex'; }
        else if (item.classList.contains(filterVal + '-item')) { item.style.display = 'flex'; }
        else { item.style.display = 'none'; }
    });
}

window.switchUnlockTab = function(which) {
    document.getElementById('unlockTabBtn-report').classList.toggle('active', which === 'report');
    document.getElementById('unlockTabBtn-leaderboard').classList.toggle('active', which === 'leaderboard');
    
    document.getElementById('unlockPanel-report').style.display = (which === 'report') ? 'block' : 'none';
    document.getElementById('unlockPanel-leaderboard').style.display = (which === 'leaderboard') ? 'block' : 'none';

    if (which === 'leaderboard') {
        window.showSection('leaderboardSection', false);
        window.scrollTo({ top: document.getElementById('leaderboardSection').offsetTop - 20, behavior: 'smooth' });
    }
}

window.scrollToLeaderboardUnlock = function() {
    window.switchUnlockTab('leaderboard');
    const target = document.getElementById('premiumTabsCard');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let scrollTimeout;
window.addEventListener('scroll', () => {
    const topElements = [document.getElementById('shareWidget'), document.getElementById('hamburgerBtn'), document.getElementById('themeToggle')];

    topElements.forEach(el => {
        if (el && !document.body.classList.contains('hide-top-ui')) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
        }
    });

    clearTimeout(scrollTimeout);

    scrollTimeout = setTimeout(() => {
        const currentScroll = window.scrollY;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;

        if (totalHeight <= 0 || (currentScroll / totalHeight) <= 0.10 || currentScroll < 50) {
            topElements.forEach(el => {
                if (el && !document.body.classList.contains('hide-top-ui')) {
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                }
            });
        }
    }, 150);
}, { passive: true });
