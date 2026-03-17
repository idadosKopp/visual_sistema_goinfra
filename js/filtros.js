// filtros.js — versão corrigida e sincronizada

// ETAPAS: mapeamento nome → coluna Excel
var ETAPAS = {
    'Furação':        'FURACAO_REALIZADO',
    'Fixação':        'FIXACAO_POSTES_REALIZADO',
    'Estruturas':     'ESTRUTURAS_REALIZADO',
    'Travessia':      'TRAVESSIA_INTERLIGACAO_REALIZADO',
    'Sin. Aérea':     '_SIN_AEREA',
    'Sin. Terrestre': '_SIN_TERRESTRE',
    'Montagem':       'MONTAGEM_REALIZADO',
    'Mont. Estr.':    'MONTAGEM_ESTRUTURAL_REALIZADO',
    'Aferição':       'AFERICAO_REALIZADO'
};

var COLS_SIN_AEREA     = ['SINALIZACAO_AEREA_BASE_REALIZADO','SINALIZACAO_AEREA_ICAMENTO_REALIZADO'];
var COLS_SIN_TERRESTRE = ['SINALIZACAO_TERRESTRE_FIZACAO_REALIZADO','SINALIZACAO_TERRESTRE_CONCRETAGEM_REALIZADO'];

// Mont. Estr. é N/A quando vazio no Excel
function montEstrutNaoSeAplica(d) {
    var val = d['MONTAGEM_ESTRUTURAL_REALIZADO'];
    return val === undefined || val === null || String(val).trim() === '';
}

// Injeta campos virtuais de sinalização
function injetarVirtuales(lista) {
    lista.forEach(function(d) {
        var aerOk = COLS_SIN_AEREA.filter(function(c) { return c in d; });
        d._SIN_AEREA = aerOk.length > 0 && aerOk.every(function(c) { return !!d[c]; });

        var terOk = COLS_SIN_TERRESTRE.filter(function(c) { return c in d; });
        d._SIN_TERRESTRE = terOk.length > 0 && terOk.every(function(c) { return !!d[c]; });
    });
}

function isOnline(d) {
    return String(d.ONLINE || '').toUpperCase().trim() === 'ONLINE';
}

function etapaConcluida(d, col) {
    if (col === '_SIN_AEREA')     return !!d._SIN_AEREA;
    if (col === '_SIN_TERRESTRE') return !!d._SIN_TERRESTRE;
    return !!d[col];
}

// Concluído = todas as etapas OK (Mont.Estr. N/A não bloqueia)
function isConcluido(d) {
    var etapasCols = Object.values(ETAPAS);
    for (var i = 0; i < etapasCols.length; i++) {
        var col = etapasCols[i];
        if (col === 'MONTAGEM_ESTRUTURAL_REALIZADO' && montEstrutNaoSeAplica(d)) continue;
        if (!etapaConcluida(d, col)) return false;
    }
    return true;
}

// ---- Ponto de entrada chamado pelo carregar_excel.js ----
function inicializarPagina(dadosCarregados) {
    dados = dadosCarregados; // usa a var global 'dados' de carregar_excel.js
    injetarVirtuales(dados);
    preencherSelects();
    atualizarDashboard(dados);
    renderizarTabela(dados);
    configurarBusca();
}

// ---- Selects ----
function preencherSelects() {
    preencherSelectOpts('filtroNI', 'nis');
    preencherSelectOpts('filtroEquipeCivil', 'Equipe_civil');
    preencherSelectOpts('filtroEquipeEletro', 'Equipe_eletronica');

    var ids = ['filtroNI','filtroEquipeCivil','filtroEquipeEletro','filtroEnergia','filtroStatus'];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', aplicarFiltros);
    });
}

function preencherSelectOpts(id, campo) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var vals = [];
    dados.forEach(function(d) {
        var v = d[campo];
        if (v && vals.indexOf(v) === -1) vals.push(v);
    });
    vals.sort();
    sel.innerHTML = '<option value="">Todos</option>';
    vals.forEach(function(v) {
        var o = document.createElement('option');
        o.value = v; o.textContent = v;
        sel.appendChild(o);
    });
}

function configurarBusca() {
    var b = document.getElementById('busca');
    if (b) b.addEventListener('input', aplicarFiltros);
}

function limparFiltros() {
    ['filtroNI','filtroEquipeCivil','filtroEquipeEletro','filtroEnergia','filtroStatus'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var b = document.getElementById('busca');
    if (b) b.value = '';
    aplicarFiltros();
}

// ---- Filtrar ----
function aplicarFiltros() {
    var ni     = (document.getElementById('filtroNI')          || {}).value || '';
    var civil  = (document.getElementById('filtroEquipeCivil') || {}).value || '';
    var eletro = (document.getElementById('filtroEquipeEletro')|| {}).value || '';
    var energ  = (document.getElementById('filtroEnergia')     || {}).value || '';
    var status = (document.getElementById('filtroStatus')      || {}).value || '';
    var busca  = ((document.getElementById('busca') || {}).value || '').toLowerCase().trim();

    var filtrado = dados.filter(function(d) {
        if (ni    && String(d.nis) !== ni) return false;
        if (civil && d.Equipe_civil !== civil) return false;
        if (eletro&& d.Equipe_eletronica !== eletro) return false;
        if (energ && String(d.ENERGIZACAO||'').toUpperCase().trim() !== energ) return false;
        if (status === 'CONCLUIDO' && !isConcluido(d)) return false;
        if (status === 'PENDENTE'  &&  isConcluido(d)) return false;
        if (busca) {
            var txt = [d.nis, d.ID_Equip, d.municipio, d.rodovia].join(' ').toLowerCase();
            if (txt.indexOf(busca) === -1) return false;
        }
        return true;
    });

    renderizarTabela(filtrado);
    atualizarDashboard(filtrado);
}

// ---- Dashboard ----
function atualizarDashboard(lista) {
    var total      = lista.length;
    var online     = lista.filter(function(d) { return isOnline(d); }).length;
    var solar        = lista.filter(function(d) { return String(d.ENERGIZACAO||'').toUpperCase().trim() === 'SOLAR'; }).length;
    var convencional = lista.filter(function(d) { return String(d.ENERGIZACAO||'').toUpperCase().trim() === 'CONVENCIONAL'; }).length;
    var concluidos = lista.filter(function(d) { return isConcluido(d); }).length;
    var pendentes  = total - concluidos;

    setCard('cardTotal',      total);
    setCard('cardOnline',     online);
    setCard('cardSolar',        solar);
    setCard('cardConvencional', convencional);
    setCard('cardPendentes',  pendentes);
    setCard('cardConcluidos', concluidos);

    // Barras de progresso
    var etapasEntries = Object.keys(ETAPAS).map(function(k) { return [k, ETAPAS[k]]; });
    etapasEntries.forEach(function(entry) {
        var col  = entry[1];
        var base = total;
        if (col === 'MONTAGEM_ESTRUTURAL_REALIZADO') {
            base = lista.filter(function(d) { return !montEstrutNaoSeAplica(d); }).length;
        }
        var ok  = lista.filter(function(d) { return etapaConcluida(d, col); }).length;
        var pct = base > 0 ? Math.round((ok / base) * 100) : 0;

        var key     = col.replace(/[^a-zA-Z0-9]/g, '_');
        var fillEl  = document.getElementById('bar_' + key);
        var pctEl   = document.getElementById('pct_' + key);
        if (fillEl) fillEl.style.width = pct + '%';
        if (pctEl)  pctEl.textContent  = pct + '%';
    });

    var countEl = document.getElementById('tabelaCount');
    if (countEl) countEl.textContent = total + ' registros';
}

function setCard(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ---- Tabela ----
function renderizarTabela(lista) {
    var tbody = document.querySelector('#tabelaCronograma tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;padding:30px;color:var(--text-muted);">Nenhum resultado encontrado.</td></tr>';
        return;
    }

    lista.forEach(function(d) {
        var badgeO    = isOnline(d) ? 'badge-online' : 'badge-offline';
        var concluido = isConcluido(d);
        var rowStyle  = concluido ? 'background:rgba(0,208,132,0.04);' : '';

        var etapasHtml = '';
        Object.keys(ETAPAS).forEach(function(nome) {
            var col = ETAPAS[nome];
            if (col === 'MONTAGEM_ESTRUTURAL_REALIZADO' && montEstrutNaoSeAplica(d)) {
                etapasHtml += '<td style="text-align:center;"><span style="font-size:10px;color:rgba(232,237,245,0.2);font-weight:500;">N/A</span></td>';
                return;
            }
            var ok = etapaConcluida(d, col);
            etapasHtml += '<td style="text-align:center;"><span class="' + (ok ? 'etapa-ok' : 'etapa-no') + '">' + (ok ? '✓' : '—') + '</span></td>';
        });

        var situacaoHtml = concluido
            ? '<span style="background:rgba(0,208,132,0.15);color:#00d084;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;">✓ OK</span>'
            : '<span style="background:rgba(255,71,87,0.12);color:#ff4757;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;">⏳</span>';

        tbody.innerHTML +=
            '<tr style="' + rowStyle + '">' +
            '<td><strong>' + (d.nis||'—') + '</strong></td>' +
            '<td>' + (d.ID_Equip||'—') + '</td>' +
            '<td>' + (d.municipio||'—') + '</td>' +
            '<td>' + (d.ENERGIZACAO||'—') + '</td>' +
            '<td><span class="badge ' + badgeO + '">' + (d.ONLINE||'—') + '</span></td>' +
            '<td>' + (d.Equipe_civil||'—') + '</td>' +
            '<td>' + (d.Equipe_eletronica||'—') + '</td>' +
            etapasHtml +
            '<td style="text-align:center;">' + situacaoHtml + '</td>' +
            '</tr>';
    });
}
