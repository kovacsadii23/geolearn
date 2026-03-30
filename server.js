const express = require("express");
const path = require("path");
const pool = require("./db");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Teszt adatbázis kapcsolat
app.get("/api/countries", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM countries");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Adatbázis hiba" });
    }
});

app.listen(PORT, () => {
    console.log(`Szerver fut: http://localhost:${PORT}`);
});

// Kontinensek lekérése
app.get("/api/continents", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT DISTINCT kontinens FROM countries ORDER BY kontinens"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Hiba a kontinensek lekérésekor" });
    }
});

// Országok lekérése kontinens szerint
app.get("/api/countries/:continent", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM countries WHERE kontinens = $1 ORDER BY nev",
            [req.params.continent]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Hiba az országok lekérésekor" });
    }
});

app.get("/api/random-flag", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT iso_kod, nev
      FROM countries
      WHERE iso_kod IS NOT NULL AND iso_kod <> ''
      ORDER BY RANDOM()
      LIMIT 1
    `);

    const row = result.rows[0];
    res.json({
      flag: "/flags/" + row.iso_kod.toLowerCase() + ".jpg",
      iso: row.iso_kod.toLowerCase(),
      nev: row.nev
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Random ország hiba" });
  }
});
app.get("/api/country-name/:iso", async (req, res) => {
  try {
    const iso = req.params.iso.toLowerCase();

    const result = await pool.query(
      "SELECT nev FROM countries WHERE iso_kod = $1 LIMIT 1",
      [iso]
    );

    if (result.rows.length === 0) {
      return res.json({ nev: "Ismeretlen ország" });
    }

    res.json({ nev: result.rows[0].nev });

  } catch (err) {
    console.error("DB hiba:", err);
    res.status(500).json({ nev: "Ismeretlen ország" });
  }
});
// Memory játékhoz: 18 random ország (ország + főváros párok)
app.get("/api/memory-pairs", async (req, res) => {
  try {
    const pairCount = Number(req.query.pairs ?? 18); // alap: 18 (6x6)
    const limit = Math.min(Math.max(pairCount, 4), 25); // 4..25 közé szorítjuk

    // csak olyan országok, ahol van név + főváros + iso_kod
    const result = await pool.query(
      `
      SELECT iso_kod, nev, fovaros
      FROM countries
      WHERE nev IS NOT NULL AND nev <> ''
        AND fovaros IS NOT NULL AND fovaros <> ''
        AND iso_kod IS NOT NULL AND iso_kod <> ''
      ORDER BY RANDOM()
      LIMIT $1
      `,
      [limit]
    );

    // 2 kártya / pár: country + capital
    const cards = [];
    let id = 1;

    for (const row of result.rows) {
      const pairId = row.iso_kod.toLowerCase();

      cards.push({
        id: id++,
        type: "country",
        value: row.nev,
        pairId
      });

      cards.push({
        id: id++,
        type: "capital",
        value: row.fovaros,
        pairId
      });
    }

    // keverés (Fisher–Yates)
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    res.json({
      grid: "6x6",
      pairs: limit,
      totalCards: cards.length,
      cards
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Memory párok lekérése sikertelen" });
  }
});
app.get("/api/quiz", async (req, res) => {
  try {
    const count = Math.min(Math.max(Number(req.query.count ?? 10), 5), 25);
    const continent = (req.query.continent ?? "").trim();
    const mode = (req.query.mode ?? "capitals").trim(); // capitals | flags

    // rossz válasz pool (fővárosokhoz / országokhoz)
    const capPoolRes = await pool.query(`
      SELECT DISTINCT fovaros FROM countries
      WHERE fovaros IS NOT NULL AND fovaros <> ''
    `);
    const capPool = capPoolRes.rows.map(r => r.fovaros);

    const countryPoolRes = await pool.query(`
      SELECT DISTINCT nev FROM countries
      WHERE nev IS NOT NULL AND nev <> ''
    `);
    const countryPool = countryPoolRes.rows.map(r => r.nev);

    const shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const pickWrong = (pool, correct, n = 3) => {
      const out = [];
      while (out.length < n && pool.length > n) {
        const v = pool[Math.floor(Math.random() * pool.length)];
        if (v !== correct && !out.includes(v)) out.push(v);
      }
      return out;
    };

    // alap WHERE (kontinens szűrés)
    const whereContinent = continent ? "AND kontinens = $2" : "";
    const params = continent ? [count, continent] : [count];

    if (mode === "capitals") {
      const base = await pool.query(
        `
        SELECT iso_kod, nev, fovaros
        FROM countries
        WHERE nev IS NOT NULL AND nev <> ''
          AND fovaros IS NOT NULL AND fovaros <> ''
          ${whereContinent}
        ORDER BY RANDOM()
        LIMIT $1
        `,
        params
      );

      const questions = base.rows.map((row, idx) => {
        const correct = row.fovaros;
        const wrongs = pickWrong(capPool, correct, 3);
        const options = shuffle([correct, ...wrongs]);

        return {
          id: idx + 1,
          mode: "capitals",
          question: `Mi ${row.nev} fővárosa?`,
          options,
          correctIndex: options.indexOf(correct),
          iso: row.iso_kod?.toLowerCase() ?? null
        };
      });

      return res.json({ count: questions.length, questions });
    }

    if (mode === "flags") {
      const base = await pool.query(
        `
        SELECT iso_kod, nev
        FROM countries
        WHERE nev IS NOT NULL AND nev <> ''
          AND iso_kod IS NOT NULL AND iso_kod <> ''
          ${whereContinent}
        ORDER BY RANDOM()
        LIMIT $1
        `,
        params
      );

      const questions = base.rows.map((row, idx) => {
        const iso = row.iso_kod.toLowerCase();
        const correct = row.nev;
        const wrongs = pickWrong(countryPool, correct, 3);
        const options = shuffle([correct, ...wrongs]);

        return {
          id: idx + 1,
          mode: "flags",
          question: `Melyik ország zászlója ez?`,
          flag: `/flags/${iso}.jpg`,
          options,
          correctIndex: options.indexOf(correct),
          iso
        };
      });

      return res.json({ count: questions.length, questions });
    }

    res.status(400).json({ error: "Ismeretlen mode. Használd: capitals | flags" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Kvíz lekérése sikertelen" });
  }
});
app.get("/api/mapgame-countries", async (req, res) => {
  try {
    const continent = (req.query.continent || "Európa").trim();

    let result;

    if (continent === "Ázsia") {
      result = await pool.query(
        `
        SELECT nev, iso_kod
        FROM countries
        WHERE (
          kontinens = $1
          OR iso_kod = 'ru'
        )
          AND nev IS NOT NULL AND nev <> ''
          AND iso_kod IS NOT NULL AND iso_kod <> ''
        ORDER BY nev
        `,
        [continent]
      );
    } else if (continent === "Európa") {
      result = await pool.query(
        `
        SELECT nev, iso_kod
        FROM countries
        WHERE (
          kontinens = $1
          OR iso_kod = 'ru'
        )
          AND nev IS NOT NULL AND nev <> ''
          AND iso_kod IS NOT NULL AND iso_kod <> ''
        ORDER BY nev
        `,
        [continent]
      );
    } else {
      result = await pool.query(
        `
        SELECT nev, iso_kod
        FROM countries
        WHERE kontinens = $1
          AND nev IS NOT NULL AND nev <> ''
          AND iso_kod IS NOT NULL AND iso_kod <> ''
        ORDER BY nev
        `,
        [continent]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Nem sikerült betölteni az országlistát." });
  }
});

