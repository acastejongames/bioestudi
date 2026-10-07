/* Prova headless de BIOESTUDI amb jsdom */
const fs = require("fs");
const path = require("path");
function loadJsdom() {
  const candidates = ["/tmp/harness/node_modules/jsdom", "jsdom"];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* next */ }
  }
  console.error("FALTA jsdom. Executa: npm install --prefix /tmp/harness jsdom");
  process.exit(2);
}
const { JSDOM } = loadJsdom();

const REPO = "/home/user/bioestudi";
const html = fs.readFileSync(path.join(REPO, "index.html"), "utf8");

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const { window } = dom;
window.scrollTo = () => {};
const errors = [];
window.addEventListener("error", (e) => errors.push(String(e.error || e.message)));

window.eval(
  fs.readFileSync(path.join(REPO, "data.js"), "utf8") +
  "\n;\n" +
  fs.readFileSync(path.join(REPO, "game.js"), "utf8")
);

const G = window.G;
if (!G) { console.error("FAIL: window.G no definit"); process.exit(1); }

/* canvas real (stub) per exercitar confeti/fxLoop de veritat */
const fxCanvas = window.document.getElementById("fx");
const ctxStub = {
  clearRect() {}, fillRect() {}, save() {}, restore() {}, translate() {}, rotate() {},
  globalAlpha: 1, fillStyle: "",
};
fxCanvas.getContext = (kind) => (kind === "2d" ? ctxStub : null);

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { pass++; console.log("  ✓ " + msg); }
  else { fail++; console.log("  ✗ " + msg); }
}

/* ---------- Fake PeerJS: simulació de xarxa en memòria per a l'online ---------- */
const fakeRegistry = new Map();
function pairConns(idA, idB) {
  const mk = (selfId, otherId) => ({
    peer: otherId, _cbs: {}, _dead: false, _other: null,
    on(ev, cb) { (this._cbs[ev] = this._cbs[ev] || []).push(cb); },
    _emit(ev, d) {
      (this._cbs[ev] || []).slice().forEach((f) => { try { f(d); } catch (e) { console.error("conn handler:", e); } });
    },
    send(o) {
      const payload = JSON.parse(JSON.stringify(o));
      const oth = this._other;
      setTimeout(() => { if (!this._dead && oth && !oth._dead) oth._emit("data", payload); }, 0);
    },
    close() {
      if (this._dead) return;
      this._dead = true;
      const oth = this._other;
      if (oth && !oth._dead) setTimeout(() => oth._emit("close"), 0);
    },
  });
  const a = mk(idA, idB), b = mk(idB, idA);
  a._other = b; b._other = a;
  return [a, b];
}
function makeFakePeer(idArg) {
  const wantId = typeof idArg === "string" ? idArg : null;
  const peer = {
    id: wantId || "auto-" + Math.random().toString(36).slice(2, 10),
    _cbs: {}, _conns: [], _destroyed: false,
    on(ev, cb) { (this._cbs[ev] = this._cbs[ev] || []).push(cb); },
    _emit(ev, d) {
      (this._cbs[ev] || []).slice().forEach((f) => { try { f(d); } catch (e) { console.error("peer handler:", e); } });
    },
    connect(targetId) {
      const [c1, c2] = pairConns(this.id, targetId);
      this._conns.push(c1);
      const target = fakeRegistry.get(targetId);
      if (!target || target._destroyed) {
        setTimeout(() => this._emit("error", { type: "peer-unavailable" }), 0);
        return c1;
      }
      target._conns.push(c2);
      setTimeout(() => { if (!target._destroyed) target._emit("connection", c2); }, 0);
      setTimeout(() => { c1._emit("open"); c2._emit("open"); }, 0);
      return c1;
    },
    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;
      if (fakeRegistry.get(this.id) === this) fakeRegistry.delete(this.id);
      this._conns.forEach((c) => {
        if (c._dead) return;
        c._dead = true;
        const oth = c._other;
        if (oth && !oth._dead) oth._emit("close");
      });
      this._conns = [];
    },
  };
  if (wantId && fakeRegistry.has(wantId)) {
    setTimeout(() => peer._emit("error", { type: "unavailable-id" }), 0);
  } else {
    fakeRegistry.set(peer.id, peer);
    setTimeout(() => peer._emit("open", peer.id), 0);
  }
  return peer;
}
window.__peerFactory = (id) => makeFakePeer(id);
const fxStub = () => null;
function makeClient(label) {
  const d = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
  const win = d.window;
  win.scrollTo = () => {};
  const errs = [];
  win.addEventListener("error", (e) => errs.push(String(e.error || e.message)));
  win.eval(
    fs.readFileSync(path.join(REPO, "data.js"), "utf8") +
    "\n;\n" +
    fs.readFileSync(path.join(REPO, "game.js"), "utf8")
  );
  const fx = win.document.getElementById("fx");
  fx.getContext = (kind) => (kind === "2d" ? ctxStub : null);
  win.__peerFactory = (id) => makeFakePeer(id);
  const c = { label, win, G: win.G, doc: win.document, errs };
  CLIENTS[label] = c;
  return c;
}
const CLIENTS = {};
function k2c(k) { return CLIENTS[k]; }
function k2v(k) { const c = k2c(k); return c ? c.G.onState().view : null; }
function k2phase(k) { const c = k2c(k); return c ? c.G.onState().phase : null; }
async function fakeUntil(fn, ms = 4000) {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error("timeout esperant condició online");
    await new Promise((r) => setTimeout(r, 8));
  }
}

function spin(maxIter = 5000) {
  let n = 0;
  while (n++ < maxIter) {
    if (G.done()) return true;
    if (!G.inGame()) return G.done();
    const R = G.state();
    if (R.graded) G.advance();
    else G.auto();
  }
  return G.done();
}

async function runMode(mode, { mistakeFirst = false } = {}) {
  console.log(`\n== mode: ${mode} ==`);
  G.startMode(mode);
  check(G.inGame(), `${mode}: pantalla de joc oberta`);
  let wantMistake = mistakeFirst;
  let n = 0;
  while (n++ < 5000) {
    if (G.done()) break;
    if (!G.inGame()) break;
    const R = G.state();
    if (R.graded) { G.advance(); continue; }
    const q = G.cur();
    if (wantMistake && q && (q.tipus === "mc" || q.tipus === "flash")) {
      G.autoMistake();
      if (R.graded) {
        wantMistake = false;
        check(G.starKeys().length >= 1, `${mode}: l'error queda marcat amb ⭐ per repàs`);
        check(G.dueKeys().length >= 1, `${mode}: repàs pendent al moment de l'error`);
      }
      continue;
    }
    G.auto();
  }
  check(G.done(), `${mode}: arriba a la pantalla de resultat (${G.hits()} encerts, ${G.state().total} preguntes, score ${G.score()})`);
  check(G.state().total >= (mode === "test" ? 10 : mode === "match" ? 3 : 1), `${mode}: nombre mínim de preguntes respostes`);
  return G;
}
function checkNoRepeats(mode) {
  const ids = G.state().list.map((q) => q.id);
  check(new Set(ids).size === ids.length, `${mode}: cap pregunta repetida dins la partida (${ids.length} preguntes úniques)`);
}

(async () => {
  console.log("== init ==");
  check(G.dueKeys, "API exposta");
  check(!window.document.getElementById("screen-home").hidden, "home visible en iniciar");
  check(window.document.querySelectorAll(".mode-card").length === 7, "7 modes a la portada");
  check(window.document.querySelector('.mode-card[data-mode="online"]'), "targeta Online · sala amb codi a la portada");
  check(window.document.querySelectorAll("#secGrid .sec-card").length === 5, "5 seccions a la portada");
  check(window.document.body.dataset.screen === "home", "body[data-screen]=home en iniciar");
  check(window.document.querySelector("#screen-game .game-top #gProgress"), "HUD + progress dins del contenidor .game-top (per a sticky al mòbil)");

  // confeti / efectes (detecta símbols no declarats com fxBroken)
  console.log("\n== confeti / efectes ==");
  try {
    G.confetti(25);
    await new Promise((r) => setTimeout(r, 150));
    check(true, "confeti + fxLoop executen sense errors amb canvas real");
  } catch (e) {
    check(false, "confeti/fxLoop amb error: " + e.message);
  }

  // sessió perfecta
  await runMode("session");
  const S = G.S();
  check(S.xp > 0, `XP guanyada (${S.xp})`);
  check(Object.keys(S.blocks).length >= 3, "blocs actualitzats: " + JSON.stringify(S.blocks));
  check(Object.keys(S.stats).length >= 8, `stats espaiats creats (${Object.keys(S.stats).length} claus)`);
  checkNoRepeats("session");
  check(G.dueKeys().length === 0, "sessió perfecta: NO deixa repàs pendent al moment (sense molesta/bucle)");
  check(window.document.getElementById("rStarsNote").hidden, "nota ⭐ oculta quan la sessió ha estat sense errors");

  // mini test oficial perfecte
  await runMode("test");
  check(G.hits() === 10, `mini test perfecte (${G.hits()}/10)`);
  checkNoRepeats("test");

  // sessió amb error primer → retry
  await runMode("session", { mistakeFirst: true });
  const missed = G.missed();
  check(missed.length >= 1, `errors registrats (${missed.length})`);
  check(G.starKeys().length === 0 || G.dueKeys().length > 0, `les preguntes amb ⭐ surten com a repàs pendent (${G.dueKeys().length})`);
  const note = window.document.getElementById("rStarsNote");
  check(note.hidden === !(G.missed().length && G.starKeys().length), "nota ⭐ coherent amb errors i ⭐ pendents");
  G.startMode("retry", [...missed], "retry");
  check(G.inGame(), "mode retry obert");
  check(spin(), "retry completat");
  check(G.missed().length === 0, "retry sense errors (respostes correctes)");

  // altres modes
  await runMode("arcade", { mistakeFirst: true });
  check(G.state().hearts <= 2, "vides penalitzades a l'arcade");
  check(G.state().list.length > 0 && G.state().list.length <= 25, `arcade amb ${G.state().list.length} preguntes úniques (≤25, sense bucle)`);

  await runMode("match");
  await runMode("teach");
  await runMode("review");

  // ====== SECCIONS ======
  console.log("\n== seccions ==");
  const ROWS = { organitzacio: 4, minerals: 6, hidro: 7, lipo: 4, nutrients: 4 };
  for (const sec of G.SECTIONS()) {
    G.openSection(sec.id);
    const scr = window.document.getElementById("screen-section");
    check(!scr.hidden, `secció ${sec.id}: pantalla oberta`);
    check(window.document.body.dataset.screen === "section", `secció ${sec.id}: body[data-screen]=section`);
    const rows = window.document.querySelectorAll("#secSheet tbody tr").length;
    check(rows === ROWS[sec.id], `secció ${sec.id}: taula amb ${rows}/${ROWS[sec.id]} files`);
    const ansCells = [...window.document.querySelectorAll("#secSheet td.ans")];
    check(ansCells.length > 0 && ansCells.every((td) => td.dataset.th), `secció ${sec.id}: cel·les amb data-th per a les targetes del mòbil`);
    check(window.document.getElementById("secSheet").classList.contains("cover"), `secció ${sec.id}: taula coberta per defecte`);
    const btns = [...window.document.querySelectorAll(".btn-sec")].map((b) => b.dataset.mode);
    check(btns.includes("arcade") && btns.includes("session"), `secció ${sec.id}: botons de joc (${btns.join(",")})`);
    // revelar una casella fent clic
    const td = window.document.querySelector("#secSheet td.ans");
    td.click();
    check(td.classList.contains("rev"), `secció ${sec.id}: clic revela la casella`);
    // tornar a l'inici
    window.document.getElementById("secBack").click();
    check(!window.document.getElementById("screen-home").hidden, `secció ${sec.id}: torna a l'inici`);
  }

  // partides filtrades per secció
  for (const secId of ["minerals", "lipo", "hidro", "nutrients", "organitzacio"]) {
    G.startMode("arcade", null, null, secId);
    const seen = new Set();
    let n = 0;
    while (n++ < 5000) {
      if (G.done()) break;
      const q = G.cur();
      if (q) (q.items || []).forEach((k) => seen.add(G.sectionOfKey(k)));
      if (G.state().graded) G.advance(); else G.auto();
    }
    check(G.done(), `arcade ${secId}: completada`);
    check(seen.size === 1 && seen.has(secId), `arcade ${secId}: només preguntes d'aquesta secció (${[...seen].join(",")})`);
    checkNoRepeats(`arcade ${secId}`);
  }

  // flashcards filtrades (lipo) i parells (hidro)
  G.startMode("teach", null, null, "lipo");
  const lipoKeys = new Set();
  let n2 = 0;
  while (n2++ < 500) {
    if (G.done()) break;
    const q = G.cur();
    if (q) (q.items || []).forEach((k) => lipoKeys.add(G.sectionOfKey(k)));
    if (G.state().graded) G.advance(); else G.auto();
  }
  check(G.done() && lipoKeys.size === 1 && lipoKeys.has("lipo"), `flashcards lipo: filtrades (${[...lipoKeys].join(",")})`);
  checkNoRepeats("teach lipo");

  G.startMode("match", null, null, "hidro");
  let n3 = 0;
  while (n3++ < 500) {
    if (G.done()) break;
    if (G.state().graded) G.advance(); else G.auto();
  }
  check(G.done() && G.hits() === 3, `parells hidro: 3 rondes completades (${G.hits()}/3)`);
  checkNoRepeats("match hidro");

  // orgmix
  G.startMode("orgmix", null, null, "organitzacio");
  let n4 = 0;
  while (n4++ < 500) {
    if (G.done()) break;
    if (G.state().graded) G.advance(); else G.auto();
  }
  check(G.done() && G.hits() === 7, `ordre & conceptes: 7 reptes (${G.hits()}/7)`);
  checkNoRepeats("orgmix");

  // sortir d'una partida de secció torna a la secció
  G.startMode("arcade", null, null, "minerals");
  check(window.document.body.dataset.screen === "game", "body[data-screen]=game durant la partida (amaga la barra superior al mòbil)");
  window.document.getElementById("quitBtn").click();
  check(!window.document.getElementById("screen-section").hidden, "sortir d'una partida de secció torna a la secció");
  check(window.document.getElementById("secView").textContent.includes("Sals minerals"), "la secció de tornada és Sals minerals");

  // interaccions reals via esdeveniments (no només auto)
  console.log("\n== interacció amb events ==");
  G.startMode("session");
  let q = G.cur();
  n_loop: while (true) {
    q = G.cur();
    if (G.done() || !G.inGame()) break;
    if (G.state().graded) { G.advance(); continue; }
    if (q.tipus === "mc") {
      const opts = window.document.querySelectorAll("#qBody .opt");
      check(opts.length === 4, "4 opcions renderitzades");
      opts[q.correct].click();
    } else if (q.tipus === "flash") {
      const btn = window.document.querySelector("#qActions .btn");
      btn.click();
      const btns = window.document.querySelectorAll("#qActions .btn");
      btns[0].click(); // "Ho sabia"
    } else if (q.tipus === "order") {
      G.checkOrder === null;
      const chips = [...window.document.querySelectorAll("#orderPool .chip")];
      for (const s of q.seq) {
        const c = chips.find((c) => c.textContent === s && !c.classList.contains("used"));
        if (c) c.click();
      }
      const btn = window.document.querySelector("#qActions .btn");
      btn.click();
    } else if (q.tipus === "match") {
      G.auto();
    } else if (q.tipus === "fields") {
      const rows = window.document.querySelectorAll(".field-row");
      rows.forEach((row, i) => { row.querySelector("input").value = q.fills[i]; });
      window.document.querySelector("#qActions .btn").click();
    }
    // esperar avanç automàtic o forçar
    const t0 = Date.now();
    while (G.state().graded && G.inGame() && Date.now() - t0 < 4000) { /* espera auto-advance */ }
    if (G.state().graded && G.inGame()) G.advance();
  }
  check(G.done(), "sessió interactiva completada clicant a la UI");
  check(G.missed().length === 0, "sessió interactiva sense errors");

  // ====== navegació des del resultat (rAgain / rHome) ======
  console.log("\n== navegació result ==");
  G.startMode("orgmix", null, null, "organitzacio");
  check(spin(), "orgmix per provar navegació completada");
  window.document.getElementById("rAgain").click();
  check(G.inGame() && G.section() === "organitzacio", "🔄 rAgain repeteix la partida de la mateixa secció");
  G.startMode("orgmix", null, null, "organitzacio");
  check(spin(), "segona orgmix completada");
  window.document.getElementById("rHome").click();
  check(!window.document.getElementById("screen-home").hidden, "🏠 rHome torna a l'inici");

  // ====== ONLINE — sala amb codi, fins a 4 jugadors ======
  console.log("\n== online: sala amb codi, 2–4 jugadors ==");
  try {
    fakeRegistry.set("bioestudi-ZZZZZZ", { placeholder: true });
    const A = makeClient("A");
    A.G.onlineCreate("Anna", "ZZZZZZ");
    await fakeUntil(() => A.G.onState().phase === "lobby");
    const code = A.G.onState().code;
    check(code && code.length === 6 && code !== "ZZZZZZ", `codi de sala de 6 caràcters i únic (${code}; el ZZZZZZ ja existia i s'ha reintentat)`);
    check(A.G.onState().host && A.G.onState().players.length === 1, "host dins la lobby amb el seu nom");
    check(A.doc.body.dataset.screen === "online", "body[data-screen]=online");

    const F = makeClient("F");
    F.G.onlineJoin("QQQQQQ", "Fred");
    await fakeUntil(() => F.G.onState().phase === "hub" && F.G.onState().msg.includes("No existeix"));
    check(true, "codi inexistent → missatge 'No existeix aquesta sala'");

    const B = makeClient("B"), C = makeClient("C"), D = makeClient("D");
    B.G.onlineJoin(code, "Bernat");
    await fakeUntil(() => B.G.onState().phase === "lobby" && A.G.onState().players.length === 2);
    check(!B.G.onState().host && B.G.onState().code === code, "B entra a la sala amb el codi (guest)");
    C.G.onlineJoin(code, "Clara");
    await fakeUntil(() => A.G.onState().players.length === 3);
    D.G.onlineJoin(code, "Dídac");
    await fakeUntil(() => A.G.onState().players.length === 4);
    check(true, "4 jugadors dins la sala (host + 3)");

    const E = makeClient("E");
    E.G.onlineJoin(code, "Edu");
    await fakeUntil(() => E.G.onState().phase === "hub" && /plena/.test(E.G.onState().msg));
    check(A.G.onState().players.length === 4, "5è jugador rebutjat: sala plena (màxim 4)");

    A.G.onlineStart("organitzacio");
    await fakeUntil(() => A.G.onState().view === "write");
    const st0 = A.G.onState();
    check(st0.local && st0.local.you === "write", "fila 1: el host escriu la taula");
    check(st0.local.row.cols.every((c) => c.real === undefined), "mentre s'escriu NO es reparteix el text real (anti-spoiler)");
    await fakeUntil(() => B.G.onState().view === "wait" && C.G.onState().view === "wait" && D.G.onState().view === "wait");
    check(true, "els altres 3 esperen qui escriu");

    const real0 = st0.rows[0].row.cols[0].real;
    A.doc.querySelector("#onView .on-w").value = real0;
    A.doc.getElementById("onPass").click();
    await fakeUntil(() => B.G.onState().view === "check");
    check(B.doc.getElementById("onView").textContent.includes("CHULETA"), "B (revisor) rep la chuleta al costat");
    check(B.doc.getElementById("onView").textContent.includes(real0), "chuleta amb el text real");
    check(!C.doc.getElementById("onView").textContent.includes(real0), "C (espectador) NO rep el text real (sense spoilers)");
    check(!D.doc.getElementById("onView").textContent.includes(real0), "D tampoc no rep el text real");

    B.doc.getElementById("onGood").click();
    await fakeUntil(() => ["A", "B", "C", "D"].every((k) => k2v(k) === "reveal"));
    const rvA = A.doc.getElementById("onView").textContent;
    check(rvA.includes("Text real"), "veredicte bo: el text real es revela a tothom");
    check(rvA.includes(real0), "revelació amb el text real complet");
    check(A.G.onState().scores[A.G.onState().me] === 100, "escriptor correcte +100");
    check(A.G.onState().scores[B.G.onState().me] === 60, "revisor coherent amb l'estimació +60");
    check(rvA.includes("Següent fila") || rvA.includes("resultats"), "el host avança d'fila");
    check(!B.doc.getElementById("onView").textContent.includes("Següent fila"), "els guests esperen que el host passi d'fila");

    // fila 2: escriu B, revisa C — fallada donada per bona fallida
    A.G.onHostNext();
    await fakeUntil(() => B.G.onState().view === "write");
    B.doc.querySelector("#onView .on-w").value = "resposta incorrecta";
    B.doc.getElementById("onPass").click();
    await fakeUntil(() => C.G.onState().view === "check");
    check(C.doc.getElementById("onView").textContent.includes("CHULETA"), "C rep la chuleta a la seva fila de revisió");
    C.doc.getElementById("onBad").click();
    await fakeUntil(() => A.G.onState().view === "reveal" && A.G.onState().local.good === false);
    check(A.G.onState().local.autoGood === false, "fallada real: l'estimació automàtica també diu fallada");
    check(A.G.onState().scores[C.G.onState().me] === 60, "revisor que encerta el veredicte +60");
    check(A.G.onState().scores[B.G.onState().me] === 60, "escriptor rebutjat es queda amb 60");

    // files 3 i 4: mateix flux via API
    A.G.onHostNext();
    await fakeUntil(() => C.G.onState().view === "write");
    C.G.onPass(["x"]);
    await fakeUntil(() => D.G.onState().view === "check");
    D.G.onVerdict(false);
    await fakeUntil(() => A.G.onState().view === "reveal");
    A.G.onHostNext();
    await fakeUntil(() => D.G.onState().view === "write");
    D.G.onPass(["x"]);
    await fakeUntil(() => A.G.onState().view === "check");
    A.G.onVerdict(false);
    await fakeUntil(() => A.G.onState().view === "reveal");
    check(A.G.onState().local.writerId === D.G.onState().me, "rotació de rols: a la fila 4 escriu D i revisa el host");

    const xpBefore = A.G.S().xp;
    const xpB = B.G.S().xp;
    A.G.onHostNext();
    await fakeUntil(() => ["A", "B", "C", "D"].every((k) => k2phase(k) === "over"));
    check(true, "fi de partida per a tots els jugadors");
    const fin = A.G.onState();
    check(fin.scores[fin.me] === 160, `puntuació final del host 160 (${JSON.stringify(fin.scores)})`);
    check(A.doc.getElementById("onView").textContent.includes("Guanya"), "podi amb el guanyador");
    check(A.G.S().xp >= xpBefore + 16, `XP del host en línia (+${A.G.S().xp - xpBefore} = punts/10)`);
    check(B.G.S().xp === xpB + 6, `XP del guest B (+${B.G.S().xp - xpB})`);

    A.G.leaveOnline();
    await fakeUntil(() => ["B", "C", "D"].every((k) => k2phase(k) === "hub"));
    check(B.G.onState().msg.length > 0 && C.G.onState().msg.length > 0, "host surt → la sala es tanca per a la resta");

    // codis no repetits entre sales de la mateixa sessió
    A.G.onlineCreate("Anna");
    await fakeUntil(() => A.G.onState().phase === "lobby");
    check(A.G.onState().code !== code, `nou codi diferent del precedent (${code} → ${A.G.onState().code})`);
    A.G.leaveOnline();

    const onlineErrs = [...A.errs, ...B.errs, ...C.errs, ...D.errs, ...E.errs, ...F.errs];
    check(onlineErrs.length === 0, "sense errors JS als clients online" + (onlineErrs.length ? ": " + onlineErrs.join(" | ") : ""));
  } catch (e) {
    const diag = {};
    ["A", "B", "C", "D"].forEach((k) => {
      const c = CLIENTS[k];
      if (c) { const st = c.G.onState(); diag[k] = { phase: st.phase, view: st.view, turn: st.turn, errs: c.errs.slice(0, 3) }; }
    });
    check(false, "excepció al bloc online: " + (e.stack || e.message) + " || diag=" + JSON.stringify(diag));
  }

  // neteja errors de window
  check(errors.length === 0, "sense errors JS a window" + (errors.length ? ": " + errors.join(" | ") : ""));

  console.log(`\nRESULT: ${pass} ok, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("EXCEPCIÓ:", e); process.exit(1); });
