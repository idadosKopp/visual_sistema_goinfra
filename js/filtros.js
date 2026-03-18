// filtros.js

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

// Detecta coluna pelo nome — busca match exato ou parcial case-insensitive
function detectarCol(chaves, buscas) {
    for (var i = 0; i < buscas.length; i++) {
        var b = buscas[i].toLowerCase().trim();
        for (var j = 0; j < chaves.length; j++) {
            if (chaves[j].toLowerCase().trim() === b) return chaves[j];
        }
    }
    // Segunda passagem: match parcial
    for (var i = 0; i < buscas.length; i++) {
        var b = buscas[i].toLowerCase().trim();
        for (var j = 0; j < chaves.length; j++) {
            if (chaves[j].toLowerCase().indexOf(b) !== -1) return chaves[j];
        }
    }
    return null;
}

var colSinAereaBase = null;
var colSinAereaIcam = null;
var colSinTerFiz    = null;
var colSinTerConc   = null;
var colPrazo        = null;

function detectarColunasSin(primeiraLinha) {
    var chaves = Object.keys(primeiraLinha);

    colSinAereaBase = detectarCol(chaves, [
        'SINALIZACAO_AEREA_BASE_REALIZADO',
        'sinalizacao_aerea_base_realizado',
        'SINALIZACAO AEREA base realizado'
    ]);
    colSinAereaIcam = detectarCol(chaves, [
        'SINALIZACAO_AEREA_ICAMENTO_REALIZADO',
        'sinalizacao_aerea_icamento_realizado',
        'SINALIZACAO AEREA içamento realizado'
    ]);
    // TERRESTRE FIZACAO — vem ANTES do projetado no seu Excel
    colSinTerFiz = detectarCol(chaves, [
        'SINALIZACAO_TERRESTRE_FIZACAO_REALIZADO',
        'sinalizacao_terrestre_fizacao_realizado',
        'SINALIZACAO terrestre realizado'
    ]);
    // TERRESTRE CONCRETAGEM — última coluna terrestre
    colSinTerConc = detectarCol(chaves, [
        'SINALIZACAO_TERRESTRE_CONCRETAGEM_REALIZADO',
        'sinalizacao_terrestre_concretagem_realizado',
        'SINALIZACAO_TERRESTRE_CONCRETAGEM_REALIZAD'
    ]);

    colPrazo = detectarCol(chaves, [
        'Prazo_de_Instalacao','Prazo_Instalacao',
        'Prazo Máx Instalação','prazo_instalacao',
        'PRAZO_INSTALACAO'
    ]);

    console.log('── Colunas Sinalização detectadas ──');
    console.log('Aérea BASE:    ', colSinAereaBase);
    console.log('Aérea IÇAMENTO:', colSinAereaIcam);
    console.log('Terr. FIZACAO: ', colSinTerFiz);
    console.log('Terr. CONCRET.:', colSinTerConc);
    console.log('Prazo:         ', colPrazo);
    console.log('────────────────────────────────────');
}

function montEstrutNaoSeAplica(d) {
    var val = d['MONTAGEM_ESTRUTURAL_REALIZADO'];
    return val === undefined || val === null || String(val).trim() === '';
}

function temValor(d, col) {
    if (!col) return false;
    var v = d[col];
    if (v === undefined || v === null) return false;
    return String(v).trim() !== '';
}

function injetarVirtuales(lista) {
    if (lista.length > 0) detectarColunasSin(lista[0]);

    lista.forEach(function(d) {
        // Sin. Aérea: BASE **E** IÇAMENTO ambos realizados
        d._SIN_AEREA = temValor(d, colSinAereaBase) && temValor(d, colSinAereaIcam);

        // Sin. Terrestre: FIZACAO **E** CONCRETAGEM ambos realizados
        d._SIN_TERRESTRE = temValor(d, colSinTerFiz) && temValor(d, colSinTerConc);
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

function isConcluido(d) {
    var etapasCols = Object.values(ETAPAS);
    for (var i = 0; i < etapasCols.length; i++) {
        var col = etapasCols[i];
        if (col === 'MONTAGEM_ESTRUTURAL_REALIZADO' && montEstrutNaoSeAplica(d)) continue;
        if (!etapaConcluida(d, col)) return false;
    }
    return true;
}

function inicializarPagina(dadosCarregados) {
    dados = dadosCarregados;
    injetarVirtuales(dados);
    preencherSelects();
    atualizarDashboard(dados);
    renderizarTabela(dados);
    configurarBusca();
}

function preencherSelects() {
    preencherSelectOpts('filtroNI', 'nis');
    preencherSelectOpts('filtroEquipeCivil', 'Equipe_civil');
    preencherSelectOpts('filtroEquipeEletro', 'Equipe_eletronica');
    ['filtroNI','filtroEquipeCivil','filtroEquipeEletro','filtroEnergia','filtroStatus','filtroOnline'].forEach(function(id) {
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
    ['filtroNI','filtroEquipeCivil','filtroEquipeEletro','filtroEnergia','filtroStatus','filtroOnline'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = '';
    });
    var b = document.getElementById('busca'); if (b) b.value = '';
    aplicarFiltros();
}

function aplicarFiltros() {
    var ni     = (document.getElementById('filtroNI')           || {}).value || '';
    var civil  = (document.getElementById('filtroEquipeCivil')  || {}).value || '';
    var eletro = (document.getElementById('filtroEquipeEletro') || {}).value || '';
    var energ  = (document.getElementById('filtroEnergia')      || {}).value || '';
    var status = (document.getElementById('filtroStatus')       || {}).value || '';
    var online = (document.getElementById('filtroOnline')       || {}).value || '';
    var busca  = ((document.getElementById('busca') || {}).value || '').toLowerCase().trim();

    var filtrado = dados.filter(function(d) {
        if (ni    && String(d.nis) !== ni)                                         return false;
        if (civil && d.Equipe_civil !== civil)                                     return false;
        if (eletro&& d.Equipe_eletronica !== eletro)                              return false;
        if (energ && String(d.ENERGIZACAO||'').toUpperCase().trim() !== energ)    return false;
        if (status === 'CONCLUIDO' && !isConcluido(d))                            return false;
        if (status === 'PENDENTE'  &&  isConcluido(d))                            return false;
        if (online) {
            var onlineVal = String(d.ONLINE||'').toUpperCase().trim();
            if (online === 'ONLINE'  && onlineVal !== 'ONLINE')  return false;
            if (online === 'OFFLINE' && (onlineVal === 'ONLINE' || onlineVal === '')) return false;
            if (online === 'BRANCO'  && onlineVal !== '')         return false;
        }
        if (busca) {
            var txt = [d.nis, d.ID_Equip, d.municipio, d.rodovia].join(' ').toLowerCase();
            if (txt.indexOf(busca) === -1) return false;
        }
        return true;
    });

    renderizarTabela(filtrado);
    atualizarDashboard(filtrado);
}

function atualizarDashboard(lista) {
    var total      = lista.length;
    var online     = lista.filter(isOnline).length;
    var solar      = lista.filter(function(d){ return String(d.ENERGIZACAO||'').toUpperCase().trim()==='SOLAR'; }).length;
    var conv       = lista.filter(function(d){ return String(d.ENERGIZACAO||'').toUpperCase().trim()==='CONVENCIONAL'; }).length;
    var concluidos = lista.filter(isConcluido).length;
    var pendentes  = total - concluidos;

    function sc(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; }
    sc('cardTotal',        total);
    sc('cardOnline',       online);
    sc('cardSolar',        solar);
    sc('cardConvencional', conv);
    sc('cardPendentes',    pendentes);
    sc('cardConcluidos',   concluidos);

    Object.entries(ETAPAS).forEach(function(entry) {
        var col  = entry[1];
        var base = total;
        if (col === 'MONTAGEM_ESTRUTURAL_REALIZADO')
            base = lista.filter(function(d){ return !montEstrutNaoSeAplica(d); }).length;
        var ok  = lista.filter(function(d){ return etapaConcluida(d,col); }).length;
        var pct = base > 0 ? Math.round((ok/base)*100) : 0;
        var key = col.replace(/[^a-zA-Z0-9]/g,'_');
        var fe  = document.getElementById('bar_'+key);
        var pe  = document.getElementById('pct_'+key);
        if (fe) fe.style.width = pct+'%';
        if (pe) pe.textContent = pct+'%';
    });

    var ce = document.getElementById('tabelaCount');
    if (ce) ce.textContent = total+' registros';
}

function renderizarTabela(lista) {
    var tbody = document.querySelector('#tabelaCronograma tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="18" style="text-align:center;padding:30px;color:var(--text-muted);">Nenhum resultado encontrado.</td></tr>';
        return;
    }

    lista.forEach(function(d) {
        var concluido = isConcluido(d);
        var rowStyle  = concluido ? 'background:rgba(0,208,132,0.04);' : '';
        var prazo     = d._prazo || (colPrazo ? (d[colPrazo]||'—') : '—');

        var etapasHtml = '';
        Object.keys(ETAPAS).forEach(function(nome) {
            var col = ETAPAS[nome];
            if (col === 'MONTAGEM_ESTRUTURAL_REALIZADO' && montEstrutNaoSeAplica(d)) {
                etapasHtml += '<td style="text-align:center;"><span style="font-size:10px;color:rgba(232,237,245,0.2);">N/A</span></td>';
                return;
            }
            var ok = etapaConcluida(d, col);
            etapasHtml += '<td style="text-align:center;"><span class="'+(ok?'etapa-ok':'etapa-no')+'">'+(ok?'✓':'—')+'</span></td>';
        });

        tbody.innerHTML +=
            '<tr style="'+rowStyle+'">' +
            '<td><strong>'+(d.nis||'—')+'</strong></td>' +
            '<td style="font-size:10px;color:rgba(232,237,245,0.45);">'+prazo+'</td>' +
            '<td>'+(d.ID_Equip||'—')+'</td>' +
            '<td>'+(d.municipio||'—')+'</td>' +
            '<td>'+(d.ENERGIZACAO||'—')+'</td>' +
            '<td><span class="badge '+(isOnline(d)?'badge-online':'badge-offline')+'">'+(d.ONLINE||'—')+'</span></td>' +
            '<td>'+(d.Equipe_civil||'—')+'</td>' +
            '<td>'+(d.Equipe_eletronica||'—')+'</td>' +
            etapasHtml +
            '</tr>';
    });
}