// mapa.js — Mapa com cores por NI + planejador de rota manual

var mapaInstance = null;
var todosOsDados = [];
var marcadores = [];
var rotaAutoLayer = null;
var rotaManualLayer = null;
var marcadoresManual = [];
var CORES_NI = ['#4d9fff','#00d084','#ffd32a','#ff6b35','#9b5de5','#ff4757','#00b4d8','#f72585'];
var mapaDeNIs = {};
var paradasManuais = [];

// ── Etapas por equipe ──
var ETAPAS_CIVIL = [
    'FURACAO_REALIZADO',
    'FIXACAO_POSTES_REALIZADO',
    'ESTRUTURAS_REALIZADO',
    'TRAVESSIA_INTERLIGACAO_REALIZADO',
];

var ETAPAS_ELETRICA = [
    'MONTAGEM_REALIZADO',
    'MONTAGEM_ESTRUTURAL_REALIZADO',
    'AFERICAO_REALIZADO'
];

function distanciaKm(lat1,lon1,lat2,lon2){
    var R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
    var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function rotaOtimizada(pontos){
    if(pontos.length<=1) return pontos;
    var visitados=[],rota=[],atual=0;
    for(var i=0;i<pontos.length;i++){
        visitados.push(atual); rota.push(pontos[atual]);
        var melhor=Infinity,prox=-1;
        for(var j=0;j<pontos.length;j++){
            if(visitados.indexOf(j)!==-1) continue;
            var d=distanciaKm(pontos[atual].LATITUDE,pontos[atual].LONGITUDE,pontos[j].LATITUDE,pontos[j].LONGITUDE);
            if(d<melhor){melhor=d;prox=j;}
        }
        if(prox!==-1) atual=prox;
    }
    return rota;
}

function isOnline(d){ return String(d.ONLINE||'').toUpperCase().trim()==='ONLINE'; }

function idxNI(nis){
    if(mapaDeNIs[nis]===undefined) mapaDeNIs[nis]=Object.keys(mapaDeNIs).length;
    return mapaDeNIs[nis];
}
function corNI(nis){ return CORES_NI[idxNI(nis)%CORES_NI.length]; }

function inicializarMapa(dadosCarregados){
    todosOsDados=dadosCarregados;
    todosOsDados.forEach(function(d){ if(d.nis) idxNI(d.nis); });

    preencherSelect('filtroMapaNI',    'nis',               'Todas as NIs');
    preencherSelect('filtroMapaCivil', 'Equipe_civil',      'Todas equipes');
    preencherSelect('filtroMapaEletro','Equipe_eletronica', 'Todas equipes');

    ['filtroMapaNI','filtroMapaCivil','filtroMapaEletro','filtroMapaEnergia'].forEach(function(id){
        var el=document.getElementById(id); if(el) el.addEventListener('change',atualizarMapa);
    });

    preencherSelectParadas();
    renderizarLegendaNI();

    mapaInstance=L.map('mapa',{zoomControl:true}).setView([-15.5,-50],7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CartoDB', maxZoom: 19
}).addTo(mapaInstance);

    atualizarMapa();
    renderizarTabelasLaterais(todosOsDados);
}

function preencherSelect(id,campo,placeholder){
    var sel=document.getElementById(id); if(!sel) return;
    var vals=[];
    todosOsDados.forEach(function(d){ var v=d[campo]; if(v&&vals.indexOf(v)===-1) vals.push(v); });
    vals.sort();
    sel.innerHTML='<option value="">'+placeholder+'</option>';
    vals.forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
}

function preencherSelectParadas(){
    var sel=document.getElementById('selectParada'); if(!sel) return;
    var pontos={};
    todosOsDados.forEach(function(d){
        if(!d.LATITUDE||!d.LONGITUDE) return;
        var key=(d.municipio||'—')+' ('+(d.rodovia||'—')+')';
        if(!pontos[key]) pontos[key]={label:key,lat:d.LATITUDE,lon:d.LONGITUDE};
    });
    sel.innerHTML='<option value="">Selecione uma cidade/NIS...</option>';
    Object.keys(pontos).sort().forEach(function(k){
        var o=document.createElement('option');
        o.value=k; o.textContent=k;
        o.dataset.lat=pontos[k].lat; o.dataset.lon=pontos[k].lon;
        sel.appendChild(o);
    });
}

function renderizarLegendaNI(){
    var el=document.getElementById('legendaNI'); if(!el) return;
    el.innerHTML='';
    Object.keys(mapaDeNIs).sort().forEach(function(ni){
        var cor=corNI(ni);
        el.innerHTML+='<div style="display:flex;align-items:center;gap:7px;font-size:10px;color:var(--text-secondary);margin-bottom:4px;">'+
            '<div style="width:10px;height:10px;border-radius:50%;background:'+cor+';flex-shrink:0;"></div>'+ni+'</div>';
    });
}

function limparFiltrosMapa(){
    ['filtroMapaNI','filtroMapaCivil','filtroMapaEletro','filtroMapaEnergia'].forEach(function(id){
        var el=document.getElementById(id); if(el) el.value='';
    });
    atualizarMapa();
}

function atualizarMapa(){
    var ni    =(document.getElementById('filtroMapaNI')    ||{}).value||'';
    var civil =(document.getElementById('filtroMapaCivil') ||{}).value||'';
    var eletro=(document.getElementById('filtroMapaEletro')||{}).value||'';
    var energ =(document.getElementById('filtroMapaEnergia')||{}).value||'';

    var lista=todosOsDados.filter(function(d){
        var lat=parseFloat(d.LATITUDE),lon=parseFloat(d.LONGITUDE);
        return !isNaN(lat)&&!isNaN(lon)&&lat!==0&&lon!==0;
    });
    if(ni)    lista=lista.filter(function(d){return d.nis===ni;});
    if(civil) lista=lista.filter(function(d){return d.Equipe_civil===civil;});
    if(eletro)lista=lista.filter(function(d){return d.Equipe_eletronica===eletro;});
    if(energ) lista=lista.filter(function(d){return String(d.ENERGIZACAO||'').toUpperCase().trim()===energ;});

    var pendentes =lista.filter(function(d){return !isOnline(d);});
    var concluidos=lista.filter(function(d){return  isOnline(d);});

    marcadores.forEach(function(m){mapaInstance.removeLayer(m);}); marcadores=[];
    if(rotaAutoLayer){mapaInstance.removeLayer(rotaAutoLayer);rotaAutoLayer=null;}
    var av=document.getElementById('mapaSemDados'); if(av) av.parentNode.removeChild(av);

    var rotaOrdenada=rotaOtimizada(pendentes);

    if(rotaOrdenada.length>1){
        rotaAutoLayer=L.polyline(rotaOrdenada.map(function(d){return[d.LATITUDE,d.LONGITUDE];}),
            {color:'#0078ff',weight:2,opacity:0.5,dashArray:'6,8'}).addTo(mapaInstance);
    }

    concluidos.forEach(function(d){
        var cor=corNI(d.nis);
        var m=L.circleMarker([d.LATITUDE,d.LONGITUDE],{radius:6,fillColor:'#00d084',color:cor,weight:2,fillOpacity:0.9}).addTo(mapaInstance);
        m.bindPopup(popupHtml(d,false,null)); marcadores.push(m);
    });

    rotaOrdenada.forEach(function(d,i){
        var cor=corNI(d.nis),first=i===0;
        var m=L.circleMarker([d.LATITUDE,d.LONGITUDE],{
            radius:first?13:8, fillColor:first?'#ffd32a':cor,
            color:first?'#ffaa00':cor, weight:first?3:2, fillOpacity:first?1:0.35
        }).addTo(mapaInstance);
        m.bindPopup(popupHtml(d,true,i+1));
        if(first) m.openPopup();
        marcadores.push(m);
    });

    if(rotaOrdenada.length>0) atualizarProximaNIS(rotaOrdenada[0],rotaOrdenada);

    var todos=concluidos.concat(pendentes);
    if(todos.length>0) mapaInstance.fitBounds(todos.map(function(d){return[d.LATITUDE,d.LONGITUDE];}),{padding:[40,40]});

    renderizarTabelasLaterais(lista);
}

function popupHtml(d,pendente,ordem){
    var cor=corNI(d.nis);
    var ordemTag=ordem?'<span style="background:#0078ff;color:#fff;padding:1px 7px;border-radius:12px;font-size:10px;">#'+ordem+'</span> ':'';
    var niTag='<span style="background:'+cor+'22;color:'+cor+';padding:1px 7px;border-radius:12px;font-size:10px;font-weight:600;">'+(d.nis||'—')+'</span>';
    var solar=String(d.ENERGIZACAO||'').toUpperCase().trim()==='SOLAR';
    var enTag=solar
        ?'<span style="background:rgba(255,211,42,0.2);color:#ffd32a;padding:1px 7px;border-radius:12px;font-size:10px;">☀️ Solar</span>'
        :'<span style="background:rgba(100,120,200,0.2);color:#8899cc;padding:1px 7px;border-radius:12px;font-size:10px;">⚡ Conv.</span>';
    return '<div style="font-family:Inter,sans-serif;min-width:175px;line-height:1.8;">'+
        '<div style="font-weight:700;font-size:13px;margin-bottom:4px;">'+ordemTag+niTag+'</div>'+
        '<div style="margin-bottom:4px;">'+enTag+'</div>'+
        '<div style="font-size:11px;color:rgba(109, 113, 119, 0.7);">📍 '+(d.municipio||'—')+' — '+(d.rodovia||'—')+'</div>'+
        '<div style="font-size:11px;color:rgba(119, 121, 124, 0.7);">🔧 '+(d.ID_Equip||'—')+'</div>'+
        '<div style="font-size:11px;margin-top:4px;">Status: <span style="color:'+(pendente?'#ff4757':'#00d084')+';font-weight:600;">'+(pendente?'⏳ Pendente':'✅ Online')+'</span></div>'+
        '<div style="font-size:11px;color:rgba(117, 120, 126, 0.5);">🏗️ '+(d.Equipe_civil||'—')+'</div>'+
        '<div style="font-size:11px;color:rgba(72, 74, 77, 0.5);">⚙️ '+(d.Equipe_eletronica||'—')+'</div>'+
        '</div>';
}

function atualizarProximaNIS(nis,rota){
    function set(id,val){var el=document.getElementById(id);if(el)el.textContent=val;}
    set('nisNumero',nis.nis||'—');
    set('nisMunicipio',(nis.municipio||'—')+' — '+(nis.rodovia||'—'));
    set('nisEquip',nis.ID_Equip||'—');
    var total=0;
    for(var i=0;i<rota.length-1;i++) total+=distanciaKm(rota[i].LATITUDE,rota[i].LONGITUDE,rota[i+1].LATITUDE,rota[i+1].LONGITUDE);
    set('nisPendentes',rota.length);
    set('nisDistTotal',total.toFixed(0)+' km');
    if(rota.length>1){
        var prox=distanciaKm(rota[0].LATITUDE,rota[0].LONGITUDE,rota[1].LATITUDE,rota[1].LONGITUDE);
        set('nisDistProx',prox.toFixed(1)+' km até próximo');
    }
}

// ── ROTA MANUAL (chips) ──
function adicionarParada(){
    var sel=document.getElementById('selectParada');
    if(!sel||!sel.value) return;
    var opt=sel.options[sel.selectedIndex];
    var lat=parseFloat(opt.dataset.lat),lon=parseFloat(opt.dataset.lon);
    if(isNaN(lat)||isNaN(lon)) return;
    if(paradasManuais.some(function(p){return p.label===sel.value;})) return;
    paradasManuais.push({label:sel.value,lat:lat,lon:lon});
    sel.value='';
    renderizarChips();
}

function removerParada(idx){
    paradasManuais.splice(idx,1);
    renderizarChips();
}

function renderizarChips(){
    var el=document.getElementById('paradasChips');
    var distEl=document.getElementById('rotaTotalKm');
    if(!el) return;

    if(paradasManuais.length===0){
        el.innerHTML='<span style="font-size:10px;color:rgba(46, 47, 49, 0.2);">Nenhuma parada</span>';
        if(distEl) distEl.textContent='';
        return;
    }

    var html='',total=0;
    paradasManuais.forEach(function(p,i){
        if(i>0) total+=distanciaKm(paradasManuais[i-1].lat,paradasManuais[i-1].lon,p.lat,p.lon);
        var cor=CORES_NI[i%CORES_NI.length];
        var nome=p.label.split(' (')[0];
        html+='<div class="parada-chip">'+
            '<span class="chip-num" style="background:'+cor+';">'+(i+1)+'</span>'+
            '<span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+nome+'</span>'+
            '<button class="chip-x" onclick="removerParada('+i+')">✕</button>'+
            '</div>';
    });
    el.innerHTML=html;
    if(distEl) distEl.textContent=paradasManuais.length>1?total.toFixed(0)+' km':'';
}

function calcularRotaManual(){
    if(paradasManuais.length<2){alert('Adicione pelo menos 2 paradas.');return;}
    if(rotaManualLayer){mapaInstance.removeLayer(rotaManualLayer);rotaManualLayer=null;}
    marcadoresManual.forEach(function(m){mapaInstance.removeLayer(m);}); marcadoresManual=[];
    var coords=paradasManuais.map(function(p){return[p.lat,p.lon];});
    rotaManualLayer=L.polyline(coords,{color:'#ff6b35',weight:3,opacity:0.8,dashArray:'8,6'}).addTo(mapaInstance);
    paradasManuais.forEach(function(p,i){
        var cor=CORES_NI[i%CORES_NI.length];
        var icon=L.divIcon({className:'',
            html:'<div style="background:'+cor+';color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.4);">'+(i+1)+'</div>',
            iconSize:[24,24],iconAnchor:[12,12]});
        var m=L.marker([p.lat,p.lon],{icon:icon}).addTo(mapaInstance);
        m.bindPopup('<b style="color:'+cor+';">Parada '+(i+1)+'</b><br><small>'+p.label+'</small>');
        marcadoresManual.push(m);
    });
    mapaInstance.fitBounds(coords,{padding:[50,50]});
}

function limparRotaManual(){
    paradasManuais=[];
    if(rotaManualLayer){mapaInstance.removeLayer(rotaManualLayer);rotaManualLayer=null;}
    marcadoresManual.forEach(function(m){mapaInstance.removeLayer(m);}); marcadoresManual=[];
    renderizarChips();
}

// ── Calcula etapas de um equipamento para um conjunto de colunas ──
function calcularEtapas(d, colunas){
    var tot=0, ok=0;
    colunas.forEach(function(col){
        // _SIN_AEREA e _SIN_TERRESTRE — booleanos injetados
        if(col === '_SIN_AEREA' || col === '_SIN_TERRESTRE'){
            tot++;
            if(d[col]) ok++;
            return;
        }
        // MONTAGEM_ESTRUTURAL — só entra no total se tiver valor (não é N/A)
        if(col === 'MONTAGEM_ESTRUTURAL_REALIZADO'){
            var v = String(d[col] || '').trim();
            if(v === '' || v.toUpperCase() === 'N/A') return; // pula — não conta
            tot++;
            ok++; // tem valor = concluída
            return;
        }
        // Demais colunas — sempre contam
        tot++;
        var val = String(d[col] || '').trim();
        if(val !== '') ok++;
    });
    return {tot:tot, ok:ok};
}

// ── Preenche uma tabela de equipe ──
function preencherTabelaEquipe(tbId, colunas, lista){
    var tb = document.querySelector('#'+tbId+' tbody');
    if(!tb) return;
    tb.innerHTML = '';
    lista.forEach(function(d){
        var id        = d.ID_Equip  || '—';
        var municipio = d.municipio || '—';
        var r         = calcularEtapas(d, colunas);
        var pct       = r.tot > 0 ? Math.round(r.ok / r.tot * 100) : 0;
        var classe    = pct >= 75 ? 'ok' : pct >= 30 ? 'med' : 'low';
        var etapasStr = r.tot > 0 ? (r.ok+'/'+r.tot) : '—';
        tb.innerHTML +=
            '<tr>'+
            '<td>'+id+'</td>'+
            '<td style="font-weight:600;white-space:normal;word-break:break-word;line-height:1.3;padding:5px 4px;">'+municipio+'</td>'+
            '<td style="text-align:center;color:rgba(52, 53, 56, 0.55);">'+etapasStr+'</td>'+
            '<td><span class="badge-pct '+classe+'">'+pct+'%</span></td>'+
            '</tr>';
    });
}

// ── TABELAS LATERAIS ──
function renderizarTabelasLaterais(lista){

 // ── Por NI — baseado em etapas concluídas (civil + elétrica) ──
var TODAS_ETAPAS = ETAPAS_CIVIL.concat(ETAPAS_ELETRICA);

function equipConcluido(d) {
    return TODAS_ETAPAS.every(function(col) {
        // MONTAGEM_ESTRUTURAL — ignora se vazio (N/A)
        if (col === 'MONTAGEM_ESTRUTURAL_REALIZADO') {
            var v = String(d[col] || '').trim();
            return v === '' || v !== '';  // sempre passa se N/A
        }
        if (col === '_SIN_AEREA')     return !!d._SIN_AEREA;
        if (col === '_SIN_TERRESTRE') return !!d._SIN_TERRESTRE;
        return !!(d[col] && String(d[col]).trim() !== '');
    });
}

var nis = {};
lista.forEach(function(d) {
    var n = d.nis || '—';
    if (!nis[n]) nis[n] = { total: 0, ok: 0 };
    nis[n].total++;
    if (equipConcluido(d)) nis[n].ok++;
});

var tbNI = document.querySelector('#tabelaNI tbody');
if (tbNI) {
    tbNI.innerHTML = '';
    Object.keys(nis).sort().forEach(function(n) {
        var v   = nis[n];
        var cor = corNI(n);
        var pend = v.total - v.ok;
        var pct  = Math.round((v.ok / v.total) * 100);
        var pcor = pct === 100 ? '#1E8B5A' : pct >= 50 ? '#B45309' : '#C62828';
        tbNI.innerHTML +=
            '<tr>' +
            '<td><span style="color:'+cor+';font-weight:700;">'+n+'</span></td>' +
            '<td style="text-align:center;font-weight:600;">'+v.total+'</td>' +
            '<td style="color:#1E8B5A;text-align:center;font-weight:700;">'+v.ok+'</td>' +
            '<td style="color:#C62828;text-align:center;font-weight:700;">'+pend+'</td>' +
            '<td style="color:'+pcor+';text-align:center;font-weight:700;">'+pct+'%</td>' +
            '</tr>';
    });
}

    // ── Card Civil — etapas da equipe civil ──
    preencherTabelaEquipe('tabelaCivil',    ETAPAS_CIVIL,    lista);

    // ── Card Elétrica — etapas da equipe elétrica ──
    preencherTabelaEquipe('tabelaEletrica', ETAPAS_ELETRICA, lista);
}