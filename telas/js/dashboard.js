// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Pega os dados do usuário que foram salvos no localStorage
    const userDataString = localStorage.getItem('userData');

    // 2. VERIFICAÇÃO DE SEGURANÇA: Se não houver dados, o usuário não está logado.
    if (!userDataString) {
        // Redireciona de volta para a página de login
        window.location.href = 'index.html';
        return; // Para a execução do script
    }

    // 3. Se o usuário está logado, converte os dados de volta para um objeto
    const userData = JSON.parse(userDataString);

    // 4. PERSONALIZAÇÃO: Altera o título do dashboard
    const titleElement = document.querySelector('.dashboard-title');
    // Verifica se o título e o nome do usuário existem antes de alterar
    if (titleElement && userData.nome) {
        titleElement.innerHTML = `Bem-vindo(a), <span style="color: var(--primary-glow);">${userData.nome}</span>`;
    }

    // 5. FUNCIONALIDADE DE LOGOUT
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault(); // Impede que o link navegue imediatamente

            // Limpa os dados de login do navegador
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');

            // Redireciona para a página de login
            window.location.href = 'index.html';
        });
    }
});