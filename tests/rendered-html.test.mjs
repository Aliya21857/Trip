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
