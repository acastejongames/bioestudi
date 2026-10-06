/* Prova headless de BIOESTUDI amb jsdom */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("/tmp/harness/node_modules/jsdom");

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

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { pass++; console.log("  ✓ " + msg); }
  else { fail++; console.log("  ✗ " + msg); }
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
  check(window.document.querySelectorAll(".mode-card").length === 6, "6 modes a la portada");
  check(window.document.querySelectorAll("#secGrid .sec-card").length === 5, "5 seccions a la portada");

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
  check(G.dueKeys().length > 0, `repàs pendent després de l'error (${G.dueKeys().length})`);
  check(!window.document.getElementById("rStarsNote").hidden, "nota ⭐ visible quan hi ha errors");
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
    const rows = window.document.querySelectorAll("#secSheet tbody tr").length;
    check(rows === ROWS[sec.id], `secció ${sec.id}: taula amb ${rows}/${ROWS[sec.id]} files`);
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

  // neteja errors de window
  check(errors.length === 0, "sense errors JS a window" + (errors.length ? ": " + errors.join(" | ") : ""));

  console.log(`\nRESULT: ${pass} ok, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("EXCEPCIÓ:", e); process.exit(1); });
