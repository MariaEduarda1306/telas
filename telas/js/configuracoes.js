// js/configuracoes.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. SEGURANÇA E SELEÇÃO DE ELEMENTOS
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }

    const saveBtn = document.getElementById('save-settings-btn');
    // Mapeamento dos elementos do formulário
    const elements = {
        tagListContainer: document.getElementById('tag-list-container'),
        newTagInput: document.getElementById('new-tag-input'),
        addTagBtn: document.getElementById('add-tag-btn'),
        horasMinimas: document.getElementById('horas-minimas'),
        minPorArea: document.getElementById('min-por-area'),
        maxPorArea: document.getElementById('max-por-area'),
        modoManutencao: document.getElementById('modo-manutencao'),
        apiUrl: document.getElementById('api-url'),
        apiKey: document.getElementById('api-key'),
    };

    // =======================================================
    // READ - CARREGAR CONFIGURAÇÕES DA API
    // =======================================================
    async function loadSettings() {
        try {
            // ATENÇÃO: Verifique se este é o endpoint correto no seu backend
            const response = await fetch('http://localhost:8000/api/configuracoes', {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar configurações.');
            
            const settings = await response.json();

            // Preenche os campos com os dados da API
            elements.horasMinimas.value = settings.horas_minimas || 200;
            elements.minPorArea.value = settings.min_por_area || 20;
            elements.maxPorArea.value = settings.max_por_area || 60;
            elements.modoManutencao.checked = settings.modo_manutencao || false;
            elements.apiUrl.value = settings.api_url || '';
            elements.apiKey.value = settings.api_key ? '**************' : ''; // Mostra placeholder se a chave existir

            // Renderiza as tags de categoria
            renderTags(settings.categorias || []);

        } catch (error) {
            console.error(error);
            alert('Não foi possível carregar as configurações do sistema.');
        }
    }

    // =======================================================
    // UPDATE - SALVAR CONFIGURAÇÕES NA API
    // =======================================================
    async function saveSettings() {
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        // Coleta as tags atuais da tela
        const currentTags = Array.from(elements.tagListContainer.querySelectorAll('.tag-text')).map(span => span.textContent);

        const settingsData = {
            // ATENÇÃO: Verifique se estes são os nomes corretos que o backend espera
            horas_minimas: elements.horasMinimas.value,
            min_por_area: elements.minPorArea.value,
            max_por_area: elements.maxPorArea.value,
            modo_manutencao: elements.modoManutencao.checked,
            api_url: elements.apiUrl.value,
            categorias: currentTags,
        };

        // Só envia a API key se o usuário digitou uma nova (não o placeholder)
        if (elements.apiKey.value && elements.apiKey.value !== '**************') {
            settingsData.api_key = elements.apiKey.value;
        }

        try {
            // ATENÇÃO: Verifique se este é o endpoint e o método (PUT/POST) corretos
            const response = await fetch('http://localhost:8000/api/configuracoes', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(settingsData)
            });

            if (!response.ok) throw new Error((await response.json()).message || 'Falha ao salvar.');
            
            alert('Configurações salvas com sucesso!');
            elements.apiKey.value = '**************'; // Reseta o campo da chave para o placeholder

        } catch (error) {
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        }
    }

    // =======================================================
    // LÓGICA DA INTERFACE (TAGS)
    // =======================================================
    function renderTags(tagsArray) {
        elements.tagListContainer.innerHTML = '';
        tagsArray.forEach(tagText => {
            addTagToDOM(tagText);
        });
    }

    function addTagToDOM(tagText) {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.innerHTML = `<span class="tag-text">${tagText}</span> <i class="fas fa-times remove-tag"></i>`;
        
        tagSpan.querySelector('.remove-tag').addEventListener('click', () => {
            tagSpan.remove();
        });
        
        elements.tagListContainer.appendChild(tagSpan);
    }
    
    elements.addTagBtn.addEventListener('click', () => {
        const newTagValue = elements.newTagInput.value.trim();
        if (newTagValue) {
            addTagToDOM(newTagValue);
            elements.newTagInput.value = '';
        }
    });

    // =======================================================
    // EVENTOS E INICIALIZAÇÃO
    // =======================================================
    saveBtn.addEventListener('click', saveSettings);
    loadSettings(); // Carrega as configurações ao abrir a página
});