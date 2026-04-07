const gridEl = document.getElementById("grid");
const movesEl = document.getElementById("moves");
const timeEl = document.getElementById("time");
const gridSizeLabel = document.getElementById("gridSizeLabel");
const pairsLabel = document.getElementById("pairsLabel");

const restartBtn = document.getElementById("restartBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const winOverlay = document.getElementById("winOverlay");
const winMovesEl = document.getElementById("winMoves");
const winTimeEl = document.getElementById("winTime");

const settingsBtn = document.getElementById("settingsBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const applySettingsBtn = document.getElementById("applySettingsBtn");
const sizeBtns = document.querySelectorAll(".sizeBtn");

// Játékállapot
let cards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;

let moves = 0;
let matchedPairs = 0;

let timerId = null;
let seconds = 0;
let timerRunning = false;

// Beállítások
let currentGridSize = 6;
let currentContinents = ["Európa", "Ázsia", "Dél-Amerika", "Észak-Amerika", "Afrika", "Óceánia"];

// Grid méret → párok száma
const GRID_PAIRS = { 4: 8, 6: 18, 8: 32 };

// Grid méret → CSS oszlopszám
const GRID_COLS = { 4: 4, 6: 6, 8: 8 };

init();

restartBtn?.addEventListener("click", () => startNewGame());
playAgainBtn?.addEventListener("click", () => {
  hideWin();
  startNewGame();
});

// Beállítások popup
settingsBtn?.addEventListener("click", () => {
  settingsOverlay.classList.remove("hidden");
});

closeSettingsBtn?.addEventListener("click", () => {
  settingsOverlay.classList.add("hidden");
});

settingsOverlay?.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) settingsOverlay.classList.add("hidden");
});

sizeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    sizeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

applySettingsBtn?.addEventListener("click", () => {
  const activeSize = document.querySelector(".sizeBtn.active");
  if (activeSize) currentGridSize = parseInt(activeSize.dataset.size);

  currentContinents = [...document.querySelectorAll(".continentOptions input:checked")]
    .map(cb => cb.value);

  if (currentContinents.length === 0) {
    alert("Legalább egy kontinenst válassz ki!");
    return;
  }
  settingsOverlay.classList.add("hidden");
  startNewGame();
});

async function init() {
  await startNewGame();
}

async function startNewGame() {
  stopTimer();
  seconds = 0;
  timerRunning = false;
  updateTime();

  moves = 0;
  matchedPairs = 0;
  updateMoves();

  firstCard = null;
  secondCard = null;
  lockBoard = false;

  hideWin();
  updateLabels();

  const pairs = GRID_PAIRS[currentGridSize] || 18;
  const continentsParam = encodeURIComponent(currentContinents.join(","));

  const data = await fetch(
    `/api/memory-pairs?pairs=${pairs}&continents=${continentsParam}`
  ).then(r => r.json());
  cards = data.cards;

  renderGrid(cards);
}

function updateLabels() {
  const pairs = GRID_PAIRS[currentGridSize] || 18;
  if (gridSizeLabel) gridSizeLabel.textContent = `${currentGridSize}×${currentGridSize}`;
  if (pairsLabel) pairsLabel.textContent = String(pairs);
}

function renderGrid(cards) {
  const cols = GRID_COLS[currentGridSize] || 6;
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridEl.innerHTML = "";

  for (const c of cards) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "memCard";
    card.dataset.id = c.id;
    card.dataset.pairId = c.pairId;
    card.dataset.type = c.type;
    card.dataset.value = c.value;

    card.innerHTML = `
      <div class="memFace memFront">
        <div class="q">🌍</div>
      </div>
      <div class="memFace memBack ${c.type}">
        <div class="memTag">${c.type === "country" ? "🌐 Ország" : "🏙 Főváros"}</div>
        <div>${escapeHtml(c.value)}</div>
      </div>
    `;

    card.addEventListener("click", () => onCardClick(card));
    gridEl.appendChild(card);
  }
}

function onCardClick(cardEl) {
  if (lockBoard) return;
  if (cardEl.classList.contains("matched")) return;
  if (cardEl === firstCard) return;

  if (!timerRunning) {
    timerRunning = true;
    startTimer();
  }

  flip(cardEl);

  if (!firstCard) {
    firstCard = cardEl;
    return;
  }

  secondCard = cardEl;
  lockBoard = true;

  moves++;
  updateMoves();

  const isMatch = checkMatch(firstCard, secondCard);
  const totalPairs = GRID_PAIRS[currentGridSize] || 18;

  if (isMatch) {
    markMatched(firstCard, secondCard);
    resetTurn();

    matchedPairs++;
    if (matchedPairs === totalPairs) {
      stopTimer();
      showWin();
    }
  } else {
    setTimeout(() => {
      unflip(firstCard);
      unflip(secondCard);
      resetTurn();
    }, 650);
  }
}

function checkMatch(a, b) {
  const pairA = a.dataset.pairId;
  const pairB = b.dataset.pairId;

  if (pairA !== pairB) return false;

  const typeA = a.dataset.type;
  const typeB = b.dataset.type;

  return (typeA === "country" && typeB === "capital") ||
         (typeA === "capital" && typeB === "country");
}

function flip(cardEl) { cardEl.classList.add("isFlipped"); }
function unflip(cardEl) { cardEl.classList.remove("isFlipped"); }
function markMatched(a, b) { a.classList.add("matched"); b.classList.add("matched"); }

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function updateMoves() {
  if (movesEl) movesEl.textContent = String(moves);
}

function startTimer() {
  timerId = setInterval(() => { seconds++; updateTime(); }, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function updateTime() {
  if (!timeEl) return;
  timeEl.textContent = formatTime(seconds);
}

function showWin() {
  if (winMovesEl) winMovesEl.textContent = String(moves);
  if (winTimeEl) winTimeEl.textContent = formatTime(seconds);
  if (winOverlay) winOverlay.classList.remove("hidden");
}

function hideWin() {
  if (winOverlay) winOverlay.classList.add("hidden");
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
