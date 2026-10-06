/* BIOESTUDI — dades de l'assignatura (font: Guia d'estudi) */

const BIO = {
  nivells: ["Àtom", "Molècula", "Orgànul", "Cèl·lula", "Teixit", "Òrgan", "Aparell",
    "Organisme", "Població", "Ecosistema", "Bioma"],

  propietatEmergent: "Característica nova que apareix quan les parts s'organitzen i interactuen; no es troben en les parts aïllades per separat. Exemple: la vida apareix a nivell cel·lular.",

  minerals: [
    { id: "ca", nom: "Calci", funcio: "Ossos i funció del sistema nerviós.", def: "Osteoporosi, osteomalàcia o raquitisme.", fonts: ["Lactis i derivats", "Peix blau"] },
    { id: "mg", nom: "Magnesi", funcio: "Metabolisme energètic; músculs i nervis.", def: "Rampes/tremolors, arrítmia o convulsions.", fonts: ["Fruits secs", "Llegums"] },
    { id: "k", nom: "Potassi", funcio: "Equilibri hídric; músculs i nervis.", def: "Arrítmies, restrenyiment o convulsions.", fonts: ["Plàtan", "Patata (tubercle)"] },
    { id: "na", nom: "Sodi", funcio: "Equilibri de fluids; funció nerviosa i muscular.", def: "Hiponatrèmia, nàusees o confusió.", fonts: ["Sal de taula", "Embotits/processats"] },
    { id: "p", nom: "Fòsfor", funcio: "Ossos i funció energètica.", def: "Debilitat òssia, dolor o alteracions neuromusculars.", fonts: ["Carn magra", "Peix blau"] },
    { id: "fe", nom: "Ferro", funcio: "Transport d'oxigen; funció immunitària.", def: "Anèmia, pal·lidesa o falta d'alè.", fonts: ["Carn magra", "Llegums"] },
  ],

  hidro: [
    { id: "b1", nom: "Vitamina B1", funcio: "Energia; funció cardíaca, nerviosa i muscular.", def: "Beriberi.", fonts: ["Carn magra", "Cereals integrals"] },
    { id: "b2", nom: "Vitamina B2", funcio: "Energia, antioxidant i formació d'eritròcits.", def: "Ariboflavinosi.", fonts: ["Lactis", "Ous"] },
    { id: "b5", nom: "Vitamina B5 · àcid pantotènic", funcio: "Metabolisme energètic, greixos, hormones i hemoglobina.", def: "No indicada als apunts.", fonts: ["Vísceres (fetge)", "Bolets"] },
    { id: "b6", nom: "Vitamina B6", funcio: "Metabolisme de proteïnes; neurotransmissors i cèl·lules sanguínies.", def: "Anèmia microcítica, dermatitis o debilitat immunitària.", fonts: ["Peix blau", "Llegums"] },
    { id: "b9", nom: "Vitamina B9 · àcid fòlic", funcio: "ADN, eritròcits, funció cardiovascular i desenvolupament embrionari.", def: "Anèmia megaloblàstica.", fonts: ["Verdures verdes", "Llegums"] },
    { id: "b12", nom: "Vitamina B12", funcio: "Eritròcits, ADN i funcions nerviosa i cardiovascular.", def: "Anèmia i danys neurològics.", fonts: ["Mol·luscs", "Peix blau"] },
    { id: "c", nom: "Vitamina C", funcio: "Col·lagen, antioxidant, cicatrització i absorció del ferro.", def: "Escorbut.", fonts: ["Cítrics", "Crucíferes (p. ex. bròcoli)"] },
  ],

  lipo: [
    { id: "kk", nom: "Vitamina K", funcio: "Coagulació; manteniment ossi i cardiovascular.", def: "Hemorràgies i hematomes.", fonts: ["Verdures verdes", "Olis"] },
    { id: "e", nom: "Vitamina E", funcio: "Antioxidant; pell i sistema immunitari.", def: "Danys neurològics, anèmia o immunodeficiència.", fonts: ["Olis vegetals", "Fruits secs"] },
    { id: "d", nom: "Vitamina D", funcio: "Absorció de calci i fòsfor; salut òssia, dental i muscular.", def: "Raquitisme, osteoporosi o osteomalàcia.", fonts: ["Oli de fetge de bacallà", "Llum solar (no és un aliment)"] },
    { id: "a", nom: "Vitamina A", funcio: "Visió, pell i mucoses; immunitat, creixement i reproducció.", def: "Xeroftàlmia.", fonts: ["Fruites RYO (vermelles/grogues/taronges)", "Fetge"] },
  ],

  nutrients: [
    { id: "gl", nom: "Glúcids / hidrats de carboni", unitats: "Monosacàrids (glucosa, fructosa)", formen: "polisacàrids", resumUnitats: "Monosacàrids (glucosa, fructosa) → polisacàrids", funcio: "Funció energètica." },
    { id: "pr", nom: "Proteïnes", unitats: "Aminoàcids", formen: "proteïnes (p. ex. col·lagen, hemoglobina)", resumUnitats: "Aminoàcids → proteïnes (p. ex. col·lagen, hemoglobina)", funcio: "Síntesi de teixits i eritròcits." },
    { id: "gr", nom: "Greixos", unitats: "Àcids grassos + glicerol", formen: "triglicèrids", resumUnitats: "Àcids grassos + glicerol → triglicèrids", funcio: "Reserva d'energia i absorció de vitamines." },
    { id: "an", nom: "Àcids nucleics", unitats: "Nucleòtids", formen: "ADN", resumUnitats: "Nucleòtids → ADN", funcio: "Informació i regulació genètica." },
  ],

  resumNutrients: "Glúcids = energia immediata · proteïnes = construir · greixos = reserva · àcids nucleics = informació genètica.",

  trucs: {
    minerals: "Ca + P = ossos · Mg + potassi = músculs/nervis · sodi = fluids · ferro = oxigen.",
    hidro: "B1–B2–B5 van lligades al metabolisme energètic; B9 i B12 connecten amb ADN i eritròcits; C amb col·lagen i ferro.",
    lipo: "KEDA: K = coagulació · E = antioxidant · D = calci/fòsfor i ossos · A = visió.",
    nutrients: "Unitat bàsica → molècula → funció.",
  },

  confusions: [
    "Potassi (mineral) ≠ vitamina K. Quan vegis «K», fixa't si parla de potassi o de vitamina K.",
    "Ferro → hemoglobina i transport d'oxigen; la manca pot causar anèmia.",
    "La llum solar ajuda a sintetitzar vitamina D, però no és un aliment.",
  ],
};

/* Mini test oficial "COMPROVA'T" — 10 preguntes */
const TEST = [
  {
    id: "t1", tipus: "order", block: "organitzacio", items: ["org:nivells"],
    prompt: "Escriu els nivells d'organització des de l'àtom fins al bioma.",
    info: BIO.nivells.join(" → "),
  },
  {
    id: "t2", tipus: "mc", block: "organitzacio", items: ["org:emergent"],
    prompt: "Què és una propietat emergent?",
    correct: "Característica nova que apareix quan les parts s'organitzen i interactuen; no es troba a les parts aïllades.",
    options: [
      "Característica nova que apareix quan les parts s'organitzen i interactuen; no es troba a les parts aïllades.",
      "És la suma simple de totes les propietats de cada part per separat.",
      "Una funció que només tenen els organismes més grans, com els aparells.",
      "El nivell d'organització més alt: l'ecosistema sencer.",
    ],
    info: BIO.propietatEmergent,
  },
  {
    id: "t3", tipus: "fields", block: "minerals", items: ["mineral:fe"],
    prompt: "Quin mineral transporta oxigen? Digues una conseqüència de la seva manca i dues fonts.",
    fields: [
      { label: "Mineral", ph: "…", need: [/ferro/] },
      { label: "Conseqüència de la manca", ph: "…", need: [/(anemia|pallidesa|falta d al)/] },
      { label: "Dues fonts", ph: "… i …", need: [/(carn)/, /(llegum)/] },
    ],
    fills: ["ferro", "anèmia", "carn magra i llegums"],
    info: "Ferro · anèmia/pal·lidesa/falta d'alè · carn magra i llegums.",
  },
  {
    id: "t4", tipus: "mc", block: "vitamines", items: ["vit:b9", "vit:b12"],
    prompt: "Quines dues vitamines relacionaries amb ADN i eritròcits?",
    correct: "B9 (àcid fòlic) i B12",
    options: ["B9 (àcid fòlic) i B12", "B1 i B6", "Vitamina C i vitamina E", "B2 i B5"],
    info: "Diferència: B9 → anèmia megaloblàstica; B12 → anèmia i danys neurològics.",
  },
  {
    id: "t5", tipus: "fields", block: "vitamines", items: ["vit:c"],
    prompt: "Quina vitamina associarem amb col·lagen, cicatrització i absorció de ferro? Quina malaltia pot causar-ne la manca?",
    fields: [
      { label: "Vitamina", ph: "…", need: [/(^c$|vitamina c)/] },
      { label: "Malaltia", ph: "…", need: [/escorbut/] },
    ],
    fills: ["vitamina C", "escorbut"],
    info: "Vitamina C · escorbut.",
  },
  {
    id: "t6", tipus: "match", block: "vitamines", items: ["vit:kk", "vit:e", "vit:d", "vit:a"],
    prompt: "Digues KEDA de memòria i una funció principal de cada vitamina.",
    pairs: [
      ["K", "Coagulació"],
      ["E", "Antioxidant"],
      ["D", "Absorció de calci/fòsfor i ossos"],
      ["A", "Visió"],
    ],
    info: "K: coagulació · E: antioxidant · D: absorció Ca/P i ossos · A: visió.",
  },
  {
    id: "t7", tipus: "fields", block: "nutrients", items: ["nutrient:pr", "nutrient:gr"],
    prompt: "Quines unitats formen les proteïnes? I quines formen els triglicèrids?",
    fields: [
      { label: "Unitats de les proteïnes", ph: "…", need: [/aminoacid/] },
      { label: "Unitats dels triglicèrids", ph: "… i …", need: [/acid/, /grass/, /glicerol/] },
    ],
    fills: ["aminoàcids", "àcids grassos i glicerol"],
    info: "Aminoàcids · àcids grassos + glicerol.",
  },
  {
    id: "t8", tipus: "mc", block: "nutrients", items: ["nutrient:gr"],
    prompt: "Quin nutrient serveix sobretot de reserva energètica i ajuda a absorbir vitamines?",
    correct: "Greixos",
    options: ["Greixos", "Glúcids", "Proteïnes", "Àcids nucleics"],
    info: BIO.resumNutrients,
  },
  {
    id: "t9", tipus: "fields", block: "nutrients", items: ["mineral:ca", "vit:b9"],
    prompt: "Digues dues fonts clau de calci i dues de vitamina B9.",
    fields: [
      { label: "Fonts de calci", ph: "… i …", need: [/lacti/, /peix/] },
      { label: "Fonts de vitamina B9", ph: "… i …", need: [/(verdures? verdes|verdura)/, /llegum/] },
    ],
    fills: ["lactis i peix blau", "verdures verdes i llegums"],
    info: "Calci: lactis i peix blau · B9: verdures verdes i llegums.",
  },
  {
    id: "t10", tipus: "mc", block: "organitzacio", items: ["mineral:k", "vit:kk"],
    prompt: "Quina diferència hi ha entre el potassi i la vitamina K?",
    correct: "El potassi és una sal mineral (equilibri hídric i funció muscular/nerviosa); la vitamina K és liposoluble i participa en la coagulació.",
    options: [
      "El potassi és una sal mineral (equilibri hídric i funció muscular/nerviosa); la vitamina K és liposoluble i participa en la coagulació.",
      "Són el mateix: la «K» de la vitamina K ve de potassi (kalium).",
      "El potassi participa en la coagulació; la vitamina K regula els fluids corporals.",
      "La vitamina K és un mineral per als ossos; el potassi és una vitamina hidrosoluble.",
    ],
    info: "Potassi = mineral de fluids/músculs-nervis · Vitamina K = liposoluble de la coagulació.",
  },
];
