const content = document.getElementById("content");

const continentIcons = {
    "Európa": "europa.png",
    "Ázsia": "azsia.png",
    "Afrika": "afrika.png",
    "Észak-Amerika": "eszak-amerika.png",
    "Dél-Amerika": "del-amerika.png",
    "Óceánia": "ausztralia.png"
};

async function loadContinents() {
    const res = await fetch("/api/continents");
    const continents = await res.json();

    content.innerHTML = "<h2>Válassz kontinenst</h2><div class='grid'></div>";
    const grid = document.querySelector(".grid");

    continents.forEach(c => {
        const div = document.createElement("div");
        div.className = "card-btn";

        div.innerHTML = `
            <img src="/continents/${continentIcons[c.kontinens]}" alt="">
            <h3>${c.kontinens}</h3>
        `;

        div.onclick = () => loadCountries(c.kontinens);

        grid.appendChild(div);
    });
}

async function loadCountries(kontinens) {
    const res = await fetch(`/api/countries/${kontinens}`);
    const countries = await res.json();

    content.innerHTML = `
        <button onclick="loadContinents()">⬅ Vissza a kontinensekhez</button>
        <h2>${kontinens} országai</h2>
        <div class="grid"></div>
    `;

    const grid = document.querySelector(".grid");

    countries.forEach(country => {
        const div = document.createElement("div");
        div.className = "card-btn";

        div.innerHTML = `
            <img src="/flags/${country.iso_kod}.jpg" alt="">
            <h3>${country.nev}</h3>
            <p>${country.fovaros}</p>
        `;

        grid.appendChild(div);
    });
}

function goToMainMenu() {
    window.location.href = "index.html";
}

loadContinents();

