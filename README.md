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

## Contingut

- **BLOC 1** Nivells d'organització + propietats emergents
- **BLOC 2** Sals minerals (Ca, Mg, K, Na, P, ferro)
- **BLOC 3** Vitamines hidrosolubles (B1, B2, B5, B6, B9, B12, C) i liposolubles (KEDA)
- **BLOC 4** Nutrients orgànics (glúcids, proteïnes, greixos, àcids nucleics)

El progrés (XP, nivell, ratxa, % per secció i repàs espaiat) es desa a `localStorage`.

## 🌍 Publicació (GitHub Pages)

El lloc està preparat per a GitHub Pages: fitxers estàtics a l'arrel, `.nojekyll` present i **rutes relatives** (funciona sota `https://acastejongames.github.io/bioestudi/`).

Fonts de desplegament: branca `arena/062a1875-bioestudi` → arrel (`/`).

## Tests

```bash
node test/headless.js   # requereix jsdom (npm i jsdom)
```

Recorre tots els modes i seccions, comprova puntuació, estrelles ⭐, repàs espaiat, taules de secció, filtratge de preguntes per secció, **absència de preguntes repetides dins de cada partida** i la interacció real amb la UI (**107 comprovacions**).
