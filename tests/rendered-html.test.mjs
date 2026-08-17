import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const gameUrl = new URL("../public/english-game/index.html", import.meta.url);

test("serves the Reisen game from the application root", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /redirect\(["']\/english-game\/["']\)/);
});

test("includes all four playable travel stations", async () => {
  const html = await readFile(gameUrl, "utf8");

  assert.match(html, /Country Race/);
  assert.match(html, /Dialogues/);
  assert.match(html, /Sentence Train/);
  assert.match(html, /Where From\?/);
  assert.match(html, /localStorage\.setItem/);
  assert.match(html, /e\.key===['"]Escape['"]/);
  assert.match(html, /data-scroll/);
});

test("ships every asset used by the game shell", async () => {
  await Promise.all([
    access(new URL("public/english-game/assets/reisen-town-hero.png", root)),
    access(new URL("public/english-game/assets/game-cards-sheet.png", root)),
  ]);
});

test("all four stations teach English", async () => {
  const [country, dialogues, sentences, origin, audio] = await Promise.all([
    readFile(new URL("../public/english-game/CountryMap/assets/country-map.js", import.meta.url), "utf8"),
    readFile(new URL("../public/english-game/Dialoge/assets/dialoge.js", import.meta.url), "utf8"),
    readFile(new URL("../public/english-game/Saetze/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/english-game/Woher/luggage-catch.js", import.meta.url), "utf8"),
    readFile(new URL("../public/english-game/assets/reisen-audio.js", import.meta.url), "utf8"),
  ]);

  assert.match(country, /Germany/);
  assert.match(country, /Switzerland/);
  assert.match(dialogues, /What is your name\?/);
  assert.match(dialogues, /Where are you from\?/);
  assert.match(sentences, /correctSentence:'I am from Germany\.'/);
  assert.match(sentences, /correctSentence:'How are you\?'/);
  assert.match(origin, /prep:'from'/);
  assert.match(origin, /Catch the matching suitcase\./);
  assert.match(audio, /'en-US'/);
});

test("active game files contain no German learner-facing copy", async () => {
  const files = [
    "CountryMap/index.html",
    "CountryMap/assets/country-map.js",
    "Dialoge/index.html",
    "Dialoge/assets/dialoge.js",
    "Saetze/index.html",
    "Woher/index.html",
    "Woher/luggage-catch.js",
  ];
  const source = (
    await Promise.all(
      files.map((file) =>
        readFile(new URL(`../public/english-game/${file}`, import.meta.url), "utf8"),
      ),
    )
  ).join("\n");

  assert.doesNotMatch(
    source,
    /de-DE|Deutsch|Lektion|Guten Morgen|Wie geht|Ich komme|aus der|aus den|Correct ist|Wörter hier|Zurück zu den Spielen/i,
  );
});
