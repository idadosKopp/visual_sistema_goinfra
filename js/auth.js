// auth.js — Verificação de autenticação
 
(function() {
    if (sessionStorage.getItem('autenticado') !== 'true') {
        window.location.replace('login.html');
    }
})();
 
function sair() {
    sessionStorage.removeItem('autenticado');
    window.location.href = 'login.html';
}
