const targetCountryEl = document.getElementById("targetCountry");
const scoreEl = document.getElementById("score");
const roundEl = document.getElementById("round");
const totalRoundsEl = document.getElementById("totalRounds");
const feedbackEl = document.getElementById("feedback");

const restartBtn = document.getElementById("restartBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const resultOverlay = document.getElementById("resultOverlay");
const finalScoreEl = document.getElementById("finalScore");
const finalTotalEl = document.getElementById("finalTotal");

const mapContainer = document.getElementById("mapContainer");
const mapPlaceholder = document.getElementById("mapPlaceholder");
const screenFlash = document.getElementById("screenFlash");
const countryPopup = document.getElementById("countryPopup");
const popupFlag = document.getElementById("popupFlag");
const popupName = document.getElementById("popupName");

const TOTAL_ROUNDS = 10;
const params = new URLSearchParams(location.search);

const CONTINENT = params.get("continent") || "Európa";
const MAP_FILE = params.get("map") || "europe.svg";
const MAP_PATH = `/maps/${MAP_FILE}`;

let score = 0;
let round = 1;

let svgRoot = null;
let allCountries = [];
let playableCountries = [];
let roundTargets = [];
let currentTarget = null;
let waitingNext = false;

const solvedIsos = new Set();

const COUNTRY_ID_OVERRIDES = {
  pt: ["pt", "PT", "Portugal"],
  tr: ["tr", "TR", "Turkey", "Türkiye"],
  ge: ["ge", "GE", "Georgia"],
  am: ["am", "AM", "Armenia"],
  ru: ["ru", "RU", "Russia", "russia", "russia-europe", "russia-asia"]
};

init();

restartBtn?.addEventListener("click", init);
playAgainBtn?.addEventListener("click", () => {
  hideResult();
  init();
});

async function init(){
  score = 0;
  round = 1;
  waitingNext = false;
  solvedIsos.clear();

  totalRoundsEl.textContent = String(TOTAL_ROUNDS);
  finalTotalEl.textContent = String(TOTAL_ROUNDS);

  updateUI();
  feedbackEl.textContent = "Térkép és országok betöltése...";
  feedbackEl.style.color = "#0f172a";

  await loadMap();
  await loadCountries();

  prepareRounds();
  nextRound();

  hideResult();
}

function updateUI(){
  scoreEl.textContent = String(score);
  roundEl.textContent = String(round);
}

async function loadMap(){
  mapContainer.innerHTML = "";
  mapPlaceholder?.remove();

  const svgText = await fetch(MAP_PATH).then(r => r.text());

  const inner = document.createElement("div");
  inner.className = "mapInner";
  inner.innerHTML = svgText;

  mapContainer.appendChild(inner);

  svgRoot = inner.querySelector("svg");

  if (!svgRoot) {
    mapContainer.innerHTML = `
      <div class="mapPlaceholder">
        <div class="placeholderIcon">⚠️</div>
        <p>Nem sikerült betölteni az SVG térképet.</p>
      </div>`;
    return;
  }
  enablePanZoom(svgRoot);
}

async function loadCountries(){
  const countries = await fetch(`/api/mapgame-countries?continent=${encodeURIComponent(CONTINENT)}`)
    .then(r => r.json());

  allCountries = countries.map(c => ({
    nev: c.nev,
    iso: c.iso_kod.toLowerCase()
  }));

  playableCountries = allCountries.filter(c => {
    const els = findCountryElements(c.iso);
    return els.length > 0;
  });

  playableCountries.forEach(country => {
    const els = findCountryElements(country.iso);

    els.forEach(el => {
      el.classList.add("country-shape");
      el.dataset.iso = country.iso;
      el.dataset.name = country.nev;

      el.style.opacity = "1";
      el.style.pointerEvents = "auto";

      el.addEventListener("click", () => handleCountryClick(country.iso));
    });
  });
}

function prepareRounds(){
  const available = [...playableCountries];
  shuffle(available);

  roundTargets = available.slice(0, Math.min(TOTAL_ROUNDS, available.length));

  if (roundTargets.length === 0) {
    feedbackEl.textContent = "Nem találtam kattintható országokat a térképen.";
  }
}

function nextRound(){
  if (round > roundTargets.length) {
    showResult();
    return;
  }

  resetWrongHighlights();

  currentTarget = roundTargets[round - 1];
  targetCountryEl.textContent = currentTarget.nev;

  feedbackEl.textContent = `Kattints ${currentTarget.nev} országra!`;
  feedbackEl.style.color = "#0f172a";
  waitingNext = false;
}

function handleCountryClick(clickedIso){
  if (waitingNext || !currentTarget) return;

  waitingNext = true;

  const clickedEls = findCountryElements(clickedIso);
  const targetEls = findCountryElements(currentTarget.iso);

  if (clickedIso === currentTarget.iso) {
    score++;
    solvedIsos.add(clickedIso);

    targetEls.forEach(el => {
      applyFlagFill(el, clickedIso);
      el.classList.add("country-correct");
      el.classList.remove("country-wrong");
    });

    feedbackEl.textContent = `✅ Helyes! Ez ${currentTarget.nev}.`;
    feedbackEl.style.color = "#16a34a";

    flashScreen("correct");
    showCountryPopup(clickedIso, currentTarget.nev);
  } else {
    clickedEls.forEach(el => {
      if (!solvedIsos.has(clickedIso)) {
        el.classList.add("country-wrong");
      }
    });

    targetEls.forEach(el => {
      el.classList.add("country-correct");
    });

    const clickedName = getCountryName(clickedIso) || clickedIso.toUpperCase();
    feedbackEl.textContent = `❌ Ez ${clickedName}, a helyes válasz: ${currentTarget.nev}.`;
    feedbackEl.style.color = "#dc2626";

    flashScreen("wrong");
  }

  updateUI();

  setTimeout(() => {
    if (round >= roundTargets.length) {
      showResult();
    } else {
      round++;
      updateUI();
      nextRound();
    }
  }, 1200);
}

function resetWrongHighlights(){
  if (!svgRoot) return;

  svgRoot.querySelectorAll(".country-shape").forEach(el => {
    el.classList.remove("country-wrong");

    const iso = el.dataset.iso?.toLowerCase();
    if (!iso || !solvedIsos.has(iso)) {
      el.classList.remove("country-correct");
    }
  });
}

function applyFlagFill(countryElement, iso){
  const svg = countryElement.closest("svg");
  if (!svg) return;

  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.prepend(defs);
  }

  const bbox = countryElement.getBBox();
  const patternId = `flag-${iso}`;

  let pattern = svg.querySelector(`#${cssEscape(patternId)}`);

  if (!pattern) {
    pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
    pattern.setAttribute("id", patternId);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("patternContentUnits", "userSpaceOnUse");
    pattern.setAttribute("x", bbox.x);
    pattern.setAttribute("y", bbox.y);
    pattern.setAttribute("width", bbox.width);
    pattern.setAttribute("height", bbox.height);

    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttributeNS("http://www.w3.org/1999/xlink", "href", `/flags/${iso}.jpg`);
    img.setAttribute("x", bbox.x);
    img.setAttribute("y", bbox.y);
    img.setAttribute("width", bbox.width);
    img.setAttribute("height", bbox.height);
    img.setAttribute("preserveAspectRatio", "none");

    pattern.appendChild(img);
    defs.appendChild(pattern);
  }

  countryElement.setAttribute("fill", `url(#${patternId})`);
}

function flashScreen(type){
  if (!screenFlash) return;

  screenFlash.classList.remove("flash-correct", "flash-wrong");

  void screenFlash.offsetWidth;

  if (type === "correct") {
    screenFlash.classList.add("flash-correct");
  } else {
    screenFlash.classList.add("flash-wrong");
  }
}

function findCountryElements(iso){
  if (!svgRoot) return [];

  const normalized = iso.toLowerCase();
  const selectors = new Set();

  selectors.add(`#${cssEscape(normalized)}`);
  selectors.add(`#${cssEscape(normalized.toUpperCase())}`);
  selectors.add(`[data-iso="${normalized}"]`);
  selectors.add(`[name="${normalized}"]`);
  selectors.add(`[name="${normalized.toUpperCase()}"]`);

  if (COUNTRY_ID_OVERRIDES[normalized]) {
    COUNTRY_ID_OVERRIDES[normalized].forEach(v => {
      selectors.add(`#${cssEscape(v)}`);
      selectors.add(`[name="${v}"]`);
    });
  }

  const found = [];
  selectors.forEach(sel => {
    svgRoot.querySelectorAll(sel).forEach(el => found.push(el));
  });

  return uniqueElements(found);
}

function getCountryName(iso){
  const c = playableCountries.find(x => x.iso === iso.toLowerCase());
  return c ? c.nev : null;
}

function uniqueElements(arr){
  return [...new Set(arr)];
}

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function showResult(){
  finalScoreEl.textContent = String(score);
  resultOverlay.classList.remove("hidden");
}

function hideResult(){
  resultOverlay.classList.add("hidden");
}

function cssEscape(str){
  return String(str).replace(/[^a-zA-Z0-9\-_]/g, "\\$&");
}
function showCountryPopup(iso, name){

  popupFlag.src = `/flags/${iso}.jpg`;
  popupName.textContent = name;

  countryPopup.classList.remove("hidden");

  setTimeout(()=>{
    countryPopup.classList.add("show");
  }, 10);

  setTimeout(()=>{
    countryPopup.classList.remove("show");

    setTimeout(()=>{
      countryPopup.classList.add("hidden");
    }, 250);

  }, 1800);
}
let scale = 1;
let originX = 0;
let originY = 0;

let isDragging = false;
let startX = 0;
let startY = 0;

function enablePanZoom(targetEl) {
  const MIN_SCALE = 1;
  const MAX_SCALE = 5;
  const PAN_STEP = 40;

  // reset induláskor
  scale = 1;
  originX = 0;
  originY = 0;

  function updateTransform() {
    targetEl.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
  }

  mapContainer.onwheel = (e) => {
    e.preventDefault();

    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldScale = scale;
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;

    scale *= zoomFactor;
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

    if (scale === oldScale) return;

    originX = mouseX - ((mouseX - originX) * (scale / oldScale));
    originY = mouseY - ((mouseY - originY) * (scale / oldScale));

    updateTransform();
  };

  mapContainer.onmousedown = (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX - originX;
    startY = e.clientY - originY;
  };

  window.onmousemove = (e) => {
    if (!isDragging) return;

    originX = e.clientX - startX;
    originY = e.clientY - startY;

    updateTransform();
  };

  window.onmouseup = () => {
    isDragging = false;
  };

  mapContainer.ondblclick = () => {
    scale = 1;
    originX = 0;
    originY = 0;
    updateTransform();
  };

  window.onkeydown = (e) => {
    let handled = true;

    switch (e.key) {
      case "ArrowUp":
        originY += PAN_STEP;
        break;
      case "ArrowDown":
        originY -= PAN_STEP;
        break;
      case "ArrowLeft":
        originX += PAN_STEP;
        break;
      case "ArrowRight":
        originX -= PAN_STEP;
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      updateTransform();
    }
  };

  updateTransform();
}