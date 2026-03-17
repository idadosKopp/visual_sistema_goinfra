// carregar_excel.js — Carregamento e normalização dos dados do Excel
 
let dados = [];
 
// Nomes EXATOS das colunas do Excel (com espaço no final do LATITUDE e LONGITUDE)
// O Excel tem "LATITUDE " e "LONGITUDE" com possível espaço — tratamos os dois
function encontrarColuna(obj, nomes) {
    const chaves = Object.keys(obj);
    for (const nome of nomes) {
        const found = chaves.find(k => k.trim() === nome.trim());
        if (found) return found;
    }
    return null;
}
 
let colLat = null;
let colLon = null;
 
function limparNumero(valor) {
    if (valor === undefined || valor === null || valor === '') return null;
    // Remove °, substitui vírgula por ponto, remove espaços
    let texto = String(valor)
        .replace(/°/g, '')
        .replace(',', '.')
        .trim();
    const n = parseFloat(texto);
    return isNaN(n) ? null : n;
}
 
function normalizar(d) {
    const novo = { ...d };
 
    // Coordenadas: usa as colunas detectadas
    novo.LATITUDE  = limparNumero(colLat ? d[colLat] : null);
    novo.LONGITUDE = limparNumero(colLon ? d[colLon] : null);
 
    // Garante campos de texto limpos (aceita nomes com espaço)
    const campos = ['nis', 'ID_Equip', 'municipio', 'rodovia', 'ENERGIZACAO',
                    'ONLINE', 'Equipe_civil', 'Equipe_eletronica',
                    'FURACAO_REALIZADO', 'FIXACAO_POSTES_REALIZADO',
                    'ESTRUTURAS_REALIZADO', 'TRAVESSIA_INTERLIGACAO_REALIZADO',
                    'MONTAGEM_REALIZADO', 'MONTAGEM_ESTRUTURAL_REALIZADO',
                    'AFERICAO_REALIZADO'];
 
    campos.forEach(col => {
        novo[col] = d[col] != null ? String(d[col]).trim() : '';
    });
 
    return novo;
}
 
function carregarDados(callback) {
    fetch('data/cronograma_goinfra_visual.xlsx')
        .then(res => {
            if (!res.ok) throw new Error('Arquivo não encontrado (HTTP ' + res.status + ')');
            return res.arrayBuffer();
        })
        .then(buffer => {
            const wb = XLSX.read(buffer, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const json  = XLSX.utils.sheet_to_json(sheet);
 
            if (json.length === 0) throw new Error('Planilha vazia');
 
            // Detecta colunas de coordenada (podem ter espaço no final)
            colLat = encontrarColuna(json[0], ['LATITUDE', 'LATITUDE ', 'Latitude', 'latitude', 'LAT', 'lat']);
            colLon = encontrarColuna(json[0], ['LONGITUDE', 'LONGITUDE ', 'Longitude', 'longitude', 'LON', 'lon', 'LONG']);
 
            console.log('📋 Colunas detectadas — LAT:', colLat, '| LON:', colLon);
            console.log('📋 Todas as colunas:', Object.keys(json[0]));
 
            dados = json.map(normalizar);
 
            // Diagnóstico
            const comCoords = dados.filter(d => d.LATITUDE && d.LONGITUDE).length;
            console.log(`✅ ${dados.length} registros | ${comCoords} com coordenadas válidas`);
            if (comCoords > 0) console.log('Exemplo coords:', dados[0].LATITUDE, dados[0].LONGITUDE);
 
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => { loader.style.display = 'none'; }, 500);
            }
 
            if (typeof callback === 'function') callback(dados);
        })
        .catch(err => {
            console.error('❌ Erro:', err);
            const loader = document.getElementById('loader');
            if (loader) loader.innerHTML = `
                <div style="color:#ff4757;font-family:Inter,sans-serif;font-size:13px;text-align:center;padding:30px;line-height:2;">
                    ⚠️ <strong>${err.message}</strong><br>
                    <small style="color:rgba(255,255,255,0.35);font-size:11px;">
                        Arquivo esperado em: <code style="background:rgba(255,255,255,0.07);padding:2px 6px;border-radius:4px;">data/cronograma_goinfra_visual.xlsx</code>
                    </small>
                </div>`;
        });
}
 