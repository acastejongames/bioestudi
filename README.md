# 🧬 BIOESTUDI · El joc de la memòria

🌐 **En línia:** https://acastejongames.github.io/bioestudi/

Un joc per estudiar la **Biologia** de la Guia d'estudi: nivells d'organització, sals minerals,
vitamines i nutrients orgànics. Tècnica inclosa: **recorda sense mirar → comprova → repeteix**.

## Juga

Obre `index.html` (servit amb qualsevol servidor estàtic) o fes servir el servidor local:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

## 📚 Seccions del temari

Cada secció té la **taula d'estudi completa** amb el mecanisme *tapa i recorda* (les columnes de resposta surten difuminades; toca una casella per revelar-la), el **truc** de memorització, les **confusions** a evitar, i partides **filtrades només amb preguntes d'aquell tema**:

| Secció | Contingut |
|--------|-----------|
| 🧬 **Nivells d'organització** | Àtom → … → bioma, propietat emergent · partida *Ordre & conceptes* |
| 🧂 **Sals minerals** | Ca, Mg, K, Na, P, ferro · funció → deficiència → 2 fonts |
| 💊 **Vitamines hidrosolubles** | B1, B2, B5, B6, B9, B12, C |
| ☀️ **Vitamines liposolubles** | KEDA (K, E, D, A) |
| 🌾 **Nutrients orgànics** | Unitats → què formen → funció |

## 🎮 Modes de joc

| Mode | Què fa |
|------|--------|
| 🎒 **Sessió de 20 min** | Mapa → recuperació activa (flashcards) → explicació → test, barrejant els 4 blocs (o tot d'una secció). |
| ⚡ **Missió ràpida** | 3 vides, 15 s per pregunta, combos x2/x3 i bonus de temps. |
| 🧪 **Parells explosius** | 3 rondes d'emparellar concepte ↔ funció/font/unitats amb comptador de temps. |
| 📝 **Mini test COMPROVA'T** | Les 10 preguntes oficials de l'última pàgina, amb resposta lliure i autocorrecció. |
| ⭐ **Repàs espaiat** | El que toca avui: mateix dia → 1 dia → 3 dies → 1 setmana. Els errors queden marcats ⭐. |
| 🎓 **Explica-ho a algú** | Flashcards per dir en veu alta `FUNCIÓ → DEFICIÈNCIA → 2 FONTS` (o `UNITATS → QUÈ FORMEN → FUNCIÓ`) i autoavaluar-te. |
| 🧩 **Ordre & conceptes** | Nivells d'organització: encadena les cadenes i els conceptes (secció 🧬). |
| 🌐 **Online · sala amb codi** | Partida en línia de 2–4 jugadors amb codi de sala: un escriu la taula, un altre revisa amb chuleta. |

## Contingut

- **BLOC 1** Nivells d'organització + propietats emergents
- **BLOC 2** Sals minerals (Ca, Mg, K, Na, P, ferro)
- **BLOC 3** Vitamines hidrosolubles (B1, B2, B5, B6, B9, B12, C) i liposolubles (KEDA)
- **BLOC 4** Nutrients orgànics (glúcids, proteïnes, greixos, àcids nucleics)

El progrés (XP, nivell, ratxa, % per secció i repàs espaiat) es desa a `localStorage`.

## 📱 Mòbil

Adaptat per a pantalles petites: les taules d'estudi es converteixen en **targetes apilades**, el HUD del joc queda **enganxat a dalt** (la barra superior s'oculta durant la partida), zones de toc ≥ 46 px, botons a mida de polze i consells pensats per a pantalla tàctil.

## 🌐 Multijugador en línia

La targeta **Online · sala amb codi** obre una sala multijugador **en línia** (sense servidor propi: PeerJS/WebRTC):

- **Codis de sala de 6 caràcters** generats criptogràficament; abans d'usar-lo es comprova que no existeixi i s'eviten els codis recents de la sessió → **el codi no es pot repetir**.
- **Tema triable**: en crear la sala (i editable a la lobby abans de començar) s'escull el tema — 🧬 Nivells d'organització, 🧂 Sals minerals, 💊/☀️ Vitamines, 🌾 Nutrients o 🎲 barreja — i tota la sala el ve.
- **Files i columnes per separat (estil impressió)**: el host pot restringir què es respon amb dos camps independents — `1-4` = de l'1 a la 4 (rang), `1,4` = només la 1 i la 4 (llista), `1-2,4` combinat; buit o res vàlid = totes. Els números corresponen a les files i columnes de la taula de la secció (es mostra la llegenda numerada a la lobby; amb 🎲 Barreja s'oculta, perquè no hi ha una única taula).
- **Fins a 4 jugadors**: tothom entra amb el mateix codi (màxim 4; el 5è rep «Sala plena»).
- En cada fila els rols giren: un **escriu dins la taula** — la mateixa taula de la secció, que **només mostra les files ja completades** (amb el text real i ✅/❌) i la fila actual en curs; el següent **revisa amb la chuleta** (el text real al costat) i decideix 👌 bona / ❌ fallada.
- Després del veredicte — **bo o dolent** — es revela el **text real** al costat del que s'havia escrit, amb el % de cobertura, per a tots els jugadors.
- Puntuació: escriptor correcte **+100**, revisor coherent amb l'estimació automàtica **+60**; XP final = punts/10. Si algú marxa, la sala es tanca avisant a la resta.

## 🎨 Disseny

Identitat visual pròpia "tinta verda": fons verd fosc amb trama de punts subtil, títols amb la tipografia display **Fraunces** (serif editorial), paleta de molsa, ori i terracota (sense neons ni degradats genèrics), iconografia **SVG monoline** coherent (cap emoji decoratiu a les graelles), botons i targetes amb estats clars de hover/tacte, focus visible per a teclat i `prefers-reduced-motion` respectat. En mòbil: taules→targetes, HUD enganxat, inputs a 16 px (sense zoom iOS) i zona segura `env(safe-area-inset)`.

## 🌍 Publicació (GitHub Pages)

El lloc està preparat per a GitHub Pages: fitxers estàtics a l'arrel, `.nojekyll` present i **rutes relatives** (funciona sota `https://acastejongames.github.io/bioestudi/`).

Fonts de desplegament: branca `arena/062a1875-bioestudi` → arrel (`/`).

## Tests

```bash
node test/headless.js   # requereix jsdom (npm i jsdom)
```

Recorre tots els modes i seccions, comprova puntuació, estrelles ⭐, repàs espaiat, taules de secció, filtratge de preguntes per secció, **absència de preguntes repetides dins de cada partida**, l'estructura mòbil (`data-th`, `data-screen`, `.game-top`), la interacció real amb la UI i **tot el flux multijugador en línia** (codis únis, sala de 4, tema triable, rangs de files/columnes, taula viva anti-spoiler, chuleta, revelació i puntuació) amb un PeerJS simulat multiclient (**188 comprovacions**).
