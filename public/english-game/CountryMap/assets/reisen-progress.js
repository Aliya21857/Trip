(function (global) {
  'use strict';

  const STORAGE_KEY = 'reisenProgress';
  const VERSION = 2;
  const COUNTRY_IDS = ['de', 'at', 'ch', 'fr', 'es', 'tr', 'er', 'za', 'us'];
  const GAME_IDS = ['countryMap', 'dialoge', 'saetze', 'woher'];
  const LEVELS = [
    { level: 1, name: 'Starter', xp: 0 },
    { level: 2, name: 'Explorer', xp: 250 },
    { level: 3, name: 'Traveller', xp: 650 },
    { level: 4, name: 'Language Explorer', xp: 1200 },
    { level: 5, name: 'English Pro', xp: 2000 }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const int = (value, fallback = 0) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.floor(Number(value)) : fallback;
  const emptyCountry = () => ({ unlocked: false, visits: 0, firstVisitedAt: null });
  const emptyGame = () => ({ completed: false, bestScore: 0, bestCombo: 0, plays: 0, correctAnswers: 0, totalAnswers: 0, completionRewardClaimed: false });

  function defaults() {
    return {
      version: VERSION,
      player: { totalPoints: 0, totalXP: 0, level: 1 },
      lesson1: {
        completedGames: [], progressPercent: 0,
        games: {
          countryMap: emptyGame(),
          dialoge: { completed: false, bestScore: 0, bestCombo: 0, plays: 0, correctAnswers: 0, totalAnswers: 0, completionRewardClaimed: false, perfectAnswers: 0, hintsUsed: 0, metCharacters: [], completedDialogues: [] },
          saetze: { completed: false, bestScore: 0 },
          woher: { completed: false, bestScore: 0 }
        }
      },
      collections: {
        passport: { countries: Object.fromEntries(COUNTRY_IDS.map(id => [id, emptyCountry()])), encounters: {} },
        postcards: [], tickets: [], badges: []
      },
      achievements: {},
      bonuses: { suitcaseProgress: 0 },
      settings: { audio: { musicEnabled: true, soundEnabled: true, musicVolume: 0.24, soundVolume: 0.7 } },
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), migrations: [] }
    };
  }

  function storageGet(key) { try { return global.localStorage.getItem(key); } catch (_) { return null; } }
  function storageSet(key, value) { try { global.localStorage.setItem(key, value); return true; } catch (_) { return false; } }

  function normalize(raw) {
    const state = defaults();
    if (!raw || typeof raw !== 'object') return state;
    state.player.totalPoints = int(raw.player?.totalPoints);
    state.player.totalXP = int(raw.player?.totalXP);
    for (const id of GAME_IDS) {
      const incoming = raw.lesson1?.games?.[id];
      if (!incoming || typeof incoming !== 'object') continue;
      const target = state.lesson1.games[id];
      target.completed = incoming.completed === true;
      target.bestScore = int(incoming.bestScore);
      if (id === 'countryMap' || id === 'dialoge') {
        target.bestCombo = int(incoming.bestCombo);
        target.plays = int(incoming.plays);
        target.correctAnswers = int(incoming.correctAnswers);
        target.totalAnswers = int(incoming.totalAnswers);
        target.completionRewardClaimed = incoming.completionRewardClaimed === true;
        if (id === 'dialoge') {
          target.perfectAnswers = int(incoming.perfectAnswers);
          target.hintsUsed = int(incoming.hintsUsed);
          target.metCharacters = Array.isArray(incoming.metCharacters) ? [...new Set(incoming.metCharacters.filter(x => typeof x === 'string'))] : [];
          target.completedDialogues = Array.isArray(incoming.completedDialogues) ? [...new Set(incoming.completedDialogues.filter(x => typeof x === 'string'))] : [];
        }
      }
    }
    for (const id of COUNTRY_IDS) {
      const incoming = raw.collections?.passport?.countries?.[id];
      if (!incoming || typeof incoming !== 'object') continue;
      const visits = int(incoming.visits);
      state.collections.passport.countries[id] = {
        unlocked: incoming.unlocked === true || visits > 0,
        visits,
        firstVisitedAt: typeof incoming.firstVisitedAt === 'string' ? incoming.firstVisitedAt : null
      };
    }
    state.collections.passport.encounters = raw.collections?.passport?.encounters && typeof raw.collections.passport.encounters === 'object' && !Array.isArray(raw.collections.passport.encounters) ? clone(raw.collections.passport.encounters) : {};
    for (const key of ['postcards', 'tickets', 'badges']) state.collections[key] = Array.isArray(raw.collections?.[key]) ? [...new Set(raw.collections[key].filter(x => typeof x === 'string'))] : [];
    state.achievements = raw.achievements && typeof raw.achievements === 'object' && !Array.isArray(raw.achievements) ? clone(raw.achievements) : {};
    state.bonuses.suitcaseProgress = Math.min(2, int(raw.bonuses?.suitcaseProgress));
    const audio = raw.settings?.audio;
    if (audio && typeof audio === 'object') {
      state.settings.audio.musicEnabled = audio.musicEnabled !== false;
      state.settings.audio.soundEnabled = audio.soundEnabled !== false;
      state.settings.audio.musicVolume = Math.min(1, Math.max(0, Number.isFinite(Number(audio.musicVolume)) ? Number(audio.musicVolume) : 0.24));
      state.settings.audio.soundVolume = Math.min(1, Math.max(0, Number.isFinite(Number(audio.soundVolume)) ? Number(audio.soundVolume) : 0.7));
    }
    state.meta.createdAt = typeof raw.meta?.createdAt === 'string' ? raw.meta.createdAt : state.meta.createdAt;
    state.meta.migrations = Array.isArray(raw.meta?.migrations) ? raw.meta.migrations.filter(x => typeof x === 'string') : [];
    if (raw.meta?.goldenPassportCelebrated === true) state.meta.goldenPassportCelebrated = true;
    return derive(state);
  }

  function derive(state) {
    state.lesson1.completedGames = GAME_IDS.filter(id => state.lesson1.games[id].completed);
    state.lesson1.progressPercent = state.lesson1.completedGames.length * 25;
    state.player.level = getLevel(state.player.totalXP).level;
    state.version = VERSION;
    state.meta.updatedAt = new Date().toISOString();
    return state;
  }

  function migrateLegacy(state) {
    if (state.meta.migrations.includes('country-map-v1')) return state;
    try {
      const legacy = JSON.parse(storageGet('german-games-passport-v1') || 'null');
      if (legacy?.countries && typeof legacy.countries === 'object') {
        for (const id of COUNTRY_IDS) {
          const old = legacy.countries[id];
          if (!old || typeof old !== 'object') continue;
          const visits = int(old.visits);
          const target = state.collections.passport.countries[id];
          target.visits = Math.max(target.visits, visits);
          target.unlocked = target.unlocked || old.unlocked === true || visits > 0;
        }
      }
      const oldBest = int(storageGet('flagMatchBest'));
      state.lesson1.games.countryMap.bestScore = Math.max(state.lesson1.games.countryMap.bestScore, oldBest);
    } catch (_) { /* malformed legacy data is ignored */ }
    state.meta.migrations.push('country-map-v1');
    return state;
  }

  function load() {
    let raw = null;
    try { raw = JSON.parse(storageGet(STORAGE_KEY) || 'null'); } catch (_) { raw = null; }
    const state = migrateLegacy(normalize(raw));
    save(state);
    return state;
  }

  function save(state) { derive(state); storageSet(STORAGE_KEY, JSON.stringify(state)); return state; }
  function getLevel(xp) {
    const total = int(xp); let current = LEVELS[0];
    for (const item of LEVELS) if (total >= item.xp) current = item;
    const next = LEVELS.find(item => item.level === current.level + 1) || null;
    return { ...current, next, progress: next ? Math.min(100, Math.round((total - current.xp) / (next.xp - current.xp) * 100)) : 100 };
  }
  function addPoints(state, amount) { state.player.totalPoints += int(amount); save(state); return state.player.totalPoints; }
  function addXP(state, amount) { const before = getLevel(state.player.totalXP); state.player.totalXP += int(amount); const after = getLevel(state.player.totalXP); save(state); return { before, after, leveledUp: after.level > before.level }; }
  function unlockCountry(state, id) {
    const item = state.collections.passport.countries[id]; if (!item) return { firstVisit: false, visits: 0 };
    const firstVisit = !item.unlocked; item.unlocked = true; item.visits += 1;
    if (firstVisit) item.firstVisitedAt = new Date().toISOString();
    save(state); return { firstVisit, visits: item.visits };
  }
  function unlockAchievement(state, id) {
    if (state.achievements[id]) return false;
    state.achievements[id] = { unlockedAt: new Date().toISOString() }; save(state); return true;
  }
  function unlockEncounter(state, id) {
    if (typeof id !== 'string' || !id) return { firstEncounter: false };
    const firstEncounter = !state.collections.passport.encounters[id];
    if (firstEncounter) state.collections.passport.encounters[id] = { unlockedAt: new Date().toISOString() };
    save(state); return { firstEncounter };
  }
  function updateSuitcase(state, correct) {
    if (!correct) return { ready: false, progress: state.bonuses.suitcaseProgress };
    state.bonuses.suitcaseProgress += 1;
    const ready = state.bonuses.suitcaseProgress >= 3;
    if (ready) state.bonuses.suitcaseProgress = 0;
    save(state); return { ready, progress: state.bonuses.suitcaseProgress };
  }
  function completeGame(state, id, score = 0) {
    const game = state.lesson1.games[id]; if (!game) return { firstCompletion: false };
    const firstCompletion = !game.completed; game.completed = true; game.bestScore = Math.max(int(game.bestScore), int(score)); save(state);
    return { firstCompletion };
  }
  function getLessonProgress(state) { const count = GAME_IDS.filter(id => state.lesson1.games[id].completed).length; return { count, total: 4, percent: count * 25 }; }
  function resetPassport(state) { state.collections.passport.countries = Object.fromEntries(COUNTRY_IDS.map(id => [id, emptyCountry()])); save(state); }

  global.ReisenProgress = { STORAGE_KEY, VERSION, COUNTRY_IDS, GAME_IDS, LEVELS, load, save, addPoints, addXP, getLevel, completeGame, unlockAchievement, unlockCountry, unlockEncounter, updateSuitcase, getLessonProgress, resetPassport };
})(window);
