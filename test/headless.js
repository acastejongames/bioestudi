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
    check(JSON.stringify(A.G.parseRange("", 4)) === "[1,2,3,4]", "rang buit → totes");
    check(JSON.stringify(A.G.parseRange("1-4", 4)) === "[1,2,3,4]", '"1-4" = de l\'1 a la 4 (rang)');
    check(JSON.stringify(A.G.parseRange("1,4", 4)) === "[1,4]", '"1,4" = només la 1 i la 4 (llista)');
    check(JSON.stringify(A.G.parseRange("1-2, 4", 5)) === "[1,2,4]", '"1-2, 4" = rang + llista mixte');
    check(JSON.stringify(A.G.parseRange("4-2", 4)) === "[2,3,4]", "rang invertit es normalitza");
    check(JSON.stringify(A.G.parseRange("9,2", 4)) === "[2]", "número fora de rang s'ignora");
    check(JSON.stringify(A.G.parseRange("hola", 3)) === "[1,2,3]", "res vàlid → totes per defecte");
    A.G.onlineCreate("Anna", "ZZZZZZ", "minerals");
    await fakeUntil(() => A.G.onState().phase === "lobby");
    const code = A.G.onState().code;
    check(code && code.length === 6 && code !== "ZZZZZZ", `codi de sala de 6 caràcters i únic (${code}; el ZZZZZZ ja existia i s'ha reintentat)`);
    check(A.G.onState().host && A.G.onState().players.length === 1, "host dins la lobby amb el seu nom");
    check(A.doc.body.dataset.screen === "online", "body[data-screen]=online");
    check(A.doc.getElementById("onSection") && A.doc.getElementById("onSection").value === "minerals", "tema triat en crear (Sals minerals) es manté a la lobby");
    check(!!A.doc.getElementById("onRowSel") && !!A.doc.getElementById("onColSel") && A.doc.getElementById("onRowSel") !== A.doc.getElementById("onColSel"), "host amb DOS camps separats: files i columnes");

    const F = makeClient("F");
    F.G.onlineJoin("QQQQQQ", "Fred");
    await fakeUntil(() => F.G.onState().phase === "hub" && F.G.onState().msg.includes("No existeix"));
    check(true, "codi inexistent → missatge 'No existeix aquesta sala'");

    const B = makeClient("B"), C = makeClient("C"), D = makeClient("D");
    B.G.onlineJoin(code, "Bernat");
    await fakeUntil(() => B.G.onState().phase === "lobby" && A.G.onState().players.length === 2);
    check(!B.G.onState().host && B.G.onState().code === code, "B entra a la sala amb el codi (guest)");
    check(B.doc.getElementById("onView").textContent.includes("Sals minerals"), "el guest ve el tema de la sala");
    check(!B.doc.getElementById("onRowSel"), "els camps de rang els tria només el host");
    const selA = A.doc.getElementById("onSection");
    selA.value = "organitzacio";
    selA.dispatchEvent(new A.win.Event("change"));
    await fakeUntil(() => B.doc.getElementById("onView").textContent.includes("Nivells d'organització"));
    check(A.G.onState().section === "organitzacio", "el host canvia el tema a la lobby i tots ho reben");
    C.G.onlineJoin(code, "Clara");
    await fakeUntil(() => A.G.onState().players.length === 3);
    D.G.onlineJoin(code, "Dídac");
    await fakeUntil(() => A.G.onState().players.length === 4);
    check(true, "4 jugadors dins la sala (host + 3)");

    const E = makeClient("E");
    E.G.onlineJoin(code, "Edu");
    await fakeUntil(() => E.G.onState().phase === "hub" && /plena/.test(E.G.onState().msg));
    check(A.G.onState().players.length === 4, "5è jugador rebutjat: sala plena (màxim 4)");
    check(E.doc.getElementById("onHubSection"), "select de tema també en crear la sala");

    A.G.onlineStart("organitzacio");
    await fakeUntil(() => A.G.onState().view === "write");
    const st0 = A.G.onState();
    check(st0.local && st0.local.you === "write", "fila 1: el host escriu la taula");
    check(st0.local.row.cols.every((c) => c.real === undefined), "mentre s'escriu NO es reparteix el text real (anti-spoiler)");
    check(!!A.doc.querySelector("#onView table.on-table"), "s'escriu DINS la taula (no un formulari)");
    check(A.doc.querySelectorAll("#onView .on-play .field-row").length === 0, "el formulari simple ja no hi és");
    check(A.doc.querySelectorAll("#onView .on-table tbody tr").length === 1, "la taula només mostra la fila actual (cap completada encara)");
    check(A.doc.querySelectorAll("#onView .on-table input.on-w").length === st0.local.row.cols.length, "els camps d'entrada són cel·les de la taula");
    check(A.doc.querySelectorAll("#onView .on-table thead th").length === 1 + st0.local.row.cols.length, "capçalera de la taula: Element + columnes");
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
    await fakeUntil(() => C.G.onState().local && C.G.onState().local.rowIdx === 1 && D.G.onState().local && D.G.onState().local.rowIdx === 1);
    check(B.doc.querySelectorAll("#onView .on-table tbody tr").length === 2, "fila 2: la taula mostra la fila completada + l'actual");
    check(B.doc.querySelector("#onView .on-table .done-row") && B.doc.getElementById("onView").textContent.includes(real0), "la fila completada es mostra amb el text real i ✅");
    check(B.doc.querySelector("#onView .on-table .done-row").textContent.includes("✅"), "veredicte bo marcat a la taula");
    check(!!C.doc.querySelector("#onView table.on-table") && C.doc.querySelectorAll("#onView .on-table input").length === 0, "l'espectador ve la taula completada sense camps d'edició");
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
    check(!A.doc.getElementById("onRowSel") && A.doc.getElementById("onView").textContent.includes("no es poden triar files ni columnes"), "amb Barreja s'oculta la selecció de files/columnes");
    A.G.leaveOnline();

    // --- rangs aplicats a una partida real (files 2-3 · columnes 1,3) ---
    const H = makeClient("H");
    H.G.onlineCreate("Heura", null, "minerals");
    await fakeUntil(() => H.G.onState().phase === "lobby");
    H.doc.getElementById("onRowSel").value = "2-3";
    H.doc.getElementById("onColSel").value = "1,3";
    H.doc.getElementById("onRowSel").dispatchEvent(new H.win.Event("input"));
    H.doc.getElementById("onColSel").dispatchEvent(new H.win.Event("input"));
    B.G.onlineJoin(H.G.onState().code, "B2");
    await fakeUntil(() => H.G.onState().players.length === 2 && B.G.onState().phase === "lobby");
    H.G.onlineStart("minerals");
    await fakeUntil(() => H.G.onState().view === "write");
    const rr = H.G.onState().rows;
    check(rr.length === 2, `files "2-3" → ${rr.length}/6 files de la taula`);
    check(rr.length > 0 && rr.every((r) => r.row.cols.length === 2), `columnes "1,3" → ${rr.length ? rr[0].row.cols.length : 0} columnes per fila`);
    check(rr.length > 0 && rr[0].row.cols.map((c) => c.label).join("|") === "Funció clau|2 fonts clau", "columnes separades: només la 1 i la 3 (la 2 fora)");
    H.G.openSection("minerals");
    const sheetT = [...H.doc.querySelectorAll("#secSheet tbody tr")].map((tr) => tr.firstElementChild.textContent.trim());
    check(rr[0].row.title === sheetT[1] && rr[1].row.title === sheetT[2], `files 2-3 = "${rr[0].row.title}" i "${rr[1].row.title}", igual que a la taula`);
    H.G.leaveOnline();
    B.G.leaveOnline();

    // --- kick + ban a la lobby ---
    const K = makeClient("K"), P1 = makeClient("P1"), P2 = makeClient("P2");
    K.G.onlineCreate("Keeper", null, "minerals");
    await fakeUntil(() => K.G.onState().phase === "lobby");
    check(K.doc.getElementById("onOrder") && K.doc.getElementById("onOrder").value === "taula", "selector d'ordre a la lobby (per defecte: com a la taula)");
    P1.G.onlineJoin(K.G.onState().code, "Pep");
    await fakeUntil(() => K.G.onState().players.length === 2);
    P2.G.onlineJoin(K.G.onState().code, "Pau");
    await fakeUntil(() => K.G.onState().players.length === 3);
    const kickBtn = K.doc.querySelector(`[data-kick="${K.G.onState().players[1].id}"]`);
    check(!!kickBtn, "host ve el botó ✕ als jugadors a la lobby");
    check(kickBtn.classList.contains("ban") && kickBtn.title.includes("banir"), "creu de la LOBBY = BAN (classe .ban + títol «no podrà tornar»)");
    kickBtn.click();
    await fakeUntil(() => K.G.onState().players.length === 2);
    check(true, "kick a la lobby: passen de 3 a 2 jugadors");
    await fakeUntil(() => P1.G.onState().phase === "hub" && P1.G.onState().msg.includes("expulsat"));
    check(true, "el jugador expulsat rep l'avís i torna a l'inici");
    P1.G.onlineJoin(K.G.onState().code, "Pep");
    await fakeUntil(() => P1.G.onState().phase === "hub" && P1.G.onState().msg.includes("expulsat"));
    check(P1.G.onState().banned === 0 && K.G.onState().players.length === 2, "BAN: el jugador expulsat no pot tornar a unir-se a la mateixa sala");
    check(K.G.onState().banned === 1, "el host manté 1 pid banejat");
    K.G.leaveOnline(); P1.G.leaveOnline(); P2.G.leaveOnline();

    // --- ordre aleatori aplicat a les files ---
    const R2 = makeClient("R2"), S2 = makeClient("S2");
    R2.G.onlineCreate("Ordre", null, "hidro");
    await fakeUntil(() => R2.G.onState().phase === "lobby");
    const ordSel = R2.doc.getElementById("onOrder");
    ordSel.value = "random";
    ordSel.dispatchEvent(new R2.win.Event("change")); // persisteix a l'estat (com el navegador)
    R2.win.Math.random = () => 0; // shuffle determinista (swap amb 0 → rotació)
    S2.G.onlineJoin(R2.G.onState().code, "Sofia");
    await fakeUntil(() => R2.G.onState().players.length === 2 && S2.G.onState().phase === "lobby");
    R2.G.onlineStart("hidro");
    await fakeUntil(() => R2.G.onState().view === "write");
    R2.G.openSection("hidro");
    const ht = [...R2.doc.querySelectorAll("#secSheet tbody tr")].map((tr) => tr.firstElementChild.textContent.trim());
    const rr2 = R2.G.onState().rows;
    check(rr2.length === ht.length, `ordre aleatori: ${rr2.length} files sense filtres`);
    const expectRot = ht.slice(1).concat(ht.slice(0, 1));
    check(rr2.map((r) => r.row.title).join("|") === expectRot.join("|"), `ordre ALEATORI aplicat (B1→B2→… esdevé rotació B2→…→B1): ${rr2.slice(0, 3).map((r) => r.row.title).join(", ")}…`);
    check(R2.G.onState().order === "random", "estat d'ordre = random");
    R2.G.leaveOnline(); S2.G.leaveOnline();

    // --- kick en plena partida: la partida CONTINUA (sense reiniciar) ---
    const M = makeClient("M"), Q1 = makeClient("Q1"), Q2 = makeClient("Q2");
    M.G.onlineCreate("Midia", null, "organitzacio");
    await fakeUntil(() => M.G.onState().phase === "lobby");
    Q1.G.onlineJoin(M.G.onState().code, "Quim");
    await fakeUntil(() => M.G.onState().players.length === 2);
    Q2.G.onlineJoin(M.G.onState().code, "Qüy");
    await fakeUntil(() => M.G.onState().players.length === 3);
    M.G.onlineStart("organitzacio");
    await fakeUntil(() => M.G.onState().view === "write");
    const checkerId = M.G.onState().turn.checkerId;
    const midKick = M.doc.querySelector(`[data-kick="${checkerId}"]`);
    check(!!midKick, "host pot expulsar en plena partida (xips de puntuació)");
    check(!midKick.classList.contains("ban") && midKick.title.includes("sense ban"), "creu EN JOC = KICK (buida i títol «sense ban», diferent de la de lobby)");
    midKick.click();
    await fakeUntil(() => M.G.onState().players.length === 2 && M.G.onState().phase === "play");
    check(true, "kick en joc: la partida CONTINUA (no es reinicia)");
    check(M.G.onState().banned === 0, "kick en joc NO baneja: el host manté 0 pids banejats");
    const restants = M.G.onState().players.map((p) => p.id);
    check(restants.includes(M.G.onState().turn.writerId) && restants.includes(M.G.onState().turn.checkerId), "rols reassignats als jugadors restants");
    await fakeUntil(() => Q1.G.onState().phase === "hub" && Q1.G.onState().msg.includes("expulsat"));
    check(true, "l'expulsat en joc rep l'avís");
    Q1.G.onlineJoin(M.G.onState().code, "Quim");
    await fakeUntil(() => Q1.G.onState().msg.includes("començat"));
    check(!Q1.G.onState().msg.includes("no hi pots tornar"), "sense ban: reintentar-hi és «La partida ja ha començat», mai «no hi pots tornar»");
    M.doc.querySelector("#onView .on-w").value = "Cèl·lula";
    M.doc.getElementById("onPass").click();
    await fakeUntil(() => Q2.G.onState().view === "check");
    check(Q2.doc.getElementById("onView").textContent.includes("CHULETA"), "el revisor restant rep la chuleta i el joc segueix");
    Q2.G.onVerdict(false);
    await fakeUntil(() => M.G.onState().view === "reveal");
    check(true, "fila completada amb els jugadors restants");
    const otherId = M.G.onState().players.find((p) => p.id !== M.G.onState().me).id;
    M.doc.querySelector(`[data-kick="${otherId}"]`).click();
    await fakeUntil(() => M.G.onState().phase === "hub");
    check(M.G.onState().msg.includes("sol"), "kick de l'últim company → sala tancada amb avís (sense restart forçat)");
    M.G.leaveOnline(); Q1.G.leaveOnline(); Q2.G.leaveOnline();

    // --- kick NO és ban: l'expulsat en joc POT TORNAR quan la sala torna a la lobby ---
    const TW = makeClient("TW"), U1 = makeClient("U1"), U2 = makeClient("U2");
    TW.G.onlineCreate("Torna", null, "minerals");
    await fakeUntil(() => TW.G.onState().phase === "lobby");
    const rowInp = TW.doc.getElementById("onRowSel");
    rowInp.value = "1"; // partida d'UNA sola fila → arriba ràpidament a la lobby un altre cop
    rowInp.dispatchEvent(new TW.win.Event("input")); // persisteix a l'estat (com el navegador)
    U1.G.onlineJoin(TW.G.onState().code, "Uld");
    await fakeUntil(() => TW.G.onState().players.length === 2);
    U2.G.onlineJoin(TW.G.onState().code, "Uri");
    await fakeUntil(() => TW.G.onState().players.length === 3);
    TW.G.onlineStart("minerals");
    await fakeUntil(() => TW.G.onState().view === "write");
    const u2id = TW.G.onState().players[2].id;
    TW.doc.querySelector(`[data-kick="${u2id}"]`).click();
    await fakeUntil(() => TW.G.onState().players.length === 2 && TW.G.onState().banned === 0);
    check(true, "kick en joc d'un company: la partida continua i NO queda banejat");
    TW.doc.querySelector("#onView .on-w").value = "Cèl·lula";
    TW.doc.getElementById("onPass").click();
    await fakeUntil(() => U1.G.onState().view === "check");
    U1.G.onVerdict(true);
    await fakeUntil(() => TW.G.onState().view === "reveal");
    TW.doc.getElementById("onNext").click(); // fila única → fi de partida
    await fakeUntil(() => TW.G.onState().phase === "over");
    TW.doc.getElementById("onAgain").click(); // el host torna a la lobby
    await fakeUntil(() => TW.G.onState().phase === "lobby");
    U2.G.onlineJoin(TW.G.onState().code, "Uri");
    await fakeUntil(() => U2.G.onState().phase === "lobby");
    check(TW.G.onState().players.length === 3, "KICK ≠ BAN: l'expulsat en joc TORNA a unir-se un cop la sala és a la lobby");
    TW.G.leaveOnline(); U1.G.leaveOnline(); U2.G.leaveOnline();

    const onlineErrs = [...A.errs, ...B.errs, ...C.errs, ...D.errs, ...E.errs, ...F.errs, ...H.errs,
      ...K.errs, ...P1.errs, ...P2.errs, ...R2.errs, ...S2.errs, ...M.errs, ...Q1.errs, ...Q2.errs,
      ...TW.errs, ...U1.errs, ...U2.errs];
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
