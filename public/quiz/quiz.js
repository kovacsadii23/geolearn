const listEl = document.getElementById("continentList");
const continentIcons = {
  "Európa": "europa.png",
  "Afrika": "afrika.png",
  "Ázsia": "azsia.png",
  "Észak-Amerika": "eszak-amerika.png",
  "Dél-Amerika": "del-amerika.png",
  "Óceánia": "ausztralia.png"
};

init();

async function init(){
  const continents = await fetch("/api/continents").then(r=>r.json());

  // continents: [{kontinens:"Európa"}, ...]
  listEl.innerHTML = "";

  continents.forEach(c => {
    const name = c.kontinens;

    // kontinens haladás: átlag a két típusból (capitals + flags)
    const p1 = getProgress(name, "capitals");
    const p2 = getProgress(name, "flags");
    const avg = Math.round((p1 + p2) / 2);

    const btn = document.createElement("button");
    btn.className = "bigRowBtn";
    btn.type = "button";

    const iconFile = continentIcons[name];
    const iconHtml = iconFile
      ? `<img src="/continents/${iconFile}" alt="${name}" class="continentIcon">`
      : "🌍";

    btn.innerHTML = `
      <div class="bigRowLeft">
        <div class="bigCircle">
          ${iconHtml}
        </div>
        <div class="bigLabel">${escapeHtml(name)}</div>
      </div>
      <div class="bigPercent">${avg}%</div>
    `;

    btn.addEventListener("click", ()=>{
      location.href = `quiz_types.html?continent=${encodeURIComponent(name)}`;
    });

    listEl.appendChild(btn);
  });
}

function getProgress(continent, mode){
  const key = `quiz_progress_${continent}_${mode}`;
  const v = localStorage.getItem(key);
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}