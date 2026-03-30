const board = document.getElementById("board");
const bg = document.getElementById("board-bg");

const ROWS = 3;
const COLS = 3;
const SNAP = 28;

let currentFlag = "";
let currentIso = "";

// Drag állapot (globális!)
let activePiece = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let topZ = 2000;

init();

// -------------------------
// INIT + START
// -------------------------
async function init() {
  const data = await fetch("/api/random-flag").then(r => r.json());
  currentFlag = data.flag;
  currentIso = data.iso;
  startPuzzle(currentFlag);
}

function startPuzzle(flagPath) {
  // előző darabok törlése
  document.querySelectorAll(".piece").forEach(p => p.remove());

  bg.src = flagPath;

  const bw = board.clientWidth;
  const bh = board.clientHeight;
  const pw = bw / COLS;
  const ph = bh / ROWS;

  const br = board.getBoundingClientRect();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = document.createElement("div");
      p.className = "piece";
      p.style.width = pw + "px";
      p.style.height = ph + "px";

      // sarok-könnyítés
      if (r === 0 && c === 0) p.classList.add("corner-tl");
      if (r === 0 && c === COLS - 1) p.classList.add("corner-tr");
      if (r === ROWS - 1 && c === 0) p.classList.add("corner-bl");
      if (r === ROWS - 1 && c === COLS - 1) p.classList.add("corner-br");

      p.style.backgroundImage = `url(${flagPath})`;
      p.style.backgroundSize = `${bw}px ${bh}px`;
      p.style.backgroundPosition = `-${c * pw}px -${r * ph}px`;

      p.dataset.cx = String(c * pw);
      p.dataset.cy = String(r * ph);

      // kezdő pozíció: a tábla mellé jobbra
      p.style.left = (br.right + 30 + Math.random() * 220) + "px";
      p.style.top = (br.top + Math.random() * (bh - ph)) + "px";

      // pointer events (egér + touch)
      p.addEventListener("pointerdown", onPiecePointerDown);

      document.body.appendChild(p);
    }
  }
}

// -------------------------
// DRAG HANDLERS (EGYSZER!)
// -------------------------
function onPiecePointerDown(e) {
  const p = e.currentTarget;
  if (p.classList.contains("locked")) return;

  activePiece = p;

  // bring to front
  activePiece.style.zIndex = String(++topZ);

  // offset a darabon belül
  dragOffsetX = e.clientX - activePiece.offsetLeft;
  dragOffsetY = e.clientY - activePiece.offsetTop;

  // hogy move eseményeket biztosan megkapjuk
  activePiece.setPointerCapture(e.pointerId);

  e.preventDefault();
}

document.addEventListener("pointermove", (e) => {
  if (!activePiece) return;

  activePiece.style.left = (e.clientX - dragOffsetX) + "px";
  activePiece.style.top = (e.clientY - dragOffsetY) + "px";
});

document.addEventListener("pointerup", async (e) => {
  if (!activePiece) return;

  snap(activePiece);
  activePiece = null;
});

// -------------------------
// SNAP + WIN
// -------------------------
function snap(p) {
  const r = board.getBoundingClientRect();
  const cx = r.left + Number(p.dataset.cx);
  const cy = r.top + Number(p.dataset.cy);

  if (Math.abs(p.offsetLeft - cx) < SNAP &&
      Math.abs(p.offsetTop - cy) < SNAP) {
    p.style.left = cx + "px";
    p.style.top = cy + "px";
    p.classList.add("locked");
    checkWin();
  }
}

async function checkWin() {
  const lockedCount = document.querySelectorAll(".piece.locked").length;
  if (lockedCount !== ROWS * COLS) return;

  // ország név DB-ből
  let countryName = "Ismeretlen ország";
  try {
    const res = await fetch(`/api/country-name/${currentIso}`);
    const data = await res.json();
    if (data?.nev) countryName = data.nev;
  } catch {}

  showWin(countryName);
}

// -------------------------
// WIN OVERLAY
// -------------------------
function showWin(countryName) {
    document.querySelectorAll(".piece").forEach(p => {
    p.style.pointerEvents = "none";
    });
    document.getElementById("winFlag").src = currentFlag;
    document.getElementById("winName").textContent = countryName;
    document.getElementById("winOverlay").classList.remove("hidden");
}

function hideWin() {
  document.getElementById("winOverlay").classList.add("hidden");
  document.querySelectorAll(".piece").forEach(p => {
    if (!p.classList.contains("locked")) {
      p.style.pointerEvents = "auto";
    }
  });
}

const nextBtn = document.getElementById("nextBtn");
if (nextBtn) {
  nextBtn.addEventListener("click", async () => {
    hideWin();
    await init();
  });
}