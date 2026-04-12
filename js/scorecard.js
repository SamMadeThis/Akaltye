/* ══════════════════════════════════════════════════════════════════
   scorecard.js — Quiz results scorecard functionality
   ══════════════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

/* ── Get quiz results from sessionStorage ── */
function getQuizResults() {
    try {
        const data = sessionStorage.getItem('akaltye_quiz_results');
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function getActiveUnit() {
    try {
        const data = sessionStorage.getItem('akaltye_active_unit');
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

/* ── State ── */
let flippedCards = new Set();
let showAll = false;
let results = null;
let unit = null;

/* ── Toggle card ── */
function toggleCard(index) {
    const card = document.querySelector(`[data-index="${index}"]`);
    if (!card) return;

    if (flippedCards.has(index)) {
        flippedCards.delete(index);
        card.classList.remove('flipped');
    } else {
        flippedCards.add(index);
        card.classList.add('flipped');
    }
}

/* ── Toggle all cards ── */
function toggleAll() {
    showAll = !showAll;
    const cards = document.querySelectorAll('.question-card');

    if (showAll) {
        cards.forEach((card, i) => {
            card.classList.add('flipped');
            flippedCards.add(i);
        });
        $('revealToggle').textContent = 'Hide all';
        $('scoreSubtitle').textContent = 'Viewing all solutions';
    } else {
        cards.forEach((card, i) => {
            card.classList.remove('flipped');
            flippedCards.delete(i);
        });
        $('revealToggle').textContent = 'Reveal all';
        $('scoreSubtitle').textContent = 'Click the tiles below to reveal the solutions';
    }
}

/* ── Render scorecard ── */
function renderScorecard(data) {
    const { questions, score, total, testType, unitId, unitName } = data;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= (data.passmark || 80);

    /* Badge */
    const badge = $('scoreBadge');
    badge.className = 'score-badge';
    if (passed) badge.classList.add('passed');
    else if (testType === 'final') badge.classList.add('failed');

    $('scorePercent').textContent = `${percentage}%`;

    /* Stats */
    const statsHtml = `
        <div class="score-stat">
            <i class="fa-solid fa-circle-check score-stat-icon correct"></i>
            <strong>${score}</strong>&nbsp;correct
        </div>
        <div class="score-stat">
            <i class="fa-solid fa-circle-xmark score-stat-icon incorrect"></i>
            <strong>${total - score}</strong>&nbsp;incorrect
        </div>
        <div class="score-stat">
            <i class="fa-solid fa-list score-stat-icon"></i>
            <strong>${total}</strong>&nbsp;total
        </div>
    `;
    $('scoreStats').innerHTML = statsHtml;

    /* Questions */
    const gridHtml = questions.map((q, i) => {
        const isCorrect = q.correct;
        const statusIcon = isCorrect ? '✓' : '✕';
        const statusClass = isCorrect ? 'correct' : 'incorrect';

        return `
            <div class="question-card-wrap">
                <div class="question-card" data-index="${i}" onclick="toggleCard(${i})">
                    <div class="card-front">
                        <div>
                            <div class="card-header">
                                <span class="card-type">${q.type || 'question'}</span>
                                <span class="card-status ${statusClass}">${statusIcon}</span>
                            </div>
                            <div class="card-question">${q.question}</div>
                        </div>
                        <div class="card-hint">Click to reveal</div>
                    </div>
                    <div class="card-back ${isCorrect ? '' : 'incorrect'}">
                        <div>
                            <div class="card-back-header">Solution</div>
                            <div class="card-back-question">${q.question}</div>
                            <div class="answer-box">
                                <div class="answer-label">Your answer:</div>
                                <div class="answer-text">${q.userAnswer || '(no answer)'}</div>
                            </div>
                            ${!isCorrect ? `
                                <div class="answer-box">
                                    <div class="answer-label">Correct answer:</div>
                                    <div class="answer-text">${q.correctAnswer}</div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-hint">Click to hide</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    $('questionsGrid').innerHTML = gridHtml;

    /* Review lesson button */
    if (unitName) {
        $('btnReviewLesson').href = `words.html?unit=${unitId}&unitName=${encodeURIComponent(unitName)}`;
    } else {
        $('btnReviewLesson').href = 'learn.html';
    }
}

/* ── Init ── */
window.toggleCard = toggleCard;

$('revealToggle').addEventListener('click', toggleAll);

results = getQuizResults();
unit = getActiveUnit();

if (!results) {
    /* No results found - redirect to learn */
    window.location.href = 'learn.html';
} else {
    renderScorecard(results);
}