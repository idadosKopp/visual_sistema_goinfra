// regioes_goias.js — Regiões de Planejamento de Goiás (IMB/SEGPLAN)
// Municípios do projeto GOINFRA classificados por região geográfica oficial

// ─────────────────────────────────────────────────────────────────
//  REGIÕES:
//  NORTE     → Porangatu / Chapada / GO-154 norte
//  NOROESTE  → Araguaia / Crixás / Mozarlândia / GO-164 norte
//  CENTRO    → Jaraguá / Goianésia / Ceres / GO-080 central
//  OESTE     → Cidade de Goiás / Iporá / Arenópolis / Britânia
//  SUDOESTE  → Jataí / Rio Verde / Mineiros / Chapadão do Céu
//  SUDESTE   → Quirinópolis / Santa Helena / Caçú / Paranaiguara
// ─────────────────────────────────────────────────────────────────

var REGIOES_GOIAS = {

    // ══════════════════════════════════════
    //  NORTE — GO-154 / Porangatu / Serras
    // ══════════════════════════════════════
    "NORTE": [
        "PORANGATU",
        "SANTA TEREZINHA DE GOIAS",
        "SANTA TEREZINHA DE GOIÁS",
        "SANTA TEREZINHA",
        "CAMPOS VERDES",
        "MUNDO NOVO",
        "NOVO PLANALTO",
        "ALTO HORIZONTE",
        "ITAPACI",
        "PILAR DE GOIAS",
        "PILAR DE GOIÁS",
        "BARRO ALTO",
        "FAINA"
    ],

    // ══════════════════════════════════════
    //  NOROESTE — GO-164 / Araguaia / Crixás
    // ══════════════════════════════════════
    "NOROESTE": [
        "SAO MIGUEL DO ARAGUAIA",
        "SÃO MIGUEL DO ARAGUAIA",
        "NOVA CRIXAS",
        "NOVA CRIXÁS",
        "CRIXAS",
        "CRIXÁS",
        "MOZARLANDIA",
        "MOZARLÂNDIA",
        "SANTA FE DE GOIAS",
        "SANTA FÉ DE GOIAS",
        "SANTA FE DE GOIÁS",
        "SANTA FÉ DE GOIÁS"
    ],

    // ══════════════════════════════════════
    //  CENTRO — GO-080 / Jaraguá / Ceres / Goianésia
    // ══════════════════════════════════════
    "CENTRO": [
        "JARAGUA",
        "JARAGUÁ",
        "GOIANESIA",
        "GOIANÉSIA",
        "URUANA",
        "CERES",
        "CARMO DO RIO VERDE",
        "ITAPURANGA",
        "DIORAMA",
        "ITABERAI",
        "ITABERAÍ",
        "GOIANIA",
        "GOIÂNIA",
        "ANAPOLIS",
        "ANÁPOLIS",
        "INHUMAS"
    ],

    // ══════════════════════════════════════
    //  OESTE — Cidade de Goiás / Iporá / Arenópolis / Britânia
    // ══════════════════════════════════════
    "OESTE": [
        "GOIAS",
        "GOIÁS",
        "CIDADE DE GOIAS",
        "CIDADE DE GOIÁS",
        "BRITANIA",
        "BRITÂNIA",
        "ARENOPOLIS",
        "ARENÓPOLIS",
        "IPORA",
        "IPORÁ",
        "AMORINOPOLIS",
        "AMORINÓPOLIS",
        "ITARUMA",
        "ITARUMÃ",
        "DOVERLANIDA",
        "DOVERLÂNDIA"
    ],

    // ══════════════════════════════════════
    //  SUDOESTE — Jataí / Rio Verde / Mineiros
    // ══════════════════════════════════════
    "SUDOESTE": [
        "JATAI",
        "JATAÍ",
        "RIO VERDE",
        "MINEIROS",
        "CHAPADAO DO CEU",
        "CHAPADÃO DO CÉU",
        "MONTIVIDIU",
        "MONTIVIDIÚ",
        "ITAJA",
        "ITAJÁ",
        "PEROLANDIA",
        "PEROLÂNDIA",
        "CAIAPONIA",
        "CAIAPÔNIA",
        "SAO SIMAO",
        "SÃO SIMÃO"
    ],

    // ══════════════════════════════════════
    //  SUDESTE — Quirinópolis / Santa Helena / Caçú
    // ══════════════════════════════════════
    "SUDESTE": [
        "QUIRINOPOLIS",
        "QUIRINÓPOLIS",
        "SANTA HELENA",
        "SANTA HELENA DE GOIAS",
        "SANTA HELENA DE GOIÁS",
        "PARANAIGUARA",
        "CACU",
        "CAÇÚ",
        "CACHOEIRA ALTA",
        "ITUMBIARA",
        "BURITI ALEGRE"
    ]
};

// ─────────────────────────────────────────────────────────────────
//  Cores e estilos por região
// ─────────────────────────────────────────────────────────────────
var COR_REGIAO = {
    "NORTE":    { badge: "badge-norte",    hex: "#00d084", emoji: "🟢" },
    "NOROESTE": { badge: "badge-noroeste", hex: "#00b4d8", emoji: "🔵" },
    "CENTRO":   { badge: "badge-centro",   hex: "#0078ff", emoji: "🔷" },
    "OESTE":    { badge: "badge-oeste",    hex: "#9b5de5", emoji: "🟣" },
    "SUDOESTE": { badge: "badge-sudoeste", hex: "#ff4757", emoji: "🔴" },
    "SUDESTE":  { badge: "badge-sudeste",  hex: "#ffd32a", emoji: "🟡" }
};

// ─────────────────────────────────────────────────────────────────
//  Remove acentos para comparação normalizada
// ─────────────────────────────────────────────────────────────────
function semAcento(str) {
    return String(str).toUpperCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─────────────────────────────────────────────────────────────────
//  obterRegiaoGoias(municipio)
//  Retorna a região do município ou null (fallback por latitude)
// ─────────────────────────────────────────────────────────────────
function obterRegiaoGoias(municipio) {
    if (!municipio) return null;
    var mun = semAcento(municipio);

    // 1º passe — match exato (sem acento)
    for (var regiao in REGIOES_GOIAS) {
        var cidades = REGIOES_GOIAS[regiao];
        for (var i = 0; i < cidades.length; i++) {
            if (semAcento(cidades[i]) === mun) return regiao;
        }
    }

    // 2º passe — match parcial
    for (var regiao in REGIOES_GOIAS) {
        var cidades = REGIOES_GOIAS[regiao];
        for (var i = 0; i < cidades.length; i++) {
            var cid = semAcento(cidades[i]);
            if (mun.indexOf(cid) !== -1 || cid.indexOf(mun) !== -1) return regiao;
        }
    }

    return null; // deixa mapa.js usar a latitude como fallback
}

// ─────────────────────────────────────────────────────────────────
//  estiloRegiao(regiao) — retorna {badge, hex, emoji}
// ─────────────────────────────────────────────────────────────────
function estiloRegiao(regiao) {
    return COR_REGIAO[regiao] || { badge: "badge-centro", hex: "#aaaaaa", emoji: "⚪" };
}