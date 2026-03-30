const listEl = document.getElementById("continentList");

const continents = [
  { name: "Európa", file: "europe.svg", icon: "/continents/europa.png" },
  { name: "Afrika", file: "africa.svg", icon: "/continents/afrika.png" },
  { name: "Ázsia", file: "asia.svg", icon: "/continents/azsia.png" },
  { name: "Észak-Amerika", file: "northAmerica.svg", icon: "/continents/eszak-amerika.png" },
  { name: "Dél-Amerika", file: "southAmerica.svg", icon: "/continents/del-amerika.png" },
  { name: "Óceánia", file: "oceania.svg", icon: "/continents/ausztralia.png" }
];

listEl.innerHTML = "";

continents.forEach(c => {
  const btn = document.createElement("button");
  btn.className = "bigRowBtn";
  btn.type = "button";

  btn.innerHTML = `
    <div class="bigRowLeft">
      <div class="bigCircle">
        <img src="${c.icon}" alt="${c.name}" class="continentIcon">
      </div>
      <div class="bigLabel">${c.name}</div>
    </div>
    <div class="bigPercent">▶</div>
  `;

  btn.addEventListener("click", () => {
    location.href = `mapgame.html?continent=${encodeURIComponent(c.name)}&map=${encodeURIComponent(c.file)}`;
  });

  listEl.appendChild(btn);
});