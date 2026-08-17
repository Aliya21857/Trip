(function () {
  'use strict';

  const API = window.ReisenProgress;
  const COUNTRIES = [
    { id: 'de', name: 'Deutschland', color: '#315f47' },
    { id: 'at', name: 'Österreich', color: '#c34c3c' },
    { id: 'ch', name: 'die Schweiz', color: '#417446' },
    { id: 'fr', name: 'Frankreich', color: '#315986' },
    { id: 'es', name: 'Spanien', color: '#a77b2b' },
    { id: 'tr', name: 'die Türkei', color: '#a84d42' },
    { id: 'er', name: 'Eritrea', color: '#458277' },
    { id: 'za', name: 'Südafrika', color: '#4f7655' },
    { id: 'us', name: 'die USA', color: '#59617f' }
  ];
  const ACHIEVEMENTS = {
    firstFlight: ['Erster Flug', 'Die erste Country-Map-Mission geschafft.'],
    threeInRow: ['Drei in Folge', 'Drei richtige Antworten in Folge.'],
    worldExplorer: ['Weltentdecker', 'Eine Serie von fünf erreicht.'],
    countryPro: ['Länderprofi', 'Alle neun Länder in einer Reise erkannt.'],
    globetrotter: ['Weltenbummler', 'Alle neun Länderstempel gesammelt.'],
    perfectFlight: ['Perfekter Flug', 'Alle neun Flugziele ohne Fehler erreicht.']
  };
  const GAME_CONFIG = {
    correctPoints: 100, mysteryPoints: 200,
    comboPoints: [100, 100, 120, 140, 160],
    correctReisePoints: 25, correctXP: 20, firstVisitXP: 25,
    mysteryReisePoints: 40, mysteryXP: 30,
    completionPoints: 250, completionXP: 100,
    bonusChoiceThreshold: 3, maxBonusChoicesPerRun: 1,
    suitcaseThreshold: 3,
    suitcaseRewards: [
      { id: 'points', title: '+50 Reisepunkte', copy: 'Ein Reisebonus für dein Profil.', points: 50 },
      { id: 'double', title: 'Doppel-Punkte', copy: 'Die nächste richtige Antwort zählt doppelt.' },
      { id: 'shield', title: 'Combo-Schutz', copy: 'Ein Fehler unterbricht deine Serie nicht.' },
      { id: 'travel', title: 'Reisebonus', copy: '+100 Spielpunkte und +25 Reisepunkte.', points: 25, gamePoints: 100 }
    ]
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const app = $('#reisenApp');
  if (!app || !API) return;
  let state = API.load();
  let round = [], index = 0, score = 0, correct = 0, combo = 0, bestCombo = 0, newStamps = 0;
  let answered = false, soundOn = safeGet('reisenSound') !== 'off', audio = null, mysteryIndexes = new Set();
  let activeBonus = null, modalOpener = null, bonusChoices = 0, mistakes = 0, selectedLane = 0;

  function safeGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function format(number) { return new Intl.NumberFormat('de-DE').format(number); }
  function shuffle(items) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
  function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
  function announce(text) { $('#reiseLive').textContent = ''; requestAnimationFrame(() => { $('#reiseLive').textContent = text; }); }

  function flagSVG(code) {
    const open = '<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">', close = '</svg>';
    const bands = (colors, vertical = false) => colors.map((color, i) => vertical ? `<rect x="${i * 300 / colors.length}" width="${300 / colors.length}" height="200" fill="${color}"/>` : `<rect y="${i * 200 / colors.length}" width="300" height="${200 / colors.length}" fill="${color}"/>`).join('');
    let svg = '';
    if (code === 'de') svg = bands(['#111', '#d00', '#ffce00']);
    if (code === 'at') svg = bands(['#ed2939', '#fff', '#ed2939']);
    if (code === 'ch') svg = '<rect width="300" height="200" fill="#d52b1e"/><path d="M125 35h50v40h40v50h-40v40h-50v-40H85V75h40z" fill="#fff"/>';
    if (code === 'fr') svg = bands(['#0055a4', '#fff', '#ef4135'], true);
    if (code === 'es') svg = '<rect width="300" height="200" fill="#aa151b"/><rect y="50" width="300" height="100" fill="#f1bf00"/><rect x="67" y="79" width="28" height="42" rx="3" fill="#aa151b"/>';
    if (code === 'tr') svg = '<rect width="300" height="200" fill="#e30a17"/><circle cx="125" cy="100" r="53" fill="#fff"/><circle cx="143" cy="100" r="43" fill="#e30a17"/><path d="M178 100l27-9-17 23v-28l17 23z" fill="#fff"/>';
    if (code === 'er') svg = '<rect width="300" height="200" fill="#12ad2b"/><path d="M0 0v200l300-100z" fill="#e4181c"/><path d="M0 200h300L0 100z" fill="#4189dd"/><circle cx="76" cy="100" r="29" fill="none" stroke="#ffc726" stroke-width="7"/>';
    if (code === 'za') svg = '<rect width="300" height="200" fill="#de3831"/><path d="M0 0l106 100L0 200z"/><path d="M0 70h73L162 0h138v55H180l-56 45 56 45h120v55H162l-89-70H0z" fill="#fff"/><path d="M0 84h81l94-74h125v32H169l-72 58 72 58h131v32H175l-94-74H0z" fill="#007a4d"/><path d="M170 158h130v32H170l-39-32z" fill="#002395"/><path d="M0 77v46l24-23z" fill="#ffb612"/>';
    if (code === 'us') svg = bands(Array.from({ length: 13 }, (_, i) => i % 2 ? '#fff' : '#b22234')) + '<rect width="126" height="108" fill="#3c3b6e"/>' + Array.from({ length: 5 }, (_, y) => Array.from({ length: 6 }, (_, x) => `<circle cx="${11 + x * 21}" cy="${10 + y * 21}" r="3" fill="#fff"/>`).join('')).join('');
    return open + svg + close;
  }

  function routeHTML(current) {
    return COUNTRIES.map((_, i) => `<i class="route-node ${i < current ? 'done' : i === current ? 'current' : ''}">${i < current ? '✓' : i === current ? '✈' : ''}</i>`).join('');
  }
  function visitedCount() { return COUNTRIES.filter(c => state.collections.passport.countries[c.id].unlocked).length; }
  function levelData() { return API.getLevel(state.player.totalXP); }
  function syncUI() {
    state = API.load();
    const level = levelData(), lesson = API.getLessonProgress(state), visited = visitedCount();
    $$('[data-global-points]').forEach(el => el.textContent = format(state.player.totalPoints));
    $$('[data-level-short]').forEach(el => el.textContent = `Lv. ${level.level}`);
    $$('[data-level-name]').forEach(el => el.textContent = `Lv. ${level.level} · ${level.name}`);
    $$('[data-xp-bar]').forEach(el => el.style.width = level.progress + '%');
    $$('[data-xp-text]').forEach(el => el.textContent = level.next ? `${format(state.player.totalXP)} / ${format(level.next.xp)} XP` : `${format(state.player.totalXP)} XP · Maximum`);
    $$('[data-visited]').forEach(el => el.textContent = visited);
    $$('[data-games]').forEach(el => el.textContent = lesson.count);
    $$('[data-lesson-bar]').forEach(el => el.style.width = lesson.percent + '%');
    $$('[data-passport-bar]').forEach(el => el.style.width = (visited / 9 * 100) + '%');
    $$('[data-suitcase]').forEach(el => el.textContent = state.bonuses.suitcaseProgress);
    $('#reiseBest').textContent = format(state.lesson1.games.countryMap.bestScore);
    $('#leftBest').textContent = format(state.lesson1.games.countryMap.bestScore);
    renderMiniStamps();
  }

  function renderMiniStamps() {
    $('#reiseMiniStamps').innerHTML = COUNTRIES.map((country, i) => {
      const open = state.collections.passport.countries[country.id].unlocked;
      return `<i class="mini-stamp ${open ? 'open' : ''}" style="--stamp:${country.color};--turn:${(i % 5 - 2) * 2}deg" title="${escapeHTML(country.name)}">${open ? '✓' : '★'}</i>`;
    }).join('');
  }
  function stampHTML(country, large = false) {
    const item = state.collections.passport.countries[country.id], turn = (COUNTRIES.indexOf(country) % 5 - 2) * 2;
    return `<article class="country-stamp ${item.unlocked ? '' : 'locked'}" style="--stamp:${country.color};--turn:${turn}deg" aria-label="${escapeHTML(country.name)}: ${item.unlocked ? `${item.visits} Besuche` : 'noch nicht besucht'}">${flagSVG(country.id)}<strong>${escapeHTML(country.name)}</strong><small>${item.unlocked ? 'BESUCHT' : 'NOCH OFFEN'}</small>${item.unlocked ? `<small>${item.visits}× besucht</small>` : ''}</article>`;
  }
  function renderPassport() {
    syncUI();
    $('#reiseStampGrid').innerHTML = COUNTRIES.map(c => stampHTML(c)).join('');
    const all = visitedCount() === 9;
    $('#passportMilestone').innerHTML = all ? '<b>Alle Länder entdeckt!</b> Das Länder-Meister-Abzeichen gehört dir. Der Goldene Reisepass wartet nach allen vier Spielen.' : 'Sammle alle neun Länderstempel. Der Goldene Reisepass gehört zur gesamten Lektion 1.';
  }

  function showScreen(id) { $$('.reise-screen').forEach(screen => { screen.hidden = screen.id !== id; }); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  function pickMysteries() { const choices = shuffle([1, 2, 3, 4, 5, 6, 7]); mysteryIndexes = new Set(choices.slice(0, 2)); }
  function startGame() {
    window.ReisenAudio?.playMusic();
    round = shuffle(COUNTRIES); index = score = correct = combo = bestCombo = newStamps = bonusChoices = mistakes = 0; answered = false; activeBonus = null; pickMysteries();
    const game = state.lesson1.games.countryMap; game.plays += 1; API.save(state);
    showScreen('reiseGame'); renderQuestion();
  }
  function choicesFor(country) { return shuffle([country, ...shuffle(COUNTRIES.filter(c => c.id !== country.id)).slice(0, 3)]); }
  function renderQuestion() {
    answered = false;
    const country = round[index], mystery = mysteryIndexes.has(index);
    $('#reiseMission').textContent = `MISSION ${index + 1} / 9`;
    if ($('#missionsDone')) $('#missionsDone').textContent = index;
    $('#reiseScore').textContent = format(score);
    $$('[data-route]').forEach(route => route.innerHTML = routeHTML(index));
    $('#reiseCard').classList.remove('phase-start', 'phase-middle', 'phase-final', 'is-flying', 'flight-correct', 'flight-wrong', 'turbo-on', 'arriving');
    $('#reiseCard').classList.add(index < 3 ? 'phase-start' : index < 6 ? 'phase-middle' : 'phase-final');
    if (combo >= 3) $('#reiseCard').classList.add('turbo-on');
    const flightPlane = $('#flightPlane');
    flightPlane.style.setProperty('--lane', '50%');
    flightPlane.classList.remove('launching');
    $('#reiseFlag').innerHTML = flagSVG(country.id);
    $('#reiseFlag').setAttribute('aria-label', `Flagge von ${country.name}`);
    $('#mysteryLabel').hidden = !mystery;
    $('#conceal').hidden = !mystery;
    $('#conceal').style.opacity = mystery ? '1' : '0';
    if (mystery) setTimeout(() => { if (index < round.length && !answered) $('#conceal').style.opacity = '.23'; }, 850);
    else $('#conceal').style.opacity = '1';
    $('#reiseFeedback').textContent = '';
    $('#reiseNext').hidden = true;
    $('#reiseAnswers').innerHTML = '';
    const choices = choicesFor(country);
    choices.forEach((choice, lane) => {
      const button = document.createElement('button'); button.className = 'reise-answer flight-gate'; button.dataset.id = choice.id; button.dataset.lane = lane;
      button.style.setProperty('--gate', lane); button.innerHTML = `<span class="gate-sign">${escapeHTML(choice.name)}</span><i aria-hidden="true"></i>`;
      button.addEventListener('click', () => answer(button, choice.id === country.id)); $('#reiseAnswers').append(button);
    });
    selectedLane = 0;
    updateCombo();
    setTimeout(() => $('#reiseAnswers button')?.focus(), 70);
  }

  function gamePointsFor(mystery) {
    if (mystery) return GAME_CONFIG.mysteryPoints;
    const value = GAME_CONFIG.comboPoints[Math.min(combo, GAME_CONFIG.comboPoints.length - 1)] || GAME_CONFIG.correctPoints;
    return activeBonus?.id === 'double' ? value * 2 : value;
  }
  function answer(button, isCorrect) {
    if (answered) return; answered = true;
    const country = round[index], mystery = mysteryIndexes.has(index), buttons = $$('.reise-answer');
    selectedLane = Number(button.dataset.lane || 0);
    buttons.forEach(btn => { btn.disabled = true; btn.classList.toggle('selected', btn === button); });
    $('#flightPlane').style.setProperty('--lane', `${12.5 + selectedLane * 25}%`);
    $('#flightPlane').classList.add('launching');
    $('#reiseCard').classList.add('is-flying');
    $('#reiseFeedback').innerHTML = '<strong>Route gewählt – Anflug läuft …</strong>';
    announce(`Route ${selectedLane + 1} gewählt. Das Flugzeug startet.`);
    setTimeout(() => resolveFlight(button, isCorrect, country, mystery, buttons), reducedMotion() ? 80 : 820);
  }
  function resolveFlight(button, isCorrect, country, mystery, buttons) {
    buttons.forEach(btn => { if (btn.dataset.id === country.id) btn.classList.add('correct'); });
    state.lesson1.games.countryMap.totalAnswers += 1;
    if (isCorrect) {
      combo += 1; bestCombo = Math.max(bestCombo, combo); correct += 1; state.lesson1.games.countryMap.correctAnswers += 1;
      const earnedGame = gamePointsFor(mystery), earnedRP = mystery ? GAME_CONFIG.mysteryReisePoints : GAME_CONFIG.correctReisePoints, earnedXP = mystery ? GAME_CONFIG.mysteryXP : GAME_CONFIG.correctXP;
      score += earnedGame; API.addPoints(state, earnedRP); const levelResult = API.addXP(state, earnedXP); const visit = API.unlockCountry(state, country.id);
      if (visit.firstVisit) { newStamps += 1; API.addXP(state, GAME_CONFIG.firstVisitXP); }
      const suitcase = API.updateSuitcase(state, true);
      $('#reiseCard').classList.add('flight-correct');
      $('#reiseFeedback').innerHTML = `<div class="reward-lines"><strong>Tor getroffen!</strong><span>+${earnedGame} Flugmeilen</span><span>+${earnedRP} Reisepunkte</span><span>+${earnedXP}${visit.firstVisit ? ` + ${GAME_CONFIG.firstVisitXP}` : ''} XP</span>${visit.firstVisit ? '<span>Neuer Stempel!</span>' : ''}${combo === 3 ? '<span>⚡ Turbo aktiviert!</span>' : ''}</div>`;
      tone('correct'); celebrateSmall();
      unlockAt('firstFlight'); if (combo >= 3) unlockAt('threeInRow'); if (combo >= 5) unlockAt('worldExplorer');
      if (visitedCount() === 9) { unlockAt('globetrotter'); if (!state.collections.badges.includes('laender-meister')) { state.collections.badges.push('laender-meister'); API.save(state); } }
      if (levelResult.leveledUp) toast('Level aufgestiegen!', `Lv. ${levelResult.after.level} · ${levelResult.after.name}`);
      if (suitcase.ready) setTimeout(openSuitcase, 450); else if (visit.firstVisit) setTimeout(() => showStampReward(country), 350);
      if (activeBonus?.id === 'double') activeBonus = null;
    } else {
      mistakes += 1;
      button.classList.add('wrong');
      $('#reiseCard').classList.add('flight-wrong');
      const protectedCombo = activeBonus?.id === 'shield';
      if (protectedCombo) { activeBonus = null; toast('Combo-Schutz', 'Deine Serie bleibt erhalten.'); } else { if (activeBonus?.id === 'double') toast('Reisebonus', 'Bonus verpasst. Deine Reise geht normal weiter.'); activeBonus = null; combo = 0; }
      $('#reiseFeedback').innerHTML = `<strong>Knapp vorbeigeflogen!</strong>&nbsp; Das richtige Tor ist ${escapeHTML(country.name)}.`; tone('wrong');
    }
    API.save(state); $('#reiseScore').textContent = format(score); $('#conceal').style.opacity = '0'; updateCombo(); syncUI(); $('#reiseNext').hidden = false; $('#reiseNext').focus(); announce(isCorrect ? `Richtiges Flugziel: ${country.name}.` : `Knapp vorbei. Das richtige Flugziel ist ${country.name}.`);
  }
  function updateCombo() {
    $('#reiseCombo').textContent = combo >= 5 ? 'Weltentdecker!' : combo >= 2 ? `Serie x${combo}` : 'Serie starten';
    $('#comboHelp').textContent = combo ? `${Math.max(0, 3 - state.bonuses.suitcaseProgress)} richtige bis zum Koffer-Bonus.` : 'Drei richtige Antworten finden den Koffer.';
  }
  function nextQuestion() { closeModal($('#reiseReward')); if (combo >= GAME_CONFIG.bonusChoiceThreshold && bonusChoices < GAME_CONFIG.maxBonusChoicesPerRun && index < 8) { showRouteChoice(); return; } index += 1; if (index < 9) renderQuestion(); else arriveAndFinish(); }
  function showRouteChoice() {
    bonusChoices += 1;
    $('#rewardKicker').textContent = 'REISEBONUS · DEINE WAHL'; $('#rewardHeading').textContent = 'Wie reist du weiter?';
    $('#rewardImage').innerHTML = '<img src="assets/country-map/plane.svg" alt="Flugzeug auf der Reiseroute">';
    $('#rewardCopy').innerHTML = '<div class="button-row"><button class="reise-button secondary" id="safeRoute">Sicher weiter</button><button class="reise-button primary" id="riskRoute">Bonus riskieren</button></div><small>Sicher: Deine Serie ist einmal geschützt. Risiko: Die nächste richtige Antwort zählt doppelt.</small>';
    openModal($('#reiseReward'), $('#reiseNext'));
    $('#safeRoute').onclick = () => { activeBonus = { id: 'shield' }; closeModal($('#reiseReward')); index += 1; renderQuestion(); announce('Sichere Route gewählt. Deine Serie ist geschützt.'); };
    $('#riskRoute').onclick = () => { activeBonus = { id: 'double' }; closeModal($('#reiseReward')); index += 1; renderQuestion(); announce('Bonusrute gewählt. Die nächste richtige Antwort zählt doppelt.'); };
  }
  function finishGame() {
    const game = state.lesson1.games.countryMap, oldBest = game.bestScore;
    game.bestScore = Math.max(game.bestScore, score); game.bestCombo = Math.max(game.bestCombo, bestCombo);
    const completion = API.completeGame(state, 'countryMap', score); let bonusText = '';
    if (!game.completionRewardClaimed) { game.completionRewardClaimed = true; API.addPoints(state, GAME_CONFIG.completionPoints); API.addXP(state, GAME_CONFIG.completionXP); bonusText = `Erster Abschluss: +${GAME_CONFIG.completionPoints} Reisepunkte · +${GAME_CONFIG.completionXP} XP`; }
    if (correct === 9) unlockAt('countryPro');
    if (mistakes === 0) unlockAt('perfectFlight');
    API.save(state); syncUI();
    $('#finalCorrect').textContent = `${correct} / 9`; $('#finalScore').textContent = format(score); $('#finalCombo').textContent = `x${bestCombo}`; $('#finalStamps').textContent = newStamps;
    const missingStamps = COUNTRIES.length - visitedCount();
    $('#recordText').textContent = missingStamps ? `Noch ${missingStamps} Länder-Stempel sammeln.` : score > oldBest ? 'Alle Stempel gesammelt · neuer Rekord!' : `Alle Stempel gesammelt · Bestwert: ${format(game.bestScore)}`;
    $('#finishBonus').textContent = bonusText; showScreen('reiseEnd'); tone('complete'); confetti(45);
  }

  function arriveAndFinish() {
    $('#reiseCard').classList.add('arriving');
    $('#arrivalBanner').hidden = false;
    $('#reiseNext').hidden = true;
    announce('Ziel erreicht. Alle neun Länder wurden angeflogen.');
    setTimeout(() => { $('#arrivalBanner').hidden = true; finishGame(); }, reducedMotion() ? 120 : 1250);
  }

  function reducedMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function unlockAt(id) { if (API.unlockAchievement(state, id)) { const item = ACHIEVEMENTS[id]; toast('Neue Auszeichnung', `${item[0]} · ${item[1]}`); } }
  function openSuitcase() {
    const reward = GAME_CONFIG.suitcaseRewards[Math.floor(Math.random() * GAME_CONFIG.suitcaseRewards.length)]; activeBonus = reward;
    if (reward.points) API.addPoints(state, reward.points); if (reward.gamePoints) score += reward.gamePoints;
    $('#rewardKicker').textContent = 'BONUS-KOFFER GEFUNDEN'; $('#rewardHeading').textContent = reward.title; $('#rewardImage').innerHTML = '<img src="assets/country-map/suitcase.svg" alt="Geöffneter Bonus-Koffer">'; $('#rewardCopy').textContent = reward.copy; openModal($('#reiseReward'), $('#reiseNext')); syncUI(); tone('complete');
  }
  function showStampReward(country) { $('#rewardKicker').textContent = 'NEUER STEMPEL'; $('#rewardHeading').textContent = `${country.name} besucht!`; $('#rewardImage').innerHTML = stampHTML(country, true); $('#rewardCopy').textContent = `+${GAME_CONFIG.firstVisitXP} Reise-XP für deinen ersten Besuch.`; openModal($('#reiseReward'), $('#reiseNext')); }
  function toast(title, copy) { const el = document.createElement('div'); el.className = 'reise-toast'; el.innerHTML = `<b>${escapeHTML(title)}</b><span>${escapeHTML(copy)}</span>`; $('#reiseToasts').append(el); setTimeout(() => el.remove(), 4300); }
  function celebrateSmall() { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; $('#reiseCard').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.008)' }, { transform: 'scale(1)' }], { duration: 420 }); }
  function confetti(count) { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; const colors = ['#e85b3d','#e9a925','#278f8e','#103b5d']; for (let i=0;i<count;i++) { const bit=document.createElement('i'); bit.style.cssText=`position:fixed;z-index:90;left:${Math.random()*100}vw;top:-20px;width:9px;height:15px;background:${colors[i%4]};animation:confetti-fall ${2+Math.random()*2}s linear forwards`; document.body.append(bit); setTimeout(()=>bit.remove(),4200); } }

  function tone(kind) { if (!(window.ReisenAudio?.isSoundEnabled() ?? soundOn) || (window.ReisenAudio&&!ReisenAudio.sfxAllowed(kind==='complete'?'major':'normal'))) return; try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); const notes = kind === 'wrong' ? [210,165] : kind === 'complete' ? [392,523,659,784] : [523,659,784], volume=(window.ReisenAudio?.getSettings().soundVolume||.7)*.14; notes.forEach((f,i)=>{ const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.09;o.type=kind==='wrong'?'triangle':'sine';o.frequency.value=f;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.17);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.18); }); } catch (_) {} }
  function speak() { if (round[index]) window.ReisenAudio?.speak(round[index].name,{rate:.85}); }
  function updateSoundButtons() { $$('[data-sound]').forEach(btn=>{btn.textContent=soundOn?'🔊':'🔇';btn.setAttribute('aria-label',soundOn?'Ton ausschalten':'Ton einschalten');}); }

  function focusables(root) { return [...root.querySelectorAll('button:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden); }
  function openModal(modal, opener) { modalOpener=opener||document.activeElement;modal.hidden=false;document.body.style.overflow='hidden';focusables(modal)[0]?.focus(); }
  function closeModal(modal) { if (!modal || modal.hidden) return;modal.hidden=true;document.body.style.overflow='';modalOpener?.focus();modalOpener=null; }
  function openPassport(opener) { renderPassport();openModal($('#reisePassport'),opener); }

  function openTutorial(opener) { openModal($('#reiseTutorial'), opener); }
  function beginFlight() {
    if (safeGet('reisenCountryRaceTutorialSeen') !== 'yes') openTutorial($('#reiseStartBtn'));
    else startGame();
  }
  $('#reiseStartBtn').addEventListener('click', beginFlight);
  $('#reiseHowBtn').addEventListener('click', event => openTutorial(event.currentTarget));
  $('#tutorialStart').addEventListener('click', () => {
    safeSet('reisenCountryRaceTutorialSeen', 'yes'); closeModal($('#reiseTutorial'));
    startGame();
  });
  $('#reiseAgain').addEventListener('click', startGame); $('#reiseNext').addEventListener('click', nextQuestion); $('#reiseSpeak').addEventListener('click', speak);
  document.addEventListener('click', event => {
    const passportButton=event.target.closest('[data-passport]');if(passportButton){openPassport(passportButton);return;}
    const soundButton=event.target.closest('[data-sound]');if(soundButton){soundOn=!soundOn;safeSet('reisenSound',soundOn?'on':'off');updateSoundButtons();if(soundOn)tone('correct');return;}
    const close=event.target.closest('[data-close]');if(close){closeModal(close.closest('.reise-overlay'));return;}
    if(event.target.classList.contains('reise-overlay'))closeModal(event.target);
  });
  $('#reiseReset').addEventListener('click',()=>{closeModal($('#reisePassport'));openModal($('#reiseConfirm'),$('#reiseReset'));});
  $('#reiseCancel').addEventListener('click',()=>{closeModal($('#reiseConfirm'));openPassport($('#reiseReset'));});
  $('#reiseConfirmBtn').addEventListener('click',()=>{API.resetPassport(state);closeModal($('#reiseConfirm'));renderPassport();openModal($('#reisePassport'),$('#reiseReset'));});
  document.addEventListener('keydown',event=>{
    const modal=[...$$('.reise-overlay')].reverse().find(el=>!el.hidden);
    if(modal){if(event.key==='Escape'){closeModal(modal);event.preventDefault();return;}if(event.key==='Tab'){const list=focusables(modal),first=list[0],last=list.at(-1);if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}}return;}
    if(!$('#reiseGame').hidden&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','A','d','D'].includes(event.key)){const list=$$('.reise-answer:not(:disabled)'),at=list.indexOf(document.activeElement),step=['ArrowRight','ArrowDown','d','D'].includes(event.key)?1:-1;selectedLane=(at+step+list.length)%list.length;list[selectedLane]?.focus();event.preventDefault();}
    if(!$('#reiseGame').hidden&&event.key>='1'&&event.key<='4')$$('.reise-answer:not(:disabled)')[Number(event.key)-1]?.click();
  });
  updateSoundButtons(); $$('[data-route]').forEach(route=>route.innerHTML=routeHTML(0)); syncUI();
  if (location.hash === '#spielen') beginFlight();
})();
