// js/utils.js

// =======================================================
// VARIÁVEIS GLOBAIS
// =======================================================
const API_BASE_URL = 'http://localhost:8000'; 
const authToken = localStorage.getItem('authToken');
const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
// =======================================================

function verificarAutenticacao() {
    if (!authToken) {
        if (window.location.pathname.endsWith('index.html') === false) {
            window.location.href = 'index.html';
        }
    }
}
verificarAutenticacao();

function getStatusInfo(status) {
    switch (status) {
        case 'APROVADO': return { className: 'status-aprovado', text: 'Aprovado' };
        case 'REPROVADO': return { className: 'status-reprovado', text: 'Reprovado' };
        case 'APROVADO_COM_RESSALVAS': return { className: 'status-ressalva', text: 'Aprovado com Ressalvas' };
        case 'ENTREGUE': default: return { className: 'status-entregue', text: 'Entregue' }; 
    }
}

function setupAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
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

// =======================================================
// CORREÇÃO DEFINITIVA: showToast (Estilos movidos para CSS)
// =======================================================
function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    
    // Se o container ainda não existe, cria ele
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        
        // Lógica do Popover API (Top Layer)
        try {
            toastContainer.popover = "manual";
        } catch (e) {
            toastContainer.setAttribute('popover', 'manual');
        }
        
        // NOTA: Todos os estilos inline (.style) foram removidos daqui.
        // Eles agora são controlados exclusivamente pelo css/components.css
        
        document.body.appendChild(toastContainer);
        
        if (toastContainer.showPopover) {
            toastContainer.showPopover();
        }
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-times-circle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// =======================================================
// DROPDOWNS CUSTOMIZADOS
// =======================================================
function setupCustomSelect(wrapper) {
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const optionsContainer = wrapper.querySelector('.custom-options');
    const hiddenSelect = wrapper.previousElementSibling;
    const triggerSpan = trigger.querySelector('span');
    
    const customOptions = optionsContainer.querySelectorAll('.custom-option');
    
    if (!trigger.dataset.hasListener) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation(); 
            wrapper.classList.toggle('open');
        });
        trigger.dataset.hasListener = 'true'; 
    }

    customOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation(); 
            triggerSpan.textContent = option.textContent;
            hiddenSelect.value = option.dataset.value;
            wrapper.classList.remove('open');
            hiddenSelect.dispatchEvent(new Event('change'));
        });
    });
}

// =======================================================
// INPUTS DE ARQUIVO
// =======================================================
function setupFileInputs() {
    document.querySelectorAll('.file-upload-wrapper').forEach(wrapper => {
        const fileInput = wrapper.querySelector('input[type="file"]');
        const fileUploadText = wrapper.querySelector('.file-upload-text');
        const fileNameSpan = wrapper.querySelector('#file-name');

        if (!fileInput) return; 

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const fileName = fileInput.files[0].name;
                if(fileUploadText) fileUploadText.style.display = 'none';
                if(fileNameSpan) fileNameSpan.innerHTML = `<span class="label">Arquivo selecionado:</span><span class="name">${fileName}</span>`;
            } else {
                if(fileUploadText) fileUploadText.style.display = 'block'; 
                if(fileNameSpan) fileNameSpan.innerHTML = '';
            }
        });
    });
}

// =======================================================
// INICIALIZAÇÃO GLOBAL
// =======================================================
document.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });
});

document.addEventListener('DOMContentLoaded', setupFileInputs);