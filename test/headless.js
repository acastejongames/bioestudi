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

(async () => {
  console.log("== init ==");
  check(G.dueKeys, "API exposta");
  check(!window.document.getElementById("screen-home").hidden, "home visible en iniciar");
  check(window.document.querySelectorAll(".mode-card").length === 6, "6 modes a la portada");
  check(window.document.querySelectorAll("#blockGrid .block").length === 4, "4 blocs de progrés");

  // sessió perfecta
  await runMode("session");
  const S = G.S();
  check(S.xp > 0, `XP guanyada (${S.xp})`);
  check(Object.keys(S.blocks).length >= 3, "blocs actualitzats: " + JSON.stringify(S.blocks));
  check(Object.keys(S.stats).length >= 8, `stats espaiats creats (${Object.keys(S.stats).length} claus)`);
  check(G.dueKeys().length > 0, `hi ha repàs pendent (${G.dueKeys().length})`);

  // mini test oficial perfecte
  await runMode("test");
  check(G.hits() === 10, `mini test perfecte (${G.hits()}/10)`);

  // sessió amb error primer → retry
  await runMode("session", { mistakeFirst: true });
  const missed = G.missed();
  check(missed.length >= 1, `errors registrats (${missed.length})`);
  check(G.dueKeys().length > 0, `repàs pendent després de l'error (${G.dueKeys().length})`);
  G.startMode("retry", [...missed], "retry");
  check(G.inGame(), "mode retry obert");
  check(spin(), "retry completat");
  check(G.missed().length === 0, "retry sense errors (respostes correctes)");

  // altres modes
  await runMode("arcade", { mistakeFirst: true });
  check(G.state().hearts <= 2, "vides penalitzades a l'arcade");

  await runMode("match");
  await runMode("teach");
  await runMode("review");

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
