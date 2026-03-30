const params = new URLSearchParams(location.search);
const continent = params.get("continent") || "";

document.getElementById("title").textContent = `${continent} tesztek`;

const capitalsPct = document.getElementById("capitalsPct");
const flagsPct = document.getElementById("flagsPct");

capitalsPct.textContent = getProgress(continent, "capitals") + "%";
flagsPct.textContent = getProgress(continent, "flags") + "%";

document.getElementById("capitalsBtn").addEventListener("click", ()=>{
  location.href = `quiz_play.html?continent=${encodeURIComponent(continent)}&mode=capitals`;
});

document.getElementById("flagsBtn").addEventListener("click", ()=>{
  location.href = `quiz_play.html?continent=${encodeURIComponent(continent)}&mode=flags`;
});

function getProgress(continent, mode){
  const key = `quiz_progress_${continent}_${mode}`;
  const v = localStorage.getItem(key);
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}