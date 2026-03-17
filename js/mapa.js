// mapa.js — Mapa com cores por NI + planejador de rota manual

var mapaInstance = null;
var todosOsDados = [];
var marcadores = [];
var rotaAutoLayer = null;
var rotaManualLayer = null;
var marcadoresManual = [];

// Cores por índice de NI (ordem da lista)
var CORES_NI = ['#4d9fff','#00d084','#ffd32a','#ff6b35','#9b5de5','#ff4757','#00b4d8','#f72585'];
var mapaDeNIs = {}; // { "1ª NI": 0, "2ª NI": 1, ... }

// Paradas da rota manual
var paradasManuais = []; // [ { label, lat, lon } ]

// ---- Haversine ----
function distanciaKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    var a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ---- Rota otimizada nearest-neighbor ----
function rotaOtimizada(pontos) {
    if (pontos.length <= 1) return pontos;
    var visitados=[], rota=[], atual=0;
    for (var i=0;i<pontos.length;i++) {
        visitados.push(atual); rota.push(pontos[atual]);
        var melhor=Infinity, prox=-1;
        for (var j=0;j<pontos.length;j++) {
            if (visitados.indexOf(j)!==-1) continue;
            var d=distanciaKm(pontos[atual].LATITUDE,pontos[atual].LONGITUDE,pontos[j].LATITUDE,pontos[j].LONGITUDE);
            if (d<melhor){melhor=d;prox=j;}
        }
        if (prox!==-1) atual=prox;
    }
    return rota;
}

function isOnline(d) {
    return String(d.ONLINE||'').toUpperCase().trim()==='ONLINE';
}

// ---- Cor e índice de NI ----
function idxNI(nis) {
    if (mapaDeNIs[nis]===undefined) {
        mapaDeNIs[nis] = Object.keys(mapaDeNIs).length;
    }
    return mapaDeNIs[nis];
}
function corNI(nis) {
    return CORES_NI[idxNI(nis) % CORES_NI.length];
}

// ---- Inicialização ----
function inicializarMapa(dadosCarregados) {
    todosOsDados = dadosCarregados;

    // Mapeia NIs em ordem
    todosOsDados.forEach(function(d) { if (d.nis) idxNI(d.nis); });

    preencherSelect('filtroMapaNI',    'nis',               'Todas as NIs');
    preencherSelect('filtroMapaCivil', 'Equipe_civil',      'Todas equipes');
    preencherSelect('filtroMapaEletro','Equipe_eletronica', 'Todas equipes');

    ['filtroMapaNI','filtroMapaCivil','filtroMapaEletro','filtroMapaEnergia'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', atualizarMapa);
    });

    // Preenche select do planejador manual com municípios únicos
    preencherSelectParadas();

    // Legenda NI
    renderizarLegendaNI();

    mapaInstance = L.map('mapa',{zoomControl:true}).setView([-15.5,-50],7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
        attribution:'&copy; OpenStreetMap &copy; CartoDB', maxZoom:19
    }).addTo(mapaInstance);

    atualizarMapa();
    renderizarTabelasLaterais(todosOsDados);
}

function preencherSelect(id, campo, placeholder) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var vals = [];
    todosOsDados.forEach(function(d){ var v=d[campo]; if(v&&vals.indexOf(v)===-1) vals.push(v); });
    vals.sort();
    sel.innerHTML = '<option value="">'+placeholder+'</option>';
    vals.forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
}

function preencherSelectParadas() {
    var sel = document.getElementById('selectParada');
    if (!sel) return;

    // Agrupa por município+rodovia com coordenadas
    var pontos = {};
    todosOsDados.forEach(function(d) {
        if (!d.LATITUDE||!d.LONGITUDE) return;
        var key = (d.municipio||'—')+' ('+( d.rodovia||'—')+')';
        if (!pontos[key]) pontos[key] = { label:key, lat:d.LATITUDE, lon:d.LONGITUDE };
    });

    sel.innerHTML = '<option value="">Selecione uma cidade/NIS...</option>';
    Object.keys(pontos).sort().forEach(function(k) {
        var o = document.createElement('option');
        o.value = k;
        o.textContent = k;
        o.dataset.lat = pontos[k].lat;
        o.dataset.lon = pontos[k].lon;
        sel.appendChild(o);
    });
}

function renderizarLegendaNI() {
    var el = document.getElementById('legendaNI');
    if (!el) return;
    el.innerHTML = '';
    Object.keys(mapaDeNIs).sort().forEach(function(ni) {
        var cor = corNI(ni);
        el.innerHTML += '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div style="width:13px;height:13px;border-radius:50%;background:'+cor+';flex-shrink:0;"></div>' +
            '<span>'+ni+'</span></div>';
    });
}

function limparFiltrosMapa() {
    ['filtroMapaNI','filtroMapaCivil','filtroMapaEletro','filtroMapaEnergia'].forEach(function(id){
        var el=document.getElementById(id); if(el) el.value='';
    });
    atualizarMapa();
}

// ---- Atualiza mapa com filtros ----
function atualizarMapa() {
    var ni    = (document.getElementById('filtroMapaNI')    ||{}).value||'';
    var civil = (document.getElementById('filtroMapaCivil') ||{}).value||'';
    var eletro= (document.getElementById('filtroMapaEletro')||{}).value||'';
    var energ = (document.getElementById('filtroMapaEnergia')||{}).value||'';

    var lista = todosOsDados.filter(function(d){
        var lat=parseFloat(d.LATITUDE), lon=parseFloat(d.LONGITUDE);
        return !isNaN(lat)&&!isNaN(lon)&&lat!==0&&lon!==0;
    });
    if (ni)    lista=lista.filter(function(d){return d.nis===ni;});
    if (civil) lista=lista.filter(function(d){return d.Equipe_civil===civil;});
    if (eletro)lista=lista.filter(function(d){return d.Equipe_eletronica===eletro;});
    if (energ) lista=lista.filter(function(d){return String(d.ENERGIZACAO||'').toUpperCase().trim()===energ;});

    var pendentes  = lista.filter(function(d){return !isOnline(d);});
    var concluidos = lista.filter(function(d){return  isOnline(d);});

    // Limpa marcadores
    marcadores.forEach(function(m){mapaInstance.removeLayer(m);}); marcadores=[];
    if (rotaAutoLayer){mapaInstance.removeLayer(rotaAutoLayer);rotaAutoLayer=null;}
    var av=document.getElementById('mapaSemDados'); if(av) av.parentNode.removeChild(av);

    // Rota automática otimizada
    var rotaOrdenada = rotaOtimizada(pendentes);
    if (rotaOrdenada.length>1) {
        rotaAutoLayer = L.polyline(rotaOrdenada.map(function(d){return[d.LATITUDE,d.LONGITUDE];}),
            {color:'#0078ff',weight:2,opacity:0.5,dashArray:'6,8'}).addTo(mapaInstance);
    }

    // Marcadores online (verde sólido)
    concluidos.forEach(function(d){
        var cor = corNI(d.nis);
        var m = L.circleMarker([d.LATITUDE,d.LONGITUDE],{
            radius:6, fillColor:'#00d084', color:cor, weight:2, fillOpacity:0.9
        }).addTo(mapaInstance);
        m.bindPopup(popupHtml(d,false,null));
        marcadores.push(m);
    });

    // Marcadores pendentes (anel colorido por NI)
    rotaOrdenada.forEach(function(d,i){
        var cor = corNI(d.nis);
        var first = i===0;
        var m = L.circleMarker([d.LATITUDE,d.LONGITUDE],{
            radius: first?13:8,
            fillColor: first?'#ffd32a':cor,
            color: first?'#ffaa00':cor,
            weight: first?3:2,
            fillOpacity: first?1:0.35
        }).addTo(mapaInstance);
        m.bindPopup(popupHtml(d,true,i+1));
        if (first) m.openPopup();
        marcadores.push(m);
    });

    if (rotaOrdenada.length>0) atualizarProximaNIS(rotaOrdenada[0],rotaOrdenada);

    var todos=concluidos.concat(pendentes);
    if (todos.length>0) {
        mapaInstance.fitBounds(todos.map(function(d){return[d.LATITUDE,d.LONGITUDE];}),{padding:[40,40]});
    }

    renderizarTabelasLaterais(lista);
}

// ---- Popup ----
function popupHtml(d, pendente, ordem) {
    var cor = corNI(d.nis);
    var ordemTag = ordem ? '<span style="background:#0078ff;color:#fff;padding:1px 7px;border-radius:12px;font-size:10px;">#'+ordem+'</span> ' : '';
    var niTag = '<span style="background:'+cor+'22;color:'+cor+';padding:1px 7px;border-radius:12px;font-size:10px;font-weight:600;">'+( d.nis||'—')+'</span>';
    var solar = String(d.ENERGIZACAO||'').toUpperCase().trim()==='SOLAR';
    var enTag = solar
        ? '<span style="background:rgba(255,211,42,0.2);color:#ffd32a;padding:1px 7px;border-radius:12px;font-size:10px;">☀️ Solar</span>'
        : '<span style="background:rgba(100,120,200,0.2);color:#8899cc;padding:1px 7px;border-radius:12px;font-size:10px;">⚡ Conv.</span>';
    return '<div style="font-family:Inter,sans-serif;min-width:175px;line-height:1.8;">' +
        '<div style="font-weight:700;font-size:13px;margin-bottom:4px;">' + ordemTag + niTag + '</div>' +
        '<div style="margin-bottom:4px;">'+enTag+'</div>' +
        '<div style="font-size:11px;color:rgba(232,237,245,0.7);">📍 '+(d.municipio||'—')+' — '+(d.rodovia||'—')+'</div>' +
        '<div style="font-size:11px;color:rgba(232,237,245,0.7);">🔧 '+(d.ID_Equip||'—')+'</div>' +
        '<div style="font-size:11px;margin-top:4px;">Status: <span style="color:'+(pendente?'#ff4757':'#00d084')+';font-weight:600;">'+(pendente?'⏳ Pendente':'✅ Online')+'</span></div>' +
        '<div style="font-size:11px;color:rgba(232,237,245,0.5);">🏗️ '+(d.Equipe_civil||'—')+'</div>' +
        '<div style="font-size:11px;color:rgba(232,237,245,0.5);">⚙️ '+(d.Equipe_eletronica||'—')+'</div>' +
        '</div>';
}

// ---- Próxima NIS ----
function atualizarProximaNIS(nis, rota) {
    function set(id,val){var el=document.getElementById(id);if(el)el.textContent=val;}
    set('nisNumero',    nis.nis||'—');
    set('nisMunicipio',(nis.municipio||'—')+' — '+(nis.rodovia||'—'));
    set('nisEquip',    nis.ID_Equip||'—');
    var total=0;
    for(var i=0;i<rota.length-1;i++) total+=distanciaKm(rota[i].LATITUDE,rota[i].LONGITUDE,rota[i+1].LATITUDE,rota[i+1].LONGITUDE);
    set('nisPendentes',rota.length+' pendentes');
    set('nisDistTotal',total.toFixed(0)+' km');
    if(rota.length>1){
        var prox=distanciaKm(rota[0].LATITUDE,rota[0].LONGITUDE,rota[1].LATITUDE,rota[1].LONGITUDE);
        set('nisDistProx',prox.toFixed(1)+' km até o próximo');
    }
}

// ════════════════════════════════════
//  PLANEJADOR DE ROTA MANUAL
// ════════════════════════════════════

function adicionarParada() {
    var sel = document.getElementById('selectParada');
    if (!sel || !sel.value) return;

    var opt = sel.options[sel.selectedIndex];
    var lat = parseFloat(opt.dataset.lat);
    var lon = parseFloat(opt.dataset.lon);
    if (isNaN(lat)||isNaN(lon)) return;

    // Evita duplicata
    var jaExiste = paradasManuais.some(function(p){return p.label===sel.value;});
    if (jaExiste) return;

    paradasManuais.push({ label: sel.value, lat: lat, lon: lon });
    sel.value = '';
    renderizarParadas();
}

function removerParada(idx) {
    paradasManuais.splice(idx,1);
    renderizarParadas();
}

function renderizarParadas() {
    var lista = document.getElementById('paradasLista');
    var distEl = document.getElementById('rotaTotalDist');
    var kmEl   = document.getElementById('rotaTotalKm');
    if (!lista) return;

    if (paradasManuais.length===0) {
        lista.innerHTML = '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:8px 0;">Adicione paradas acima</div>';
        if(distEl) distEl.style.display='none';
        return;
    }

    // Calcula distâncias entre paradas
    var totalKm = 0;
    lista.innerHTML = '';
    paradasManuais.forEach(function(p,i) {
        var distTxt = '';
        if (i>0) {
            var d = distanciaKm(paradasManuais[i-1].lat,paradasManuais[i-1].lon,p.lat,p.lon);
            totalKm += d;
            distTxt = d.toFixed(1)+' km';
        }
        var cor = CORES_NI[i % CORES_NI.length];
        lista.innerHTML +=
            '<div class="parada-item">' +
            '<div class="parada-num" style="background:'+cor+';">'+( i+1)+'</div>' +
            '<div class="parada-nome">'+p.label+'</div>' +
            (distTxt?'<div class="parada-dist">+'+distTxt+'</div>':'') +
            '<button class="btn-remover-parada" onclick="removerParada('+i+')">✕</button>' +
            '</div>';
    });

    if (distEl && kmEl && paradasManuais.length>1) {
        distEl.style.display='block';
        kmEl.textContent = totalKm.toFixed(0)+' km no total';
    }
}

function calcularRotaManual() {
    if (paradasManuais.length < 2) {
        alert('Adicione pelo menos 2 paradas para calcular a rota.');
        return;
    }

    // Remove rota manual anterior
    if (rotaManualLayer) { mapaInstance.removeLayer(rotaManualLayer); rotaManualLayer=null; }
    marcadoresManual.forEach(function(m){mapaInstance.removeLayer(m);}); marcadoresManual=[];

    var coords = paradasManuais.map(function(p){return[p.lat,p.lon];});

    // Desenha linha laranja tracejada
    rotaManualLayer = L.polyline(coords,{color:'#ff6b35',weight:3,opacity:0.8,dashArray:'8,6'}).addTo(mapaInstance);

    // Marcadores numerados
    paradasManuais.forEach(function(p,i){
        var cor = CORES_NI[i % CORES_NI.length];
        var icon = L.divIcon({
            className:'',
            html:'<div style="background:'+cor+';color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.4);">'+(i+1)+'</div>',
            iconSize:[26,26], iconAnchor:[13,13]
        });
        var m = L.marker([p.lat,p.lon],{icon:icon}).addTo(mapaInstance);
        m.bindPopup('<div style="font-family:Inter,sans-serif;font-size:12px;"><strong style="color:'+cor+';">Parada '+(i+1)+'</strong><br>'+p.label+'</div>');
        marcadoresManual.push(m);
    });

    // Zoom na rota manual
    mapaInstance.fitBounds(coords,{padding:[50,50]});
}

function limparRotaManual() {
    paradasManuais = [];
    if (rotaManualLayer){mapaInstance.removeLayer(rotaManualLayer);rotaManualLayer=null;}
    marcadoresManual.forEach(function(m){mapaInstance.removeLayer(m);}); marcadoresManual=[];
    renderizarParadas();
}

// ---- Tabelas laterais ----
function renderizarTabelasLaterais(lista) {
    // Por NI
    var nis = {};
    lista.forEach(function(d){
        var n=d.nis||'—';
        if(!nis[n]) nis[n]={total:0,online:0};
        nis[n].total++;
        if(isOnline(d)) nis[n].online++;
    });
    var tbNI=document.querySelector('#tabelaNI tbody');
    if(tbNI){
        tbNI.innerHTML='';
        Object.keys(nis).sort().forEach(function(n){
            var v=nis[n], cor=corNI(n);
            var pendente=v.total-v.online;
            tbNI.innerHTML+='<tr>'+
                '<td><span style="color:'+cor+';font-weight:600;">'+n+'</span></td>'+
                '<td style="text-align:center;">'+v.total+'</td>'+
                '<td style="color:#00d084;text-align:center;">'+v.online+'</td>'+
                '<td style="color:#ff4757;text-align:center;">'+pendente+'</td>'+
                '</tr>';
        });
    }

    // Por Município
    var cidades={};
    lista.forEach(function(d){
        var key=(d.rodovia||'—')+'||'+(d.municipio||'—');
        if(!cidades[key]) cidades[key]={rod:d.rodovia||'—',mun:d.municipio||'—',total:0,online:0};
        cidades[key].total++;
        if(isOnline(d)) cidades[key].online++;
    });
    var tbCid=document.querySelector('#tabelaCidades tbody');
    if(tbCid){
        tbCid.innerHTML='';
        Object.values(cidades).sort(function(a,b){return b.total-a.total;}).forEach(function(c){
            var pct=c.total>0?Math.round((c.online/c.total)*100):0;
            var cor=pct===100?'#00d084':pct>=50?'#ffd32a':'#ff4757';
            tbCid.innerHTML+='<tr>'+
                '<td>'+c.rod+'</td><td>'+c.mun+'</td>'+
                '<td style="text-align:center;font-weight:600;">'+c.total+'</td>'+
                '<td style="color:'+cor+';text-align:center;">'+pct+'%</td>'+
                '</tr>';
        });
    }
}