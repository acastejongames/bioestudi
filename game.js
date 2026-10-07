/* BIOESTUDI — motor del joc */
"use strict";

/* ============ helpers ============ */
const $ = (id) => document.getElementById(id);
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const DAY = 86400000;
const esc = (s) => (s || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ============ estat ============ */
const KEY = "bioestudi_v1";
let S = { xp: 0, sound: true, stats: {}, blocks: {}, day: null, streak: 0, played: 0 };
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function touchDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (S.day === today) return;
  const y = new Date(Date.now() - DAY).toISOString().slice(0, 10);
  S.streak = S.day === y ? (S.streak || 0) + 1 : 1;
  S.day = today;
}
function sched(key, ok) {
  const st = S.stats[key] || { stage: 0, due: 0, star: false, seen: 0 };
  st.seen++;
  if (ok) {
    /* repàs del mateix dia, però NO de seguida: evita que la mateixa pregunta torni a aparèixer sempre al moment */
    st.due = Date.now() + [0.25, 1, 3, 7][Math.min(st.stage, 3)] * DAY;
    st.stage = Math.min(st.stage + 1, 4);
    st.star = false;
  } else {
    st.stage = 0; st.due = Date.now(); st.star = true;
  }
  S.stats[key] = st;
}
function dueKeys() {
  const now = Date.now();
  return Object.keys(S.stats).filter((k) => S.stats[k].seen > 0 && (S.stats[k].star || S.stats[k].due <= now));
}
function starKeys() { return Object.keys(S.stats).filter((k) => S.stats[k].star); }

/* ============ so ============ */
let AC = null;
function sfx(kind) {
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    const seq = {
      ok: [[523, 0], [659, 0.08], [784, 0.16]],
      combo: [[659, 0], [880, 0.07], [1175, 0.15]],
      bad: [[230, 0], [160, 0.13]],
      win: [[523, 0], [659, 0.1], [784, 0.2], [1046, 0.34]],
      click: [[720, 0]],
    }[kind] || [[600, 0]];
    seq.forEach(([f, t]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === "bad" ? "sawtooth" : "triangle";
      o.frequency.value = f;
      const t0 = AC.currentTime + t;
      g.gain.setValueAtTime(0.05, t0);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.26);
      o.connect(g); g.connect(AC.destination);
      o.start(t0); o.stop(t0 + 0.3);
    });
  } catch (e) {}
}

/* ============ confeti ============ */
let parts = [], fxRaf = null, fxBroken = false;
function confetti(n = 90) {
  if (fxBroken) return;
  const c = $("fx"); if (!c || !c.getContext) return;
  try { if (!c.getContext("2d")) { fxBroken = true; return; } } catch (e) { fxBroken = true; return; }
  for (let i = 0; i < n; i++) parts.push({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.3,
    vx: (Math.random() - 0.5) * 3.4, vy: 2 + Math.random() * 4,
    s: 5 + Math.random() * 7, r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: ["#8ec98a", "#e6b95c", "#7fb6c9", "#ec8080", "#d99a76"][rnd(5)],
    life: 1,
  });
  if (!fxRaf) fxLoop();
}
function fxLoop() {
  const c = $("fx"); if (!c || fxBroken) { fxRaf = null; return; }
  let x;
  try { x = c.getContext("2d"); } catch (e) { fxRaf = null; return; }
  if (!x) { fxBroken = true; fxRaf = null; return; }
  x.clearRect(0, 0, c.width, c.height);
  parts = parts.filter((p) => p.life > 0);
  parts.forEach((p) => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.r += p.vr; p.life -= 0.006;
    x.save(); x.translate(p.x, p.y); x.rotate(p.r);
    x.globalAlpha = Math.max(0, p.life);
    x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
    x.restore();
  });
  if (parts.length) fxRaf = requestAnimationFrame(fxLoop);
  else { fxRaf = null; x.clearRect(0, 0, c.width, c.height); }
}

/* ============ pools ============ */
const POOLS = [
  {
    kind: "mineral", block: "minerals", label: "Minerals",
    items: BIO.minerals.map((r) => ({ key: "mineral:" + r.id, ref: r, nom: r.nom })),
  },
  {
    kind: "vit", block: "vitamines", label: "Vitamines",
    items: [...BIO.hidro, ...BIO.lipo].map((r) => ({ key: "vit:" + r.id, ref: r, nom: r.nom })),
  },
  {
    kind: "nutrient", block: "nutrients", label: "Nutrients",
    items: BIO.nutrients.map((r) => ({ key: "nutrient:" + r.id, ref: r, nom: r.nom })),
  },
];
const ORG_SEQ = { key: "org:nivells", block: "organitzacio" };
const ORG_EMER = { key: "org:emergent", block: "organitzacio" };

const MATCH_POOLS = [
  { id: "min-func", block: "minerals", title: "Uneix cada mineral amb la seva funció clau", src: () => BIO.minerals, left: (i) => i.nom, right: (i) => i.funcio, key: (i) => "mineral:" + i.id },
  { id: "min-font", block: "minerals", title: "Uneix cada mineral amb les seves 2 fonts clau", src: () => BIO.minerals, left: (i) => i.nom, right: (i) => i.fonts.join(" + "), key: (i) => "mineral:" + i.id },
  { id: "vit-def", block: "vitamines", title: "Uneix cada vitamina amb la seva manca", src: () => [...BIO.hidro, ...BIO.lipo], left: (i) => i.nom, right: (i) => i.def, key: (i) => "vit:" + i.id },
  { id: "vit-func", block: "vitamines", title: "Uneix cada vitamina amb la seva funció clau", src: () => [...BIO.hidro, ...BIO.lipo], left: (i) => i.nom, right: (i) => i.funcio, key: (i) => "vit:" + i.id },
  { id: "nut-unit", block: "nutrients", title: "Uneix cada nutrient amb les seves unitats bàsiques", src: () => BIO.nutrients, left: (i) => i.nom, right: (i) => i.unitats, key: (i) => "nutrient:" + i.id },
  { id: "nut-func", block: "nutrients", title: "Uneix cada nutrient amb la seva funció", src: () => BIO.nutrients, left: (i) => i.nom, right: (i) => i.funcio, key: (i) => "nutrient:" + i.id },
];

/* ============ generadors ============ */
function distract(correct, n, pool) {
  const seen = new Set([norm(correct)]);
  const out = [];
  for (const v of shuffle(pool)) {
    const k = norm(v);
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(v);
    if (out.length >= n) break;
  }
  return out;
}
/* evita preguntes repetides dins d'una mateixa partida */
function dedupeById(list) {
  const seen = new Set(), out = [];
  for (const q of list) {
    if (q.id && seen.has(q.id)) continue;
    if (q.id) seen.add(q.id);
    out.push(q);
  }
  return out;
}
/* genera preguntes úniques fins a max (o fins a esgotar variants) */
function uniqueGen(gen, max, tries) {
  const seen = new Set(), out = [];
  tries = tries || 400;
  for (let i = 0; i < tries && out.length < max; i++) {
    const q = gen();
    if (seen.has(q.id)) continue;
    seen.add(q.id); out.push(q);
  }
  return out;
}
function finishMc(o, block, items, info, id) {
  const all = shuffle([o.correct, ...o.distractors]);
  return { tipus: "mc", block, prompt: o.prompt, options: all, correct: all.indexOf(o.correct), info: info || "", items, id: id || "mc:" + rnd(1e9) };
}
function kindsFor(pool, it) {
  if (pool.kind === "nutrient") return ["funcio", "units", "reverse"];
  if (pool.kind === "mineral") return ["funcio", "def", "fonts", "reverse", "reverseDef"];
  const isB5 = it.ref.id === "b5";
  return isB5 ? ["funcio", "fonts", "reverse"] : ["funcio", "def", "fonts", "reverse", "reverseDef"];
}
function mkMcFor(pool, it, kind) {
  kind = kind || pick(kindsFor(pool, it));
  const r = it.ref;
  const others = pool.items.map((x) => x.ref);
  const cat = pool.kind === "mineral" ? "mineral" : pool.kind === "vit" ? "vitamina" : "nutrient";
  let prompt, correct, vals, info = "";
  if (pool.kind === "nutrient") {
    if (kind === "funcio") {
      prompt = `Quina és la funció dels «${r.nom}»?`;
      correct = r.funcio; vals = others.map((x) => x.funcio);
    } else if (kind === "units") {
      prompt = `Quines unitats bàsiques formen ${r.nom}?`;
      correct = r.unitats; vals = others.map((x) => x.unitats);
      info = r.resumUnitats;
    } else {
      prompt = `Quin nutrient es forma així: «${r.resumUnitats}»?`;
      correct = r.nom; vals = others.map((x) => x.nom);
      info = `${r.funcio}`;
    }
  } else if (kind === "funcio") {
    prompt = `Quina és la funció clau de ${r.nom}?`;
    correct = r.funcio; vals = others.map((x) => x.funcio);
    info = `Fonts: ${r.fonts.join(" · ")}`;
  } else if (kind === "def") {
    prompt = `Quin problema pot causar la manca de ${r.nom}?`;
    correct = r.def; vals = others.map((x) => x.def);
  } else if (kind === "fonts") {
    prompt = `Quines són les 2 fonts clau de ${r.nom}?`;
    correct = `${r.fonts[0]} · ${r.fonts[1]}`;
    vals = others.map((x) => `${x.fonts[0]} · ${x.fonts[1]}`);
    info = `Funció: ${r.funcio}`;
  } else if (kind === "reverseDef") {
    prompt = `Quin/a ${cat} causa aquesta manca: «${r.def}»?`;
    correct = r.nom; vals = others.map((x) => x.nom);
    info = `Funció: ${r.funcio}`;
  } else {
    prompt = `Quin/a ${cat} correspon a aquesta funció clau: «${r.funcio}»?`;
    correct = r.nom; vals = others.map((x) => x.nom);
    info = `Manca: ${r.def}`;
  }
  return finishMc({ prompt, correct, distractors: distract(correct, 3, vals) }, pool.block, [it.key], info, `mc:${pool.kind}:${it.key}:${kind}`);
}
function mkMcOrg() {
  const kind = pick(["next", "seq", "emergent", "grup"]);
  const n = BIO.nivells;
  if (kind === "seq") {
    const chains = [
      { c: "Àtom → molècula → orgànul", w: ["Molècula → àtom → orgànul", "Àtom → orgànul → molècula", "Orgànul → molècula → àtom"], info: "Després: cèl·lula → teixit → òrgan → aparell → organisme." },
      { c: "Cèl·lula → teixit → òrgan", w: ["Teixit → cèl·lula → òrgan", "Cèl·lula → òrgan → teixit", "Òrgan → teixit → cèl·lula"], info: "Després: aparell → organisme. Abans: orgànul → cèl·lula." },
      { c: "Població → ecosistema → bioma", w: ["Ecosistema → població → bioma", "Població → bioma → ecosistema", "Bioma → ecosistema → població"], info: "Abans: organisme → població." },
    ];
    const ch = pick(chains);
    return finishMc({
      prompt: "Quina seqüència de nivells és correcta?",
      correct: ch.c, distractors: ch.w,
    }, "organitzacio", [ORG_SEQ.key], ch.info, "mc:org:seq:" + norm(ch.c).replace(/ /g, "-"));
  }
  if (kind === "grup") {
    const groups = [
      { nom: "Peces químiques", members: ["Àtom", "Molècula", "Orgànul"] },
      { nom: "Cos viu: de la unitat a l'individu", members: ["Cèl·lula", "Teixit", "Òrgan", "Aparell", "Organisme"] },
      { nom: "Escala ecològica", members: ["Població", "Ecosistema", "Bioma"] },
    ];
    const g = pick(groups), m = pick(g.members);
    const others = groups.filter((x) => x !== g).map((x) => x.nom);
    return finishMc({
      prompt: `A quin grup de nivells pertany «${m}»?`,
      correct: g.nom,
      distractors: [...others, "Cap: no és un nivell del temari"],
    }, "organitzacio", [ORG_SEQ.key],
      "Guia: peces químiques (àtom → molècula → orgànul) · cos viu (cèl·lula → teixit → òrgan → aparell → organisme) · escala ecològica (població → ecosistema → bioma).",
      "mc:org:grup:" + m);
  }
  if (kind === "emergent") {
    return finishMc({
      prompt: "Què és una propietat emergent?",
      correct: "Característica nova que apareix quan les parts s'organitzen i interactuen; no es troba a les parts aïllades.",
      distractors: [
        "És la suma simple de totes les propietats de cada part per separat.",
        "Una funció que només tenen els organismes més grans, com els aparells.",
        "El nivell d'organització més alt: l'ecosistema sencer.",
      ],
    }, "organitzacio", [ORG_EMER.key], BIO.propietatEmergent, "mc:org:emergent");
  }
  let i = rnd(n.length - 1);
  const forward = rnd(2) === 0;
  const correct = forward ? n[i + 1] : n[i];
  const subject = forward ? n[i] : n[i + 1];
  const word = forward ? "DESPRÉS" : "ABANS";
  return finishMc({
    prompt: `Quin nivell d'organització ve ${word} de «${subject}»?`,
    correct,
    distractors: distract(correct, 3, n),
  }, "organitzacio", [ORG_SEQ.key], "Seqüència: " + n.join(" → "), `mc:org:q:${subject}:${forward ? "f" : "b"}`);
}
function mkMcAny(kind) {
  if (kind === "organitzacio") return mkMcOrg();
  const pool = pick(POOLS.filter((p) => p.block === kind));
  return mkMcFor(pool, pick(pool.items));
}
function mkFlash(pool, it) {
  pool = pool || pick(POOLS);
  it = it || pick(pool.items);
  return {
    tipus: "flash", block: pool.block, prompt: it.nom, item: it.ref, kindLabel: "Recuperació activa · digues-ho en veu alta",
    items: [it.key], info: pool.kind === "nutrient" ? it.ref.resumUnitats : it.ref.funcio, id: "flash:" + it.key,
  };
}
function mkOrder() {
  return {
    tipus: "order", block: "organitzacio",
    prompt: "Ordena-los de més petit a més gran (fes clic en ordre)",
    seq: BIO.nivells, items: [ORG_SEQ.key], info: "Seqüència: " + BIO.nivells.join(" → "), id: "org:order",
  };
}
function mkMatch(pool, n, filterFn) {
  pool = pool || pick(MATCH_POOLS);
  n = n || 4;
  let srcAll = pool.src();
  if (pool.filter) srcAll = srcAll.filter(pool.filter);
  if (filterFn) srcAll = srcAll.filter(filterFn);
  const src = shuffle(srcAll).slice(0, Math.min(n, srcAll.length));
  const pairs = src.map((i) => ({ l: pool.left(i), r: pool.right(i) }));
  return {
    tipus: "match", block: pool.block, prompt: pool.title, pairs,
    items: src.map(pool.key),
    info: pairs.map((p) => `${p.l} → ${p.r}`).join("  ·  "),
    id: "match:" + pool.id + ":" + rnd(1e6),
  };
}
function mkFields(d) {
  return {
    tipus: "fields", block: d.block, prompt: d.prompt, fields: d.fields, fills: d.fills || [],
    info: d.info, items: d.items || [], id: "fields:" + d.id,
  };
}
const TEST_FIELDS_IDS = ["t3", "t5", "t7", "t9"];
function mkMiniFields() { const id = pick(TEST_FIELDS_IDS); return mkFields(TEST.find((t) => t.id === id)); }
function fromTest(d) {
  if (d.tipus === "mc") {
    const opts = shuffle(d.options);
    return { tipus: "mc", block: d.block, prompt: d.prompt, options: opts, correct: opts.indexOf(d.correct), info: d.info, items: d.items || [], id: d.id, kindLabel: "Mini test oficial" };
  }
  if (d.tipus === "order") return { ...mkOrder(), id: d.id, info: d.info, kindLabel: "Mini test oficial" };
  if (d.tipus === "match") {
    return { tipus: "match", block: d.block, prompt: d.prompt, pairs: d.pairs.map(([l, r]) => ({ l, r })), items: d.items || [], info: d.info, id: d.id, kindLabel: "Mini test oficial" };
  }
  return { ...mkFields(d), kindLabel: "Mini test oficial" };
}

/* catàleg per repàs espaiat */
const CATALOG = {};
POOLS.forEach((p) => p.items.forEach((it) => {
  CATALOG[it.key] = { block: p.block, mk: () => mkMcFor(p, it) };
}));
CATALOG[ORG_SEQ.key] = { block: "organitzacio", mk: () => (rnd(2) ? mkMcOrg() : mkOrder()) };
CATALOG[ORG_EMER.key] = { block: "organitzacio", mk: () => mkMcOrg() };

/* ============ SECCIONS DEL TEMARI ============ */
const SECTIONS = [
  {
    id: "organitzacio", ico: "🧬", title: "Nivells d'organització",
    sub: "De l'àtom al bioma · propietats emergents",
    truc: "Peces químiques → cos viu → escala ecològica: agrupa'ls en 3 cadenes i encadenaràs tots els nivells.",
  },
  {
    id: "minerals", ico: "🧂", title: "Sals minerals",
    sub: "Calci · magnesi · potassi · sodi · fòsfor · ferro",
    truc: BIO.trucs.minerals,
    conf: [BIO.confusions[0], BIO.confusions[1]],
  },
  {
    id: "hidro", ico: "💊", title: "Vitamines hidrosolubles",
    sub: "B1 · B2 · B5 · B6 · B9 · B12 · C",
    truc: BIO.trucs.hidro,
    conf: ["B9 i B12 connecten amb ADN i eritròcits: no les confonguis en les mancances (megaloblàstica vs neurològica)."],
  },
  {
    id: "lipo", ico: "☀️", title: "Vitamines liposolubles",
    sub: "KEDA · K · E · D · A",
    truc: BIO.trucs.lipo,
    conf: [BIO.confusions[2], BIO.confusions[0]],
  },
  {
    id: "nutrients", ico: "🌾", title: "Nutrients orgànics",
    sub: "Glúcids · proteïnes · greixos · àcids nucleics",
    truc: BIO.resumNutrients,
  },
];
function secDef(id) { return SECTIONS.find((s) => s.id === id) || null; }
function sectionItemKeys(id) {
  if (id === "minerals") return BIO.minerals.map((m) => "mineral:" + m.id);
  if (id === "hidro") return BIO.hidro.map((h) => "vit:" + h.id);
  if (id === "lipo") return BIO.lipo.map((v) => "vit:" + v.id);
  if (id === "nutrients") return BIO.nutrients.map((n) => "nutrient:" + n.id);
  if (id === "organitzacio") return ["org:nivells", "org:emergent"];
  return [];
}
function sectionOfKey(k) {
  if (k.startsWith("mineral:")) return "minerals";
  if (k.startsWith("nutrient:")) return "nutrients";
  if (k.startsWith("org:")) return "organitzacio";
  if (k.startsWith("vit:")) {
    const id = k.slice(4);
    return BIO.hidro.some((h) => h.id === id) ? "hidro" : "lipo";
  }
  return null;
}
function sectionPct(id) {
  const keys = sectionItemKeys(id);
  if (!keys.length) return 0;
  const tot = keys.reduce((a, k) => {
    const st = S.stats[k];
    return a + (st ? Math.min(st.stage, 4) / 4 : 0);
  }, 0);
  return Math.round((100 * tot) / keys.length);
}
function sectionMastery(id) {
  const keys = sectionItemKeys(id);
  const dom = keys.filter((k) => S.stats[k] && S.stats[k].stage >= 3).length;
  const pend = keys.filter((k) => S.stats[k] && (S.stats[k].star || S.stats[k].due <= Date.now())).length;
  return { total: keys.length, dom, pend };
}
function sectionPool(id) {
  if (id === "minerals") return POOLS[0];
  if (id === "nutrients") return POOLS[2];
  if (id === "hidro" || id === "lipo") {
    const ids = sectionItemKeys(id).map((k) => k.slice(4));
    return { ...POOLS[1], items: POOLS[1].items.filter((i) => ids.includes(i.ref.id)) };
  }
  return null;
}
function mkMcSection(id) {
  if (id === "organitzacio") return mkMcOrg();
  const p = sectionPool(id);
  return mkMcFor(p, pick(p.items));
}
function mkFlashSection(id) {
  const p = sectionPool(id);
  return p ? mkFlash(p, pick(p.items)) : mkOrder();
}
function matchPoolsFor(id) {
  if (id === "minerals") return MATCH_POOLS.filter((p) => p.block === "minerals");
  if (id === "nutrients") return MATCH_POOLS.filter((p) => p.block === "nutrients");
  if (id === "hidro" || id === "lipo") {
    const ids = sectionItemKeys(id).map((k) => k.slice(4));
    return MATCH_POOLS.filter((p) => p.block === "vitamines").map((p) => ({ ...p, filter: (i) => ids.includes(i.id) }));
  }
  return [];
}
function mkMatchSection(id, n) {
  const pools = matchPoolsFor(id);
  if (!pools.length) return mkOrder();
  return mkMatch(pick(pools), n || 4);
}
function sectionSheet(id) {
  if (id === "organitzacio") {
    return {
      cols: ["Com agrupar-ho per recordar", "Seqüència"],
      rows: [
        ["Peces químiques", BIO.nivells.slice(0, 3).join(" → ")],
        ["Cos viu: de la unitat a l'individu", BIO.nivells.slice(3, 8).join(" → ")],
        ["Escala ecològica", BIO.nivells.slice(8).join(" → ")],
        ["Propietat emergent", BIO.propietatEmergent],
      ],
    };
  }
  if (id === "minerals") {
    return {
      cols: ["Mineral", "Funció clau", "Si en falta", "2 fonts clau"],
      rows: BIO.minerals.map((m) => [m.nom, m.funcio, m.def, m.fonts.join(" · ")]),
    };
  }
  if (id === "hidro" || id === "lipo") {
    const list = id === "hidro" ? BIO.hidro : BIO.lipo;
    return {
      cols: ["Vitamina", "Funció clau", "Si en falta", "2 fonts clau"],
      rows: list.map((v) => [v.nom, v.funcio, v.def, v.fonts.join(" · ")]),
    };
  }
  if (id === "nutrients") {
    return {
      cols: ["Nutrient", "Unitats i què formen", "Funció"],
      rows: BIO.nutrients.map((n) => [n.nom, n.resumUnitats, n.funcio]),
    };
  }
  return null;
}

/* ============ construcció de modes ============ */
const GLOBAL_KINDS = ["minerals", "minerals", "vitamines", "vitamines", "vitamines", "nutrients", "organitzacio"];
function buildList(mode, section) {
  const sec = section || null;
  if (mode === "session") {
    if (sec === "organitzacio") {
      return [mkOrder(), ...shuffle(uniqueGen(mkMcOrg, 7))];
    }
    if (sec) {
      const mid = shuffle(dedupeById([
        mkMatchSection(sec), mkFlashSection(sec),
        ...uniqueGen(() => mkMcSection(sec), 6),
      ]));
      return dedupeById([mkFlashSection(sec), ...mid]);
    }
    const mid = shuffle(dedupeById([
      mkMatch(), mkOrder(), mkFlash(),
      ...uniqueGen(() => mkMcAny(pick(GLOBAL_KINDS)), 8),
    ]));
    return dedupeById([mkFlash(), ...mid, mkMiniFields()]);
  }
  if (mode === "arcade") {
    if (sec) return shuffle(uniqueGen(() => mkMcSection(sec), 25));
    return shuffle(uniqueGen(() => mkMcAny(pick(GLOBAL_KINDS)), 25));
  }
  if (mode === "test") return TEST.map(fromTest);
  if (mode === "teach") {
    if (sec) return uniqueGen(() => mkFlashSection(sec), 8);
    return shuffle(uniqueGen(() => mkFlash(pick(POOLS)), 10));
  }
  if (mode === "match") {
    if (sec) {
      const pools = matchPoolsFor(sec);
      if (!pools.length) return buildList("orgmix", sec);
      const rounds = pools.length >= 3 ? shuffle(pools).slice(0, 3) : [...shuffle(pools), pools[0]].slice(0, 3);
      return rounds.map((p) => mkMatch(p, 4));
    }
    return shuffle(MATCH_POOLS).slice(0, 3).map((p) => mkMatch(p, 4));
  }
  if (mode === "orgmix") {
    return [mkOrder(), ...shuffle(uniqueGen(mkMcOrg, 6))];
  }
  if (mode === "review") {
    let keys = dueKeys().sort((a, b) => (S.stats[a].due - S.stats[b].due));
    if (sec) keys = keys.filter((k) => sectionItemKeys(sec).includes(k));
    keys = keys.slice(0, 14);
    if (!keys.length) {
      if (sec) return uniqueGen(() => mkMcSection(sec), 6);
      return shuffle(uniqueGen(() => mkMcAny(pick(GLOBAL_KINDS)), 6));
    }
    return shuffle(keys.map((k) => (CATALOG[k] ? CATALOG[k].mk() : mkMcAny("minerals"))));
  }
  return [];
}

/* ============ run ============ */
const R = {
  mode: "", list: [], i: 0, score: 0, combo: 0, maxCombo: 0,
  hits: 0, total: 0, hearts: 3, missed: [], revealed: false, graded: false,
  autoT: null, tick: null, tEnd: 0, tTotal: 0, tLeft: 0,
  matchSel: null, matchDone: 0, matchErr: 0, orderAns: [], orderOk: null,
  section: null, origin: "session",
};
function cur() { return R.list[R.i]; }
function multOf(c) { return c >= 8 ? 3 : c >= 4 ? 2 : 1; }
const KIND_LABELS = {
  mc: "Recuperació activa", flash: "Flashcard · digues-ho en veu alta",
  order: "Posa'ls en ordre", match: "Parells", fields: "Resposta lliure",
};

function clearTimers() {
  if (R.autoT) clearTimeout(R.autoT), R.autoT = null;
  if (R.tick) clearInterval(R.tick), R.tick = null;
}
function startMode(mode, customList, label, section) {
  clearTimers();
  if (mode !== "retry") R.origin = mode;
  R.mode = mode;
  if (!customList) R.section = section || null;
  else R.section = section !== undefined ? section : R.section || null;
  R.list = dedupeById(customList || buildList(mode, R.section));
  if (!R.list.length) { show("home"); renderHome(); return; }
  R.i = 0; R.score = 0; R.combo = 0; R.maxCombo = 0;
  R.hits = 0; R.total = 0; R.hearts = 3; R.missed = [];
  show("game");
  let modeLabel = label || {
    session: "Sessió de 20 min", arcade: "Missió ràpida", match: "Parells explosius",
    test: "Mini test COMPROVA'T", review: "Repàs espaiat", teach: "Explica-ho a algú",
    orgmix: "Ordre & conceptes", retry: "Torna a provar-les",
  }[mode] || mode;
  if (R.section && !label) {
    const sd = secDef(R.section);
    if (sd) modeLabel += " · " + sd.title;
  }
  $("gMode").textContent = modeLabel;
  render();
}
function render() {
  clearTimers();
  const q = cur();
  if (!q) return finish();
  R.revealed = false; R.graded = false; R.matchSel = null; R.matchDone = 0; R.matchErr = 0;
  R.orderAns = []; R.orderOk = null;
  $("qKind").textContent = R.mode === "arcade" ? "⚡ Pregunta ràpida · " + R.i + "/" + R.list.length
    : (q.kindLabel || KIND_LABELS[q.tipus] || "Pregunta");
  $("qPrompt").innerHTML = esc(q.prompt).replace(/\n/g, "<br>");
  $("qBody").innerHTML = "";
  const fb = $("qFeedback"); fb.hidden = true; fb.innerHTML = "";
  $("qActions").innerHTML = "";
  $("gProgress").style.width = (100 * R.i) / R.list.length + "%";
  $("gScore").textContent = R.score;
  $("gHearts").textContent = R.mode === "arcade" ? "❤️".repeat(R.hearts) + "🖤".repeat(3 - R.hearts) : "";
  const cmp = $("gCombo");
  const m = multOf(R.combo);
  cmp.hidden = R.combo < 2;
  cmp.textContent = `🔥 x${m} · ${R.combo} seguits`;
  const card = $("qcard"); card.classList.remove("shake"); void card.offsetWidth; card.classList.add("pop");

  if (q.tipus === "mc") renderMc(q);
  else if (q.tipus === "flash") renderFlash(q);
  else if (q.tipus === "order") renderOrder(q);
  else if (q.tipus === "match") renderMatch(q);
  else if (q.tipus === "fields") renderFields(q);

  if (R.mode === "arcade") startTimer(15);
  else if (R.mode === "match" && q.tipus === "match") startTimer(40);
  else stopTimer();
}
function startTimer(sec) {
  stopTimer();
  R.tTotal = sec * 1000; R.tEnd = Date.now() + R.tTotal;
  const wrap = $("gTimerWrap"); wrap.hidden = false;
  $("gTimer").style.width = "100%";
  R.tick = setInterval(() => {
    R.tLeft = Math.max(0, R.tEnd - Date.now());
    $("gTimer").style.width = (100 * R.tLeft) / R.tTotal + "%";
    if (R.tLeft <= 0) { stopTimer(); onTimeout(); }
  }, 120);
}
function stopTimer() { if (R.tick) clearInterval(R.tick), R.tick = null; $("gTimerWrap").hidden = true; }

/* ---------- mc ---------- */
function renderMc(q) {
  const body = $("qBody");
  q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.innerHTML = `<span class="k">${idx + 1}</span><span>${esc(opt)}</span>`;
    b.onclick = () => answer(idx);
    body.appendChild(b);
  });
}
function answer(idx) {
  if (R.graded || !cur() || cur().tipus !== "mc") return;
  const q = cur();
  if (idx == null || idx < 0 || idx >= q.options.length) return;
  const opts = $("qBody").querySelectorAll(".opt");
  opts.forEach((o) => (o.disabled = true));
  const ok = idx === q.correct;
  opts.forEach((o, i) => { if (i === q.correct) o.classList.add("ok"); else if (i === idx) o.classList.add("no"); });
  const correctT = q.options[q.correct];
  grade(ok, { got: ok ? q.options[idx] : correctT });
  if (ok) feedback(true, `Correcte! <b>+${lastPts}</b>`, q.info);
  else feedback(false, `Era: <b>${esc(correctT)}</b>`, q.info);
}

/* ---------- flashcard ---------- */
function renderFlash(q) {
  const body = $("qBody");
  const isNut = !!(q.item && q.item.unitats);
  body.innerHTML = `
    <div class="flash">
      <div class="flash-front">${esc(q.prompt)}</div>
      <div class="flash-note">Tapa les respostes: digues en veu alta <b>${isNut ? "unitats → què formen → funció" : "funció → deficiència → 2 fonts"}</b> i després comprova.</div>
    </div>`;
  const act = $("qActions");
  act.innerHTML = "";
  const rv = document.createElement("button");
  rv.className = "btn btn-primary"; rv.textContent = "👀 Revela la resposta";
  rv.onclick = revealFlash;
  act.appendChild(rv);
}
function revealFlash() {
  if (R.revealed || !cur() || cur().tipus !== "flash") return;
  const q = cur(), r = q.item;
  R.revealed = true;
  const rows = r.unitats
    ? `<div class="flash-row" style="animation-delay:.02s"><div class="lbl">Unitats bàsiques</div><div class="val">${esc(r.unitats)}</div></div>
       <div class="flash-row" style="animation-delay:.1s"><div class="lbl">Què formen</div><div class="val">${esc(r.formen)}</div></div>
       <div class="flash-row" style="animation-delay:.18s"><div class="lbl">Funció</div><div class="val">${esc(r.funcio)}</div></div>`
    : `<div class="flash-row" style="animation-delay:.02s"><div class="lbl">Funció</div><div class="val">${esc(r.funcio)}</div></div>
       <div class="flash-row" style="animation-delay:.1s"><div class="lbl">Si en falta</div><div class="val">${esc(r.def || "—")}</div></div>
       <div class="flash-row" style="animation-delay:.18s"><div class="lbl">2 fonts clau</div><div class="val">${r.fonts ? esc(r.fonts.join(" · ")) : "—"}</div></div>`;
  $("qBody").innerHTML = `
    <div class="flash">
      <div class="flash-front">${esc(q.prompt)}</div>
      ${rows}
    </div>`;
  const act = $("qActions");
  act.innerHTML = "";
  const ok = document.createElement("button");
  ok.className = "btn btn-ok"; ok.textContent = "✅ Ho sabia del tot";
  ok.onclick = () => gradeFlash(true);
  const no = document.createElement("button");
  no.className = "btn btn-no"; no.textContent = "🔁 Em falta — marca'm-la ⭐";
  no.onclick = () => gradeFlash(false);
  act.append(ok, no);
}
function gradeFlash(ok) {
  if (R.graded || !cur() || cur().tipus !== "flash") return;
  if (ok) feedback(true, "Genial, la tens!", cur().info);
  else feedback(false, "Fet. Aquesta fila queda marcada ⭐ per al repàs espaiat.", cur().info);
  grade(ok, { got: cur().prompt });
}

/* ---------- ordre ---------- */
function renderOrder(q) {
  const body = $("qBody");
  body.innerHTML = `<div class="chips" id="orderPool"></div><div class="order-zone" id="orderZone"><span class="ph">Fes clic per afegir en ordre…</span></div>`;
  const pool = $("orderPool");
  shuffle(q.seq).forEach((s) => {
    const c = document.createElement("button");
    c.className = "chip"; c.textContent = s;
    if (R.orderAns.includes(s)) c.classList.add("used");
    c.onclick = () => {
      if (R.graded) return;
      if (R.orderAns.includes(s)) {
        R.orderAns = R.orderAns.filter((x) => x !== s);
        [...pool.children].forEach((ch) => { if (ch.textContent === s) ch.classList.remove("used"); });
      } else {
        R.orderAns.push(s);
        [...pool.children].forEach((ch) => { if (ch.textContent === s) ch.classList.add("used"); });
      }
      sfx("click");
      drawOrderZone();
    };
    pool.appendChild(c);
  });
  const act = $("qActions");
  act.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "btn btn-primary"; btn.textContent = "✅ Comprova l'ordre";
  btn.onclick = () => checkOrder();
  act.appendChild(btn);
  drawOrderZone();
}
function drawOrderZone() {
  const z = $("orderZone");
  if (!z) return;
  if (!R.orderAns.length) { z.innerHTML = `<span class="ph">Fes clic per afegir en ordre…</span>`; return; }
  z.innerHTML = "";
  R.orderAns.forEach((s, i) => {
    const c = document.createElement("button");
    c.className = "chip picked"; c.textContent = `${i + 1}. ${s}`;
    if (R.orderOk !== null) c.classList.add(R.orderOk && s === cur().seq[i] ? "ok" : R.orderOk === false ? (s === cur().seq[i] ? "ok" : "no") : "picked");
    c.onclick = () => {
      if (R.graded) return;
      R.orderAns = R.orderAns.filter((x) => x !== s);
      renderOrder(cur());
    };
    z.appendChild(c);
  });
}
function checkOrder() {
  if (R.graded) return;
  const q = cur();
  if (R.orderAns.length !== q.seq.length) {
    $("qcard").classList.remove("shake"); void $("qcard").offsetWidth; $("qcard").classList.add("shake");
    sfx("bad");
    return;
  }
  const ok = R.orderAns.every((s, i) => s === q.seq[i]);
  R.orderOk = ok;
  const pool = $("orderPool");
  if (pool) [...pool.children].forEach((c) => c.classList.add("used"));
  drawOrderZone();
  const act = $("qActions"); act.innerHTML = "";
  if (ok) feedback(true, "Ordre perfecte! 🎯", q.info);
  else feedback(false, `L'ordre correcte era: <b>${esc(q.seq.join(" → "))}</b>`, "");
  grade(ok, { got: R.orderAns.join(" → ") });
}

/* ---------- parells ---------- */
function renderMatch(q) {
  const body = $("qBody");
  const lefts = shuffle(q.pairs.map((p, i) => ({ ...p, pid: i })));
  const rights = shuffle(q.pairs.map((p, i) => ({ ...p, pid: i })));
  body.innerHTML = `
    <div class="match-hud"><span id="mLeft">${q.pairs.length} parells per unir</span><span id="mErr"></span></div>
    <div class="match-grid">
      <div class="mcol" id="mL"></div>
      <div class="mcol" id="mR"></div>
    </div>`;
  const mL = $("mL"), mR = $("mR");
  lefts.forEach((p) => {
    const b = document.createElement("button");
    b.className = "mitem"; b.textContent = p.l; b.dataset.pid = p.pid;
    b.onclick = () => selSide("L", b, p.pid);
    mL.appendChild(b);
  });
  rights.forEach((p) => {
    const b = document.createElement("button");
    b.className = "mitem"; b.textContent = p.r; b.dataset.pid = p.pid;
    b.onclick = () => selSide("R", b, p.pid);
    mR.appendChild(b);
  });
  const act = $("qActions");
  act.innerHTML = "";
}
function selSide(side, el, pid) {
  if (R.graded || el.classList.contains("done")) return;
  const other = side === "L" ? "mR" : "mL";
  if (side === "L") {
    $("mL").querySelectorAll(".mitem").forEach((b) => b.classList.remove("sel"));
    el.classList.add("sel"); R.matchSel = el; sfx("click");
  } else {
    const L = R.matchSel;
    if (!L) { el.classList.add("wrong"); setTimeout(() => el.classList.remove("wrong"), 400); return; }
    if (L.dataset.pid === pid && R.matchSel.dataset.pid === el.dataset.pid) {
      L.classList.add("done"); el.classList.add("done");
      L.classList.remove("sel");
      R.matchSel = null; R.matchDone++;
      sfx("ok");
      const left = cur().pairs.length - R.matchDone;
      const ml = $("mLeft"); if (ml) ml.textContent = left ? `${left} parell${left > 1 ? "s" : ""} per unir` : "Tot unit! 🎉";
      confetti(14);
      if (R.matchDone >= cur().pairs.length) finishMatch();
    } else {
      R.matchErr++;
      const me = $("mErr"); if (me) me.textContent = R.matchErr + " error" + (R.matchErr > 1 ? "s" : "");
      [L, el].forEach((b) => { b.classList.add("wrong"); setTimeout(() => b.classList.remove("wrong"), 420); });
      L.classList.remove("sel"); R.matchSel = null;
      sfx("bad");
      $("qcard").classList.remove("shake"); void $("qcard").offsetWidth; $("qcard").classList.add("shake");
    }
  }
}
function finishMatch() {
  const ok = R.matchErr === 0;
  if (ok) feedback(true, "Parells perfectes sense errors! ⚡", cur().info);
  else feedback(false, `Fet, però amb <b>${R.matchErr}</b> error(s). La pròxima, neteja!`, cur().info);
  grade(ok, { got: cur().prompt });
}

/* ---------- camps ---------- */
function renderFields(q) {
  const body = $("qBody");
  body.innerHTML = q.fields.map((f, i) => `
    <div class="field-row" data-i="${i}">
      <label>${esc(f.label)}</label>
      <input type="text" placeholder="${esc(f.ph || "…")}" autocomplete="off" spellcheck="false" />
    </div>`).join("");
  const act = $("qActions");
  act.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "btn btn-primary"; btn.textContent = "✅ Comprova";
  btn.onclick = submitFields;
  act.appendChild(btn);
  const inp = body.querySelector("input");
  if (inp) inp.focus();
}
function submitFields() {
  if (R.graded || !cur() || cur().tipus !== "fields") return;
  const q = cur();
  const rows = $("qBody").querySelectorAll(".field-row");
  let all = true;
  rows.forEach((row, i) => {
    const f = q.fields[i];
    const val = norm(row.querySelector("input").value);
    const ok = f.need.every((re) => re.test(val));
    row.classList.add(ok ? "good" : "bad");
    if (!ok) all = false;
  });
  if (all) feedback(true, "Totes correctes! 🎯", q.info);
  else feedback(false, "Revisa els camps marcats en vermell.", q.info);
  grade(all, { got: q.prompt });
}

/* ---------- feedback + puntuació ---------- */
let lastPts = 0;
function feedback(ok, text, info) {
  const fb = $("qFeedback");
  fb.hidden = false;
  fb.className = "q-feedback " + (ok ? "good" : "bad");
  fb.innerHTML = (ok ? "✅ " : "❌ ") + text + (info ? `<div class="fb-info">💡 ${esc(info)}</div>` : "");
}
function grade(ok, meta) {
  if (R.graded) return;
  R.graded = true;
  stopTimer();
  R.total++; if (ok) R.hits++;
  const q = cur();
  const b = S.blocks[q.block] || (S.blocks[q.block] = { hit: 0, total: 0 });
  b.total++; if (ok) b.hit++;
  (q.items || []).forEach((k) => sched(k, ok));
  lastPts = 0;
  if (ok) {
    R.combo++;
    R.maxCombo = Math.max(R.maxCombo, R.combo);
    const mult = multOf(R.combo);
    lastPts = 100 * mult;
    if (R.mode === "arcade" && R.tLeft) lastPts += Math.ceil(R.tLeft / 1000) * 5;
    if (R.mode === "match" && R.matchErr === 0) lastPts += 50;
    R.score += lastPts;
    sfx(mult >= 2 ? "combo" : "ok");
    confetti(mult >= 2 ? 34 : 16);
  } else {
    R.combo = 0;
    R.missed.push(q);
    if (R.mode === "arcade") R.hearts--;
    sfx("bad");
    $("qcard").classList.remove("shake"); void $("qcard").offsetWidth; $("qcard").classList.add("shake");
  }
  $("gScore").textContent = R.score;
  const cmp = $("gCombo");
  const m = multOf(R.combo);
  cmp.hidden = R.combo < 2;
  cmp.textContent = `🔥 x${m} · ${R.combo} seguits`;

  const act = $("qActions");
  if (R.mode !== "arcade" || !ok) {
    if (!act.querySelector(".btn-next")) {
      const nb = document.createElement("button");
      nb.className = "btn btn-primary btn-next";
      nb.textContent = R.mode === "arcade" && !ok ? "💔 Continua" : "Següent ➜";
      nb.onclick = advance;
      act.appendChild(nb);
    }
  }
  const delay = R.mode === "arcade" ? (ok ? 900 : 2400) : ok ? 1100 : 0;
  if (delay) R.autoT = setTimeout(advance, delay);
}
function advance() {
  if (!R.graded) return;
  clearTimers();
  if (R.mode === "arcade" && R.hearts <= 0) return finish();
  R.i++;
  render();
}
function onTimeout() {
  if (R.graded || !cur()) return;
  const q = cur();
  if (q.tipus === "mc") {
    const opts = $("qBody").querySelectorAll(".opt");
    opts.forEach((o, i) => { o.disabled = true; if (i === q.correct) o.classList.add("ok"); });
    feedback(false, `Temps esgotat! Era: <b>${esc(q.options[q.correct])}</b>`, q.info);
  } else if (q.tipus === "order") {
    feedback(false, `Temps esgotat! Ordre: <b>${esc(q.seq.join(" → "))}</b>`, "");
  } else if (q.tipus === "match") {
    feedback(false, "Temps esgotat abans d'unir-ho tot.", q.info);
  } else {
    feedback(false, "Temps esgotat.", q.info);
  }
  grade(false, { timeout: true, got: q.prompt });
}

/* ============ resultat ============ */
function finish() {
  clearTimers(); stopTimer();
  touchDay(); S.played++;
  const acc = R.total ? R.hits / R.total : 0;
  const xpGain = R.hits * 30 + Math.round(R.score / 10);
  S.xp += xpGain;
  save();
  show("result");
  const perfect = acc >= 0.999;
  $("rEmoji").textContent = perfect ? "🏆" : acc >= 0.8 ? "🎉" : acc >= 0.5 ? "🙂" : "💪";
  $("rTitle").textContent = perfect ? "Perfecte! Ni un error!" : acc >= 0.8 ? "Molt bé! Cada cop ho saps millor" : acc >= 0.5 ? "Bé, però hi ha feina a fer" : "Ànims: torna-hi i ho tindràs";
  $("rScore").textContent = R.score;
  $("rAcc").textContent = Math.round(acc * 100) + "%";
  $("rXp").textContent = "+" + xpGain;
  const stars = starKeys().length;
  const sn = $("rStarsNote");
  sn.hidden = !R.missed.length || !stars;
  if (!sn.hidden) sn.innerHTML = `⭐ Tens <b>${stars}</b> pregunta${stars > 1 ? "s" : ""} marcada${stars > 1 ? "s" : ""} per repassar: avui, demà, als 3 dies i a la setmana.`;
  const list = $("rList");
  list.innerHTML = "";
  const seenIds = new Set();
  R.missed.forEach((q, n) => {
    if (seenIds.has(q.id)) return; seenIds.add(q.id);
    const ans = q.info || (q.tipus === "mc" ? q.options[q.correct] : "") || (q.tipus === "order" ? q.seq.join(" → ") : "");
    const d = document.createElement("div");
    d.className = "rline";
    d.style.animationDelay = n * 0.05 + "s";
    d.innerHTML = `<div class="q">⭐ ${esc(q.prompt).slice(0, 140)}</div><div class="a">→ ${esc(ans)}</div>`;
    list.appendChild(d);
  });
  if (!R.missed.length) {
    const d = document.createElement("div");
    d.className = "rline";
    d.innerHTML = `<div class="a">Cap error! Has encertat tot (${R.hits}/${R.total}). 🔥 Ratxa de ${S.streak} dia${S.streak > 1 ? "s" : ""}!</div>`;
    list.appendChild(d);
  }
  $("rRetry").hidden = !R.missed.length;
  if (perfect || acc >= 0.6) { sfx("win"); confetti(perfect ? 160 : 90); }
  renderHome();
}

/* ============ navegació / home ============ */
function show(which) {
  ["home", "game", "result", "section", "online"].forEach((s) => { $("screen-" + s).hidden = s !== which; });
  document.body.dataset.screen = which;
  if (which !== "game") clearTimers();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderHud() {
  const lvl = 1 + Math.floor(S.xp / 400);
  $("hudLevel").textContent = lvl;
  $("hudXp").textContent = S.xp % 400;
  $("hudStreak").textContent = S.streak || 0;
  $("sndBtn").textContent = S.sound ? "🔊" : "🔇";
}
function renderHome() {
  renderHud();
  const grid = $("secGrid");
  grid.innerHTML = "";
  SECTIONS.forEach((sec, i) => {
    const pct = sectionPct(sec.id);
    const m = sectionMastery(sec.id);
    const d = document.createElement("button");
    d.className = "sec-card sc" + (i + 1);
    d.innerHTML = `
      <div class="sec-top"><span class="sec-ico">${secSvg(sec.id)}</span>
        <span class="sec-name">${esc(sec.title)}</span>
        <span class="sec-arrow">→</span></div>
      <div class="sec-sub">${esc(sec.sub)}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="sec-meta"><span>${pct}% dominat</span><span>${m.dom}/${m.total} ben apreses${m.pend ? ` · ⭐ ${m.pend} per repassar` : ""}</span></div>`;
    d.onclick = () => openSection(sec.id);
    grid.appendChild(d);
  });
  const due = dueKeys(), stars = starKeys();
  const t = $("dueText"), btn = $("dueBtn");
  if (due.length) {
    t.innerHTML = `🔁 <b>${due.length}</b> preguntes toquen repàs espaiat` + (stars.length ? ` · ⭐ ${stars.length} marcades` : "");
    btn.hidden = false;
  } else if (!S.played) {
    t.textContent = "Cap pendent encara. Entra a una secció o fes una partida per començar!";
    btn.hidden = true;
  } else {
    t.textContent = "✅ Tot al dia! Torna demà per mantenir la ratxa 🔥";
    btn.hidden = true;
  }
}

/* ============ secció ============ */
function openSection(id) {
  const sec = secDef(id);
  if (!sec) return;
  sfx("click");
  renderSection(sec);
  show("section");
}
function renderSection(sec) {
  const pct = sectionPct(sec.id);
  const m = sectionMastery(sec.id);
  const sheet = sectionSheet(sec.id);
  const dueHere = dueKeys().filter((k) => sectionItemKeys(sec.id).includes(k)).length;

  const actions = [
    { mode: "arcade", ico: "⚡", label: "Missió ràpida" },
    { mode: "session", ico: "🎒", label: "Sessió" },
    sec.id === "organitzacio"
      ? { mode: "orgmix", ico: "🧩", label: "Ordre & conceptes" }
      : { mode: "teach", ico: "🎓", label: "Flashcards" },
    sec.id === "organitzacio"
      ? null
      : { mode: "match", ico: "🧪", label: "Parells" },
    dueHere ? { mode: "review", ico: "⭐", label: `Repàs (${dueHere})` } : null,
  ].filter(Boolean);

  let tableHtml = "";
  if (sheet) {
    tableHtml = `
      <div class="cover-bar">
        <button class="btn btn-small" id="coverBtn">👁 Mostra-ho tot</button>
        <span class="cover-hint">${
          sec.id === "organitzacio"
            ? "Tapa les cadenes i digues-les senceres des de l'àtom fins al bioma. Toca una casella per revelar-la."
            : sec.id === "nutrients"
              ? "Tapa les respostes i completa en veu alta: <b>unitats → què formen → funció</b>. Toca una casella per revelar-la."
              : "Tapa les respostes i completa en veu alta: <b>funció → deficiència → 2 fonts</b>. Toca una casella per revelar-la."
        }</span>
      </div>
      <div class="sheet-wrap">
        <table class="sheet cover" id="secSheet">
          <thead><tr>${sheet.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
          <tbody>
            ${sheet.rows.map((r) => `<tr>${r.map((c, ci) => `<td${ci > 0 ? ` class="ans" data-th="${esc(sheet.cols[ci])}"` : ""}><span class="v">${esc(c)}</span></td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  $("secView").innerHTML = `
    <div class="sec-head">
      <button class="btn btn-ghost" id="secBack">← Seccions</button>
      <div class="sec-title"><span class="sec-ico big">${secSvg(sec.id)}</span>${esc(sec.title)}</div>
      <div class="sec-stats">
        <span>${pct}% dominat</span><span>${m.dom}/${m.total} ben apreses</span>${dueHere ? `<span>⭐ ${dueHere} per repassar</span>` : ""}
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </div>

    <div class="sec-actions">
      ${actions.map((a) => `<button class="btn btn-sec" data-mode="${a.mode}">${a.label}</button>`).join("")}
    </div>

    <div class="truc-box">💡 <b>Truc:</b> ${esc(sec.truc)}</div>
    ${(sec.conf || []).map((c) => `<div class="conf-box">⚠️ <b>Confusió:</b> ${esc(c)}</div>`).join("")}

    ${tableHtml}

    <div class="sec-tip">🏋️ Cada partida d'aquesta secció <b>només fa preguntes d'aquí</b>. Recorda: primer intenta de memòria, després comprova.</div>`;

  $("secBack").onclick = () => { sfx("click"); show("home"); renderHome(); };
  $("secView").querySelectorAll(".btn-sec").forEach((b) => {
    b.onclick = () => { sfx("click"); startMode(b.dataset.mode, null, null, sec.id); };
  });
  const sheetEl = $("secSheet"), coverBtn = $("coverBtn");
  if (sheetEl && coverBtn) {
    coverBtn.onclick = () => {
      const on = sheetEl.classList.toggle("cover");
      coverBtn.textContent = on ? "👁 Mostra-ho tot" : "🙈 Tapa les respostes";
      if (!on) sheetEl.querySelectorAll("td.rev").forEach((td) => td.classList.remove("rev"));
      sfx("click");
    };
    sheetEl.querySelectorAll("td.ans").forEach((td) => {
      td.onclick = () => { td.classList.toggle("rev"); sfx("click"); };
    });
  }
}
function goHome() {
  show("home"); renderHome();
}
function goBackAfterGame() {
  if (R.section && secDef(R.section) && R.origin !== "test") {
    renderSection(secDef(R.section));
    show("section");
  } else goHome();
}

/* ============ ONLINE — sala amb codi, fins a 4 jugadors ============ */
const ONLINE_MAX = 4;
const CODE_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ON = {
  phase: "hub", code: "", host: false, me: "", name: "",
  players: [], section: "mix", scores: {}, done: [],
  peer: null, conns: {}, conn: null,
  rows: [], rowIdx: -1, turn: null,
  local: null, view: "wait", msg: "", xpDone: false,
};

/* --- codi de sala ÚNIC (mai repetit entre sales recents + proving que la sala no existeixi) --- */
function genCode() {
  const a = CODE_ALPHA;
  const recent = (S && S.recentCodes) || [];
  let last = "";
  for (let tries = 0; tries < 40; tries++) {
    const arr = new Uint32Array(6);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
    else for (let i = 0; i < 6; i++) arr[i] = Math.floor(Math.random() * 1e9);
    let out = "";
    for (let i = 0; i < 6; i++) out += a[arr[i] % a.length];
    last = out;
    if (recent.indexOf(out) === -1) return out;
  }
  return last;
}
function rememberCode(code) {
  S.recentCodes = (S.recentCodes || []).concat([code]).slice(-80);
  save();
}
function makePeer(id) {
  if (window.__peerFactory) return window.__peerFactory(id);
  if (typeof Peer === "undefined") return null;
  try { return id ? new Peer(id) : new Peer(); } catch (e) { return null; }
}

/* --- xifratge/estimació: % de cobertura respecte del text real --- */
const STOPKW = new Set(["funcio", "clau", "fonts", "font", "dues", "codi", "real", "text", "resposta", "correcte", "mateix", "altra", "altres", "sobre", "entre"]);
function kwOf(real) {
  const toks = norm(real || "").split(" ").filter((t) => t.length >= 4 && !STOPKW.has(t));
  const uniq = [...new Set(toks)];
  uniq.sort((x, y) => y.length - x.length);
  return uniq.slice(0, 5);
}
function kwStem(k) { return k.length > 4 && k.endsWith("s") ? k.slice(0, -1) : k; }
function covMeta(row, typed) {
  const cols = [];
  let got = 0, tot = 0;
  row.cols.forEach((c, i) => {
    const kws = kwOf(c.real);
    const t = norm((typed || [])[i] || "");
    let m = 0;
    for (const k of kws) if (t.includes(kwStem(k))) m++;
    const cov = kws.length ? m / kws.length : (t ? 1 : 0);
    cols.push(cov);
    got += m; tot += kws.length;
  });
  const overall = tot ? got / tot : ((typed || []).some((v) => norm(v)) ? 1 : 0);
  return { cols, overall };
}
function covBadge(c) { return c >= 0.67 ? "✅" : c >= 0.34 ? "🔸" : "❌"; }

/* --- files de la taula per secció (el que s'ha d'escriure) --- */
function rowsForSection(sec) {
  if (sec === "organitzacio") {
    const sh = sectionSheet("organitzacio");
    return sh.rows.map((r, i) => ({
      tipus: "row", block: "organitzacio",
      items: [i === 3 ? "org:emergent" : "org:nivells"], id: "row:org:" + i,
      row: { title: r[0], cols: [{ label: i === 3 ? "Definició" : "Seqüència de nivells", real: r[1] }] },
    }));
  }
  if (["minerals", "hidro", "lipo", "nutrients"].indexOf(sec) >= 0) {
    const sh = sectionSheet(sec);
    const keys = sectionItemKeys(sec);
    return sh.rows.map((r, i) => ({
      tipus: "row",
      block: sec === "nutrients" ? "nutrients" : sec === "minerals" ? "minerals" : "vitamines",
      items: [keys[i]], id: "row:" + keys[i],
      row: { title: r[0], cols: sh.cols.slice(1).map((label, ci) => ({ label, real: r[ci + 1] })) },
    }));
  }
  return [];
}
function buildOnlineRows(section) {
  if (section && section !== "mix") return rowsForSection(section);
  const pickN = (sec, n) => shuffle(rowsForSection(sec)).slice(0, n);
  return [
    ...pickN("minerals", 2), ...pickN("hidro", 2), ...pickN("lipo", 1),
    ...pickN("nutrients", 2), ...pickN("organitzacio", 1),
  ];
}

/* ---------- estat compartit ---------- */
function destroyOnline() {
  try { if (ON.conn) ON.conn.close(); } catch (e) {}
  try { Object.keys(ON.conns).forEach((k) => { try { ON.conns[k].close(); } catch (e) {} }); } catch (e) {}
  try { if (ON.peer) ON.peer.destroy(); } catch (e) {}
  ON.peer = null; ON.conn = null; ON.conns = {};
  if (ON.guard) { clearTimeout(ON.guard); ON.guard = null; }
}
function leaveOnline() {
  ON.phase = "hub";
  destroyOnline();
  ON.code = ""; ON.msg = ""; ON.players = []; ON.scores = {};
  ON.local = null; ON.view = "wait"; ON.turn = null; ON.xpDone = false;
  ON.done = []; ON.section = "mix";
  show("home"); renderHome();
}
function openOnline() {
  show("online"); renderOnline();
}
function openOnlineScreen() {
  if ($("screen-online").hidden) show("online");
  renderOnline();
}
function playerById(id) { return ON.players.find((p) => p.id === id); }
function pname(id) { const p = playerById(id); return p ? p.name : "?"; }
function grantOnlineXp() {
  if (ON.xpDone) return;
  ON.xpDone = true;
  const mine = ON.scores[ON.me] || 0;
  S.xp += Math.round(mine / 10);
  touchDay(); save(); renderHud();
}

/* ---------- HOST ---------- */
function onlineCreate(name, forceCode, section) {
  destroyOnline();
  ON.host = true; ON.name = (name || "").trim().slice(0, 16) || "Jugador 1";
  ON.section = section || "mix"; ON.done = [];
  ON.phase = "hub"; ON.msg = "Connectant…"; ON.xpDone = false;
  openOnlineScreen();
  tryCreate(0, forceCode);
}
function tryCreate(attempt, forceCode) {
  const code = attempt === 0 && forceCode ? forceCode : genCode();
  const peer = makePeer("bioestudi-" + code);
  if (!peer) { ON.msg = "⚠️ No s'ha pogut carregar PeerJS (cal connexió a internet)."; openOnlineScreen(); return; }
  ON.peer = peer;
  peer.on("open", () => {
    ON.code = code; ON.me = peer.id || ("bioestudi-" + code);
    ON.players = [{ id: ON.me, name: ON.name }];
    ON.scores = {}; ON.phase = "lobby"; ON.msg = "";
    rememberCode(code);
    openOnlineScreen();
  });
  peer.on("connection", (conn) => hostOnConn(conn));
  peer.on("error", (e) => {
    const t = e && e.type;
    if (t === "unavailable-id") {
      try { peer.destroy(); } catch (err) {}
      if (attempt < 8) { tryCreate(attempt + 1); return; }
      ON.msg = "⚠️ No s'ha pogut generar un codi lliure. Torna-ho a provar.";
      openOnlineScreen(); return;
    }
    if (ON.phase !== "over") { ON.msg = "⚠️ Error de connexió: " + (t || "desconegut"); openOnlineScreen(); }
  });
}
function hostOnConn(conn) {
  const remote = conn.peer;
  conn.on("data", (m) => hostHandle(m, conn, remote));
  conn.on("close", () => hostDrop(remote));
}
function hostDrop(id) {
  if (ON.phase === "lobby") {
    if (!ON.players.some((p) => p.id === id)) return;
    ON.players = ON.players.filter((p) => p.id !== id);
    delete ON.scores[id];
    hostLobby();
  } else if (ON.phase === "play") {
    /* només una desconnexió d'un jugador UNIT acaba la partida;
       connexions rebutjades (sala plena/começada) tanquen la seva connexió sense afectar-hi */
    if (!ON.players.some((p) => p.id === id)) return;
    hostEnd("Un jugador s'ha desconnectat. La sala s'ha tancat.");
  }
}
function hostEnd(why) {
  const msg = { t: "bye", why };
  ON.players.forEach((p) => { if (p.id !== ON.me) onSend(p.id, msg); });
  ON.phase = "hub"; ON.msg = "⚠️ " + why; ON.players = []; ON.local = null; ON.turn = null; ON.done = [];
  destroyOnline();
  openOnlineScreen();
}
function onSend(id, msg) {
  const c = ON.conns[id];
  if (c) { try { c.send(msg); } catch (e) {} }
}
function hostLobby() {
  ON.players.forEach((p) => { if (ON.scores[p.id] == null) ON.scores[p.id] = 0; });
  const msg = { t: "lobby", players: ON.players, section: ON.section, hostId: ON.me, scores: ON.scores };
  ON.players.forEach((p) => { if (p.id !== ON.me) onSend(p.id, msg); });
  openOnlineScreen();
}
function hostHandle(m, conn, remote) {
  if (!m || typeof m !== "object") return;
  if (m.t === "join") {
    if (ON.phase !== "lobby") {
      try { conn.send({ t: "reject", why: "La partida ja ha començat." }); } catch (e) {}
      return;
    }
    if (ON.players.length >= ONLINE_MAX) {
      try { conn.send({ t: "reject", why: "Sala plena: màxim " + ONLINE_MAX + " jugadors." }); } catch (e) {}
      return;
    }
    ON.conns[remote] = conn;
    ON.players.push({ id: remote, name: String(m.name || "Jugador " + (ON.players.length + 1)).slice(0, 16) });
    ON.scores[remote] = 0;
    try { conn.send({ t: "welcome", you: remote, code: ON.code, players: ON.players, section: ON.section, scores: ON.scores }); } catch (e) {}
    hostLobby();
    return;
  }
  if (ON.phase !== "play" || !ON.turn) return;
  if (m.t === "pass" && remote === ON.turn.writerId && ON.turn.phase === "write") {
    ON.turn.typed = (m.vals || []).map((v) => String(v || "").slice(0, 160));
    ON.turn.phase = "check";
    hostSendPhases();
    return;
  }
  if (m.t === "verdict" && remote === ON.turn.checkerId && ON.turn.phase === "check") {
    hostVerdict(!!m.good);
  }
}
function onlineStart(section) {
  if (!ON.host || ON.phase !== "lobby" || ON.players.length < 2) return;
  ON.section = section || "mix";
  ON.rows = buildOnlineRows(ON.section);
  ON.scores = {}; ON.players.forEach((p) => { ON.scores[p.id] = 0; });
  ON.rowIdx = -1; ON.turn = null; ON.xpDone = false; ON.done = [];
  ON.phase = "play"; ON.msg = "";
  hostNextRow();
}
function hostNextRow() {
  if (!ON.host || ON.phase !== "play") return;
  ON.rowIdx++;
  if (ON.rowIdx >= ON.rows.length) { hostGameOver(); return; }
  const n = ON.players.length;
  const q = ON.rows[ON.rowIdx];
  ON.turn = {
    rowIdx: ON.rowIdx, q, row: q.row, phase: "write",
    writerId: ON.players[ON.rowIdx % n].id,
    checkerId: ON.players[(ON.rowIdx + 1) % n].id,
    typed: null,
  };
  hostSendPhases();
}
function phaseMsgFor(pid) {
  const t = ON.turn, row = t.row;
  const base = {
    t: "phase", phase: t.phase, rowIdx: t.rowIdx, total: ON.rows.length,
    writerId: t.writerId, checkerId: t.checkerId, scores: ON.scores, players: ON.players,
    done: ON.done, curLabels: row.cols.map((c) => c.label),
  };
  if (t.phase === "write") {
    return pid === t.writerId
      ? { ...base, you: "write", row: { title: row.title, cols: row.cols.map((c) => ({ label: c.label })) } }
      : { ...base, you: "wait", rowTitle: row.title };
  }
  if (pid === t.checkerId) return { ...base, you: "check", row: { title: row.title, cols: row.cols }, typed: t.typed };
  if (pid === t.writerId) return { ...base, you: "wait-writer", rowTitle: row.title };
  return { ...base, you: "wait", rowTitle: row.title };
}
function hostSendPhases() {
  ON.players.forEach((p) => {
    const msg = phaseMsgFor(p.id);
    if (p.id === ON.me) { ON.local = msg; ON.view = msg.you; }
    else onSend(p.id, msg);
  });
  openOnlineScreen();
}
function hostVerdict(good) {
  const t = ON.turn;
  if (!t || t.phase !== "check") return;
  const meta = covMeta(t.row, t.typed);
  const autoGood = meta.overall >= 0.5;
  const dW = good ? 100 : 0;
  const dC = good === autoGood ? 60 : 0;
  ON.scores[t.writerId] = (ON.scores[t.writerId] || 0) + dW;
  ON.scores[t.checkerId] = (ON.scores[t.checkerId] || 0) + dC;
  ON.done.push({ title: t.row.title, cols: t.row.cols.map((c) => ({ label: c.label, real: c.real })), good });
  t.q.items.forEach((k) => sched(k, good));
  const b = S.blocks[t.q.block] || (S.blocks[t.q.block] = { hit: 0, total: 0 });
  b.total++; if (good) b.hit++;
  save();
  t.phase = "reveal";
  const reveal = {
    t: "phase", phase: "reveal", you: "reveal", rowIdx: t.rowIdx, total: ON.rows.length,
    row: { title: t.row.title, cols: t.row.cols }, typed: t.typed,
    good, autoGood, cov: meta.cols, overall: meta.overall,
    deltaW: dW, deltaC: dC, writerId: t.writerId, checkerId: t.checkerId,
    scores: ON.scores, players: ON.players,
  };
  ON.players.forEach((p) => {
    if (p.id === ON.me) { ON.local = reveal; ON.view = "reveal"; }
    else onSend(p.id, reveal);
  });
  openOnlineScreen();
}
function hostGameOver() {
  ON.phase = "over"; ON.turn = null;
  const msg = { t: "over", scores: ON.scores, players: ON.players };
  ON.players.forEach((p) => { if (p.id !== ON.me) onSend(p.id, msg); });
  grantOnlineXp();
  openOnlineScreen();
}

/* ---------- GUEST ---------- */
function onlineJoin(code, name) {
  destroyOnline();
  ON.host = false; ON.name = (name || "").trim().slice(0, 16) || "Jugador";
  ON.code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  ON.phase = "hub"; ON.msg = "Unint-se a la sala…"; ON.xpDone = false;
  openOnlineScreen();
  if (ON.code.length !== 6) { ON.msg = "⚠️ El codi té 6 caràcters."; openOnlineScreen(); return; }
  const peer = makePeer();
  if (!peer) { ON.msg = "⚠️ No s'ha pogut carregar PeerJS (cal connexió a internet)."; openOnlineScreen(); return; }
  ON.peer = peer;
  peer.on("open", () => {
    ON.me = peer.id;
    let opened = false;
    let conn;
    try { conn = peer.connect("bioestudi-" + ON.code, { reliable: true }); }
    catch (e) { guestGone("No s'ha pogut connectar amb la sala."); return; }
    ON.conn = conn;
    conn.on("open", () => {
      opened = true;
      try { conn.send({ t: "join", name: ON.name }); } catch (e) {}
      ON.msg = "Entrant…"; openOnlineScreen();
    });
    conn.on("data", (m) => guestHandle(m));
    conn.on("close", () => { if (ON.phase !== "hub") guestGone("S'ha tancat la connexió amb la sala."); });
    conn.on("error", () => guestGone("Error de connexió amb la sala."));
    if (ON.guard) clearTimeout(ON.guard);
    ON.guard = setTimeout(() => {
      if (!opened) guestGone("No s'ha trobat la sala. Comprova el codi.");
    }, 5000);
  });
  peer.on("error", (e) => {
    const t = e && e.type;
    if (t === "peer-unavailable") guestGone("No existeix aquesta sala o el codi és incorrecte.");
    else { ON.msg = "⚠️ Error: " + (t || "desconegut"); openOnlineScreen(); }
  });
}
function guestGone(why) {
  ON.phase = "hub"; ON.msg = "⚠️ " + why;
  ON.players = []; ON.local = null; ON.view = "wait"; ON.turn = null; ON.done = [];
  destroyOnline();
  openOnlineScreen();
}
function guestHandle(m) {
  if (!m || typeof m !== "object") return;
  if (m.t === "reject") { guestGone(m.why || "No pots entrar a la sala."); return; }
  if (m.t === "welcome") {
    if (ON.guard) { clearTimeout(ON.guard); ON.guard = null; }
    ON.me = m.you; ON.players = m.players; ON.section = m.section; ON.scores = m.scores || {};
    ON.phase = "lobby"; ON.msg = "";
    openOnlineScreen(); return;
  }
  if (m.t === "lobby") {
    ON.players = m.players; ON.section = m.section; ON.scores = m.scores || ON.scores;
    openOnlineScreen(); return;
  }
  if (m.t === "phase") {
    ON.local = m; ON.view = m.you; ON.phase = "play";
    if (m.done) ON.done = m.done;
    ON.players = m.players || ON.players; ON.scores = m.scores || ON.scores;
    openOnlineScreen(); return;
  }
  if (m.t === "over") {
    ON.scores = m.scores; ON.players = m.players; ON.phase = "over";
    grantOnlineXp(); openOnlineScreen(); return;
  }
  if (m.t === "bye") { guestGone(m.why || "La sala s'ha tancat."); }
}
function onPass(vals) {
  if (!ON.turn && !ON.local) return;
  if (ON.host) hostHandle({ t: "pass", vals }, null, ON.me);
  else if (ON.conn) { try { ON.conn.send({ t: "pass", vals }); } catch (e) {} }
}
function onVerdict(good) {
  if (ON.host) hostHandle({ t: "verdict", good }, null, ON.me);
  else if (ON.conn) { try { ON.conn.send({ t: "verdict", good }); } catch (e) {} }
}

/* ---------- PANTALLES ---------- */
function renderOnline() {
  const v = $("onView");
  if (!v) return;
  if (ON.phase === "lobby") return renderOnLobby(v);
  if (ON.phase === "play") return renderOnPlay(v);
  if (ON.phase === "over") return renderOnOver(v);
  renderOnHub(v);
}
function renderOnHub(v) {
  v.innerHTML = `
    <div class="on-head">🌐 Joc en línia <span class="on-max">fins a ${ONLINE_MAX} jugadors · sala amb codi únic</span></div>
    <div class="on-grid">
      <div class="on-card">
        <h3>➕ Crea una sala</h3>
        <div class="field-row"><label>El teu nom</label><input id="onHostName" maxlength="16" placeholder="Anna" autocomplete="off"></div>
        <div class="field-row"><label>Tema de la partida</label>
          <select id="onHubSection">
            <option value="mix">🎲 Barreja (totes les seccions)</option>
            ${SECTIONS.map((s) => `<option value="${s.id}">${s.ico} ${esc(s.title)}</option>`).join("")}
          </select></div>
        <button class="btn btn-primary" id="onCreate">Crear sala 🎟️</button>
      </div>
      <div class="on-card">
        <h3>🔑 Entra en una sala</h3>
        <div class="field-row"><label>Codi de sala</label><input id="onJoinCode" maxlength="6" placeholder="K7X2QM" style="text-transform:uppercase;letter-spacing:4px;font-weight:800" autocomplete="off"></div>
        <div class="field-row"><label>El teu nom</label><input id="onJoinName" maxlength="16" placeholder="Bernat" autocomplete="off"></div>
        <button class="btn btn-primary" id="onJoin">Unir-me ▶️</button>
      </div>
    </div>
    ${ON.msg ? `<p class="on-msg">${esc(ON.msg)}</p>` : ""}
    <p class="on-note">📋 El codi es genera en crear la sala i <b>no es pot repetir</b> (es comprova que no hi sigui i s'eviten els codis recents). Comparteix-lo amb fins a 3 amics més.</p>`;
  const cr = $("onCreate");
  if (cr) cr.onclick = () => onlineCreate($("onHostName").value, null, $("onHubSection") ? $("onHubSection").value : "mix");
  const jn = $("onJoin");
  if (jn) jn.onclick = () => onlineJoin($("onJoinCode").value, $("onJoinName").value);
}
/* icones SVG de secció (monoline) — identitat visual pròpia, sense emojis */
const SEC_SVG = {
  organitzacio: '<path d="M7 2.5c0 4.6 10 5.4 10 9.5s-10 4.9-10 9.5"/><path d="M17 2.5c0 4.6-10 5.4-10 9.5s10 4.9 10 9.5"/><path d="M8.5 6.5h7M7.5 12h9M8.5 17.5h7"/>',
  minerals: '<path d="M12 2.5l7.5 5.5L16 21.5H8L4.5 8z"/><path d="M4.5 8h15M12 2.5 9 8l3 13.5L15 8z"/>',
  hidro: '<g transform="rotate(-45 12 12)"><rect x="2.5" y="8.5" width="19" height="7" rx="3.5"/><path d="M12 8.5v7"/></g>',
  lipo: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>',
  nutrients: '<path d="M12 21V9.5"/><path d="M12 9.5c0-3.2 2-5.8 5.2-6.8.6 3.6-1.1 6.8-5.2 6.8zM12 9.5C12 6.3 10 3.7 6.8 2.7c-.6 3.6 1.1 6.8 5.2 6.8z"/><path d="M12 14.5c0-2.7 1.7-4.9 4.4-5.7.5 3.1-1.1 5.7-4.4 5.7zM12 14.5c0-2.7-1.7-4.9-4.4-5.7-.5 3.1 1.1 5.7 4.4 5.7z"/>',
};
function secSvg(id, cls) {
  const paths = SEC_SVG[id];
  if (!paths) return "";
  return `<svg class="svg-ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
function sectionLabel(id) {
  if (!id || id === "mix") return "🎲 Barreja (totes les seccions)";
  const sec = SECTIONS.find((x) => x.id === id);
  return sec ? sec.ico + " " + sec.title : id;
}
function renderOnLobby(v) {
  const isHost = ON.host;
  v.innerHTML = `
    <div class="on-head">🎟️ Sala <b class="on-code">${esc(ON.code)}</b>
      <button class="btn btn-small" id="onCopy">Copia</button></div>
    <div class="on-players">
      ${ON.players.map((p) => `<span class="on-chip${p.id === ON.me ? " me" : ""}">${p.id === ON.players[0].id ? "👑 " : ""}${esc(p.name)}${p.id === ON.me ? " (tu)" : ""}</span>`).join("")}
      ${Array.from({ length: ONLINE_MAX - ON.players.length }, () => `<span class="on-chip empty">+ lliure</span>`).join("")}
    </div>
    ${isHost ? `
      <div class="on-card">
        <div class="field-row"><label>Tema de la partida</label>
          <select id="onSection">
            <option value="mix">🎲 Barreja (totes les seccions)</option>
            ${SECTIONS.map((s) => `<option value="${s.id}">${s.ico} ${esc(s.title)}</option>`).join("")}
          </select></div>
        <button class="btn btn-primary" id="onStart" ${ON.players.length < 2 ? "disabled" : ""}>▶️ Comença (${ON.players.length}/${ONLINE_MAX})</button>
        <p class="on-note">${ON.players.length < 2 ? "Calen com a mínim 2 jugadors." : "Els rols canvien en cada fila: un escriu, el següent revisa amb chuleta."}</p>
      </div>`
      : `<div class="on-topic">🎵 Tema: <b>${esc(sectionLabel(ON.section))}</b><span class="on-note">El 👑 host tria el tema abans de començar.</span></div>
         <div class="wait-card">⏳ Esperant que <b>${esc(ON.players[0] ? ON.players[0].name : "el host")}</b> comenci la partida…</div>`}
    <button class="btn btn-ghost" id="onLeave">✕ Surt de la sala</button>`;
  const cp = $("onCopy");
  if (cp) cp.onclick = () => {
    try { navigator.clipboard.writeText(ON.code); ON.msg = "📋 Codi copiat!"; } catch (e) { ON.msg = "Copia el codi a mà."; }
    renderOnline();
  };
  const sel = $("onSection");
  if (sel) {
    sel.value = ON.section;
    sel.onchange = () => { ON.section = sel.value; hostLobby(); };
  }
  const st = $("onStart");
  if (st) st.onclick = () => onlineStart($("onSection").value);
  const lv = $("onLeave");
  if (lv) lv.onclick = () => leaveOnline();
}
function scoresBar() {
  return `<div class="on-scores">${ON.players.map((p) =>
    `<span class="on-chip score${p.id === ON.me ? " me" : ""}">${esc(p.name)} <b>${ON.scores[p.id] || 0}</b></span>`).join("")}</div>`;
}
/* La taula de la partida: només files JA completades (+ l'actual si toca escriure-hi) */
function onTableHTML(m, editing) {
  const labels = m.curLabels || (m.row ? m.row.cols.map((c) => c.label) : []);
  const done = m.done || [];
  const head = `<tr><th class="rt-h">Element</th>${labels.map((l) => `<th>${esc(l)}</th>`).join("")}</tr>`;
  const doneRows = done.map((d) => {
    const matches = d.cols.length === labels.length && d.cols.every((c, i) => c.label === labels[i]);
    const cells = d.cols.map((c) => {
      const cap = matches ? "" : `<span class="cap-lbl">${esc(c.label)}</span>`;
      const th = matches ? ` data-th="${esc(c.label)}"` : "";
      return `<td class="ans done"${th}>${cap}<span class="v">${esc(c.real)}</span></td>`;
    }).join("");
    const pad = Math.max(0, labels.length - d.cols.length);
    return `<tr class="done-row"><td class="row-t">${d.good ? "✅" : "❌"} ${esc(d.title)}</td>${cells}${`<td class="ans pad"></td>`.repeat(pad)}</tr>`;
  }).join("");
  let nowRow = "";
  if (editing && m.row) {
    nowRow = `<tr class="now-row"><td class="row-t">✍️ ${esc(m.row.title)}</td>${m.row.cols.map((c, i) =>
      `<td class="ans now" data-th="${esc(c.label)}"><input class="on-w" data-i="${i}" placeholder="…" autocomplete="off" aria-label="${esc(c.label)}"></td>`).join("")}</tr>`;
  }
  if (!doneRows && !nowRow) return "";
  return `<div class="on-tablewrap"><table class="on-table"><thead>${head}</thead><tbody>${doneRows}${nowRow}</tbody></table></div>`;
}
function renderOnPlay(v) {
  const m = ON.local;
  if (!m) { v.innerHTML = `<div class="wait-card">⏳ Connectant amb la partida…</div>`; return; }
  const turnInfo = `<div class="on-turn">Fila <b>${m.rowIdx + 1}/${m.total}</b> · ✍️ ${esc(pname(m.writerId))} escriu · 🔎 ${esc(pname(m.checkerId))} revisa</div>`;
  let body = "";
  if (m.you === "write") {
    body = `
      <div class="qcard on-play">
        <div class="q-kind">✍️ Torn d'escriure la taula</div>
        <div class="q-prompt">Completa a la taula la fila <b>${esc(m.row.title)}</b>:</div>
        <div class="q-body">${onTableHTML(m, true)}</div>
        <div class="q-actions"><button class="btn btn-primary" id="onPass">Passo-ho al revisor ➜</button></div>
      </div>
      <p class="on-note">La taula <b>només mostra les files ja completades</b> (i la que estàs completant ara); les de pendents s'hi afegeixen a mesura. No miris la chuleta! 💪</p>`;
  } else if (m.you === "check") {
    body = `
      <div class="qcard on-play">
        <div class="q-kind">🔎 Torn de revisar</div>
        <div class="q-prompt">Revisa el que ha escrit <b>${esc(pname(m.writerId))}</b>: <b>${esc(m.row.title)}</b></div>
        <div class="q-body">
          ${m.row.cols.map((c, i) => `
            <div class="duo-cmp"><div class="cmp-line"><span class="lbl">Hi deia ${esc(pname(m.writerId))}</span><div class="typed">${esc((m.typed || [])[i] || "—")}</div></div></div>`).join("")}
          <div class="chuleta">📝 <b>CHULETA</b> (el text real — el teu full de trucada)
            ${m.row.cols.map((c) => `<div class="ch-row"><span class="ch-lbl">${esc(c.label)}</span> ${esc(c.real)}</div>`).join("")}
          </div>
        </div>
        <div class="q-actions">
          <button class="btn btn-ok" id="onGood">👌 Ho dono per bona</button>
          <button class="btn btn-no" id="onBad">❌ És una fallada</button>
        </div>
      </div>`;
  } else if (m.you === "reveal") {
    body = `
      <div class="qcard on-play">
        <div class="q-kind">🔍 Revelació</div>
        <div class="q-prompt ${m.good ? "ok-t" : "bad-t"}">${m.good ? "✅ Donada per bona" : "❌ Fallada"} — <b>${esc(m.row.title)}</b></div>
        <div class="q-body">
          ${m.row.cols.map((c, i) => `
            <div class="duo-cmp">
              <div class="cmp-line"><span class="lbl">Hi deia ${esc(pname(m.writerId))}</span><div class="typed">${esc((m.typed || [])[i] || "—")}</div></div>
              <div class="cmp-line real"><span class="lbl">Text real</span><div>${esc(c.real)}</div></div>
              <span class="on-badge">${covBadge(m.cov[i])} ${Math.round(m.cov[i] * 100)}% del text real</span>
            </div>`).join("")}
          <div class="on-deltas">✍️ ${esc(pname(m.writerId))} <b>${m.deltaW ? "+" + m.deltaW : "+0"}</b> · 🔎 ${esc(pname(m.checkerId))} <b>${m.deltaC ? "+" + m.deltaC : "+0"}</b> ${m.good === m.autoGood ? "" : "· ⚠️ el veredicte no coincideix amb l'estimació automàtica"}</div>
        </div>
        <div class="q-actions">
          ${ON.host ? `<button class="btn btn-primary" id="onNext">${m.rowIdx + 1 >= m.total ? "🏁 Veure resultats" : "Següent fila ➜"}</button>`
                    : `<span class="on-note">Esperant que 👑 ${esc(ON.players[0] ? ON.players[0].name : "host")} passi d'fila…</span>`}
        </div>
      </div>`;
  } else {
    const writing = m.phase === "write";
    const tbl = onTableHTML(m, false);
    body = `
      <div class="wait-card big">
        <div class="wait-ico">${writing ? "✍️" : "🔎"}</div>
        <div>${writing ? `<b>${esc(pname(m.writerId))}</b> està completant la taula…` : `<b>${esc(pname(m.checkerId))}</b> està revisant amb la chuleta…`}</div>
        <div class="wait-dots"><span>●</span><span>●</span><span>●</span></div>
      </div>
      ${tbl ? `<div class="on-sub">🧮 Taula de la partida — ${m.done.length}/${m.total} completades</div>${tbl}` : ""}
      ${m.you === "wait-writer" ? `<p class="on-note">Ja has escrit la fila — ara et toca esperar el veredicte de ${esc(pname(m.checkerId))}.</p>` : ""}`;
  }
  v.innerHTML = `<div class="on-head small">🌐 Sala ${esc(ON.code)}</div>${scoresBar()}${turnInfo}${body}
    <div class="on-foot"><button class="btn btn-ghost" id="onLeave">✕ Surt</button></div>`;
  const pass = $("onPass");
  if (pass) pass.onclick = () => {
    const vals = [...v.querySelectorAll(".on-w")].map((inp) => inp.value);
    if (vals.every((x) => !x.trim())) { ON.msg = ""; alertHint(); return; }
    onPass(vals);
  };
  const gd = $("onGood"); if (gd) gd.onclick = () => onVerdict(true);
  const bd = $("onBad"); if (bd) bd.onclick = () => onVerdict(false);
  const nx = $("onNext"); if (nx) nx.onclick = () => hostNextRow();
  const lv = $("onLeave"); if (lv) lv.onclick = () => leaveOnline();
}
function alertHint() {
  const a = document.querySelector("#onView .on-note.warn");
  if (a) a.remove();
  const p = document.createElement("p");
  p.className = "on-note warn";
  p.textContent = "Escriu alguna cosa abans de passar-ho 🙂";
  const card = document.querySelector("#onView .on-play");
  if (card) card.after(p);
}
function renderOnOver(v) {
  const ranked = [...ON.players].sort((a, b) => (ON.scores[b.id] || 0) - (ON.scores[a.id] || 0));
  const top = ranked[0];
  const medals = ["🥇", "🥈", "🥉", "🏅"];
  v.innerHTML = `
    <div class="on-head">🏆 Fi de la partida</div>
    <div class="wait-card big"><div class="wait-ico">${medals[0]}</div>
      <div>Guanya <b>${esc(top ? top.name : "?")}</b> amb <b>${ON.scores[top ? top.id : ""] || 0}</b> punts!</div></div>
    <div class="podium">
      ${ranked.map((p, i) => `<div class="pod-row${p.id === ON.me ? " me" : ""}"><span>${medals[i] || "🏅"}</span><span class="p-name">${esc(p.name)}</span><b>${ON.scores[p.id] || 0}</b></div>`).join("")}
    </div>
    <div class="on-foot">
      ${ON.host ? `<button class="btn btn-primary" id="onAgain">🔄 Altra partida</button>` : ""}
      <button class="btn" id="onHome">🏠 Menú</button>
    </div>`;
  const ag = $("onAgain");
  if (ag) ag.onclick = () => { ON.phase = "lobby"; ON.xpDone = false; hostLobby(); };
  const hm = $("onHome"); if (hm) hm.onclick = () => leaveOnline();
}

/* ============ clavier ============ */
document.addEventListener("keydown", (e) => {
  if ($("screen-game").hidden) return;
  const q = cur();
  if (!q) return;
  if (q.tipus === "mc" && !R.graded && e.key >= "1" && e.key <= String(Math.min(9, q.options.length))) {
    answer(parseInt(e.key, 10) - 1);
    return;
  }
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (q.tipus === "flash" && !R.revealed && !R.graded) revealFlash();
    else if (q.tipus === "fields" && !R.graded) submitFields();
    else if (q.tipus === "order" && !R.graded) checkOrder();
    else if (R.graded) advance();
  }
});

/* ============ init ============ */
function init() {
  const c = $("fx");
  const size = () => { c.width = innerWidth; c.height = innerHeight; };
  size();
  addEventListener("resize", size);
  document.querySelectorAll(".mode-card").forEach((el) => {
    el.onclick = () => {
      sfx("click");
      if (el.dataset.mode === "online") openOnline();
      else startMode(el.dataset.mode);
    };
  });
  $("dueBtn").onclick = () => { sfx("click"); startMode("review"); };
  $("quitBtn").onclick = () => { clearTimers(); goBackAfterGame(); };
  $("logoBtn").onclick = () => { goHome(); };
  $("rHome").onclick = () => { goHome(); };
  $("rAgain").onclick = () => startMode(R.origin || "session", null, null, R.section);
  $("rRetry").onclick = () => startMode(
    "retry",
    shuffle(R.missed),
    "🔁 Torna a provar-les (" + new Set(R.missed.map((m) => m.id)).size + ")",
    R.section
  );
  $("sndBtn").onclick = () => { S.sound = !S.sound; save(); renderHud(); if (S.sound) sfx("click"); };
  $("resetBtn").onclick = () => {
    if (confirm("Segur? S'esborrarà tot: XP, estrelles, dominis i repàs espaiat.")) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    }
  };
  /* text del consell segons dispositiu */
  try {
    if (window.matchMedia && matchMedia("(pointer: coarse)").matches) {
      const h = document.querySelector("#screen-game .hint");
      if (h) h.textContent = "Toca la resposta correcta i després «Següent» per continuar";
    }
  } catch (e) {}
  renderHome();
  show("home");
}

/* = debugging/headless API = */
const G = {
  startMode, cur: () => cur(), score: () => R.score, hits: () => R.hits,
  hearts: () => R.hearts, missed: () => R.missed, state: () => R,
  section: () => R.section,
  openSection, sectionPct, sectionItemKeys, sectionOfKey, secDef,
  SECTIONS: () => SECTIONS,
  done: () => !$("screen-result").hidden,
  inGame: () => !$("screen-game").hidden,
  answer, revealFlash, gradeFlash, checkOrder, submitFields, advance,
  auto() {
    const q = cur(); if (!q || R.graded) return false;
    if (q.tipus === "mc") { answer(q.correct); return true; }
    if (q.tipus === "flash") { if (!R.revealed) { revealFlash(); return true; } gradeFlash(true); return true; }
    if (q.tipus === "order") { R.orderAns = [...q.seq]; renderOrder(q); R.orderAns = [...q.seq]; drawOrderZone(); checkOrder(); return true; }
    if (q.tipus === "fields") { submitFieldsFills(q); return true; }
    if (q.tipus === "match") { matchAuto(q); return true; }
    return false;
  },
  autoMistake() {
    const q = cur(); if (!q || R.graded) return false;
    if (q.tipus === "mc") { answer((q.correct + 1) % q.options.length); return true; }
    if (q.tipus === "flash") { if (!R.revealed) { revealFlash(); return true; } gradeFlash(false); return true; }
    return false;
  },
  dueKeys, starKeys, S: () => S,
  confetti: (n) => confetti(n),
  openOnline, onlineCreate, onlineJoin, onlineStart, leaveOnline, onPass, onVerdict,
  onHostNext: () => hostNextRow(),
  onState: () => ({
    phase: ON.phase, code: ON.code, players: ON.players, view: ON.view,
    local: ON.local, scores: ON.scores, msg: ON.msg, host: ON.host, me: ON.me,
    rows: ON.rows, section: ON.section, done: ON.done,
    turn: ON.turn ? { phase: ON.turn.phase, writerId: ON.turn.writerId, checkerId: ON.turn.checkerId } : null,
  }),
};
function submitFieldsFills(q) {
  const rows = $("qBody").querySelectorAll(".field-row");
  rows.forEach((row, i) => { row.querySelector("input").value = (q.fills && q.fills[i]) || "x"; });
  submitFields();
}
function matchAuto(q) {
  const L = $("mL").querySelectorAll(".mitem:not(.done)");
  const Rr = $("mR").querySelectorAll(".mitem:not(.done)");
  if (!L.length) return;
  const left = L[0];
  R.matchSel = left; left.classList.add("sel");
  const target = [...Rr].find((b) => b.dataset.pid === left.dataset.pid);
  if (target) selSide("R", target, target.dataset.pid);
}

if (typeof window !== "undefined") window.G = G;
if (typeof document !== "undefined" && document.getElementById && document.getElementById("screen-home")) init();
