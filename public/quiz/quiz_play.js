const params = new URLSearchParams(location.search);
const continent = params.get("continent") || "";
const mode = params.get("mode") || "capitals";

const quizTitle = document.getElementById("quizTitle");
const quizSub = document.getElementById("quizSub");

const qIndexEl = document.getElementById("qIndex");
const qTotalEl = document.getElementById("qTotal");
const scoreEl = document.getElementById("score");
const questionTextEl = document.getElementById("questionText");
const optionsEl = document.getElementById("options");

const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const backBtn = document.getElementById("backBtn");

const flagWrap = document.getElementById("flagWrap");
const flagImg = document.getElementById("flagImg");

const resultOverlay = document.getElementById("resultOverlay");
const finalScoreEl = document.getElementById("finalScore");
const finalTotalEl = document.getElementById("finalTotal");
const playAgainBtn = document.getElementById("playAgainBtn");
const menuBtn = document.getElementById("menuBtn");

let questions = [];
let current = 0;
let score = 0;
let answered = false;

init();

restartBtn.addEventListener("click", init);
playAgainBtn.addEventListener("click", () => { hideResult(); init(); });

backBtn.addEventListener("click", () => {
  location.href = `quiz_types.html?continent=${encodeURIComponent(continent)}`;
});

menuBtn.addEventListener("click", () => {
  location.href = `quiz_types.html?continent=${encodeURIComponent(continent)}`;
});

nextBtn.addEventListener("click", () => {
  if (!answered) return;
  current++;
  if (current >= questions.length) showResult();
  else renderQuestion();
});

async function init(){
  hideResult();

  current = 0;
  score = 0;
  answered = false;
  nextBtn.disabled = true;

  const modeHu = mode === "flags" ? "Zászlók" : "Fővárosok";
  quizTitle.textContent = `${continent} – ${modeHu}`;
  quizSub.textContent = mode === "flags"
    ? "Válaszd ki az országot a zászló alapján!"
    : "Válaszd ki a helyes fővárost!";

  questionTextEl.textContent = "Betöltés...";

  const data = await fetch(`/api/quiz?count=10&continent=${encodeURIComponent(continent)}&mode=${encodeURIComponent(mode)}`)
    .then(r => r.json());

  questions = data.questions ?? [];
  qTotalEl.textContent = String(questions.length);
  finalTotalEl.textContent = String(questions.length);

  if(!questions.length){
    questionTextEl.textContent = "Nincs elég adat ehhez a kvízhez ezen a kontinensen.";
    optionsEl.innerHTML = "";
    return;
  }

  renderQuestion();
}

function renderQuestion(){
  answered = false;
  nextBtn.disabled = true;

  qIndexEl.textContent = String(current + 1);
  scoreEl.textContent = String(score);

  const q = questions[current];

  // flags mód: zászló kép
  if(q.mode === "flags" && q.flag){
    flagWrap.classList.remove("hidden");
    flagImg.src = q.flag;
  } else {
    flagWrap.classList.add("hidden");
    flagImg.removeAttribute("src");
  }

  questionTextEl.textContent = q.question;

  optionsEl.innerHTML = "";
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answerBtn";
    btn.textContent = opt;
    btn.addEventListener("click", () => onAnswer(idx));
    optionsEl.appendChild(btn);
  });
}

function onAnswer(selectedIndex){
  if(answered) return;
  answered = true;

  const q = questions[current];
  const btns = [...optionsEl.querySelectorAll(".answerBtn")];

  btns.forEach((b, idx) => {
    b.disabled = true;
    if(idx === q.correctIndex) b.classList.add("correct");
    if(idx === selectedIndex && idx !== q.correctIndex) b.classList.add("wrong");
  });

  if(selectedIndex === q.correctIndex) score++;
  scoreEl.textContent = String(score);

  nextBtn.disabled = false;
}

function showResult(){
  finalScoreEl.textContent = String(score);
  resultOverlay.classList.remove("hidden");

  // progress mentés: százalék
  const pct = Math.round((score / questions.length) * 100);
  localStorage.setItem(`quiz_progress_${continent}_${mode}`, String(pct));
}

function hideResult(){
  resultOverlay.classList.add("hidden");
}