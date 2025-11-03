// js/utils.js

/**
 * Mapeia o status vindo da API para uma classe CSS e um texto legível.
 * @param {string} status - O status do certificado (ex: 'APROVADO', 'ENTREGUE').
 * @returns {object} - Um objeto com a classe CSS e o texto.
 */
function getStatusInfo(status) {
    switch (status) {
        case 'APROVADO':
            return { className: 'status-aprovado', text: 'Aprovado' };
        case 'REPROVADO':
            return { className: 'status-reprovado', text: 'Reprovado' };
        case 'APROVADO_COM_RESSALVAS':
            return { className: 'status-ressalva', text: 'Aprovado c/ Ressalvas' };
        case 'ENTREGUE':
            return { className: 'status-entregue', text: 'Pendente' };
        default:
            return { className: 'status-analise', text: 'Em Análise' };
    }
}

/**
 * Adiciona a funcionalidade de clique para abrir/fechar a todos
 * os itens de um acordeão na página.
 */
function setupAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        // Remove event listeners antigos para evitar duplicação
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        newHeader.addEventListener('click', () => {
            newHeader.classList.toggle('active');
            const content = newHeader.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
}

/**
 * Exibe uma notificação (toast) no canto da tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} [type='success'] - O tipo de notificação ('success' ou 'error').
 */
function showToast(message, type = 'success') {
    // Procura o container de toasts; se não existir, cria um.
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Cria o elemento do toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Define o ícone com base no tipo
    const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-times-circle';
    
    // Monta o HTML interno do toast
    toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;

    // Adiciona o toast ao container
    toastContainer.appendChild(toast);

    // Remove o toast após a animação de fadeOut terminar (5 segundos no total)
    setTimeout(() => {
        toast.remove();
    }, 5000);
}