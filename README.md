# 🧬 BIOESTUDI · El joc de la memòria

Un joc per estudiar la **Biologia** de la Guia d'estudi: nivells d'organització, sals minerals,
vitamines i nutrients orgànics. Tècnica inclosa: **recorda sense mirar → comprova → repeteix**.

## Juga

Obre `index.html` (servit amb qualsevol servidor estàtic) o fes servir el servidor local:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

## Modes

| Mode | Què fa |
|------|--------|
| 🎒 **Sessió de 20 min** | Mapa → recuperació activa (flashcards) → explicació → mini test, barrejant els 4 blocs. |
| ⚡ **Missió ràpida** | 3 vides, 15 s per pregunta, combos x2/x3 i temps extra. |
| 🧪 **Parells explosius** | 3 rondes d'emparellar concepte ↔ funció/font/unitats amb comptador de temps. |
| 📝 **Mini test COMPROVA'T** | Les 10 preguntes oficials de l'última pàgina, amb resposta lliure i autocorrecció. |
| ⭐ **Repàs espaiat** | El que toca avui: mateix dia → 1 dia → 3 dies → 1 setmana. Els errors queden marcats ⭐. |
| 🎓 **Explica-ho a algú** | Flashcards per dir en veu alta `FUNCIÓ → DEFICIÈNCIA → 2 FONTS` (o `UNITATS → QUÈ FORMEN → FUNCIÓ`) i autoavaluar-te. |

## Contingut

- **BLOC 1** Nivells d'organització + propietats emergents
- **BLOC 2** Sals minerals (Ca, Mg, K, Na, P, ferro)
- **BLOC 3** Vitamines hidrosolubles (B1, B2, B5, B6, B9, B12, C) i liposolubles (KEDA)
- **BLOC 4** Nutrients orgànics (glúcids, proteïnes, greixos, àcids nucleics)

El progrés (XP, nivell, ratxa, % per bloc i repàs espaiat) es desa a `localStorage`.

## Tests

```bash
node test/headless.js   # requereix jsdom (npm i jsdom)
```

Recorre tots els modes, comprova puntuació, estrelles ⭐, repàs espaiat i la interacció real amb la UI (49 comprovacions).
