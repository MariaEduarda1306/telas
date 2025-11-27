// js/configuracoes.js

document.addEventListener('DOMContentLoaded', () => {

    const saveBtn = document.getElementById('save-settings-btn');
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

    // Variável para guardar o estado original das categorias carregadas
    let loadedCategories = []; // Armazenará {id, nome}

    // =======================================================
    // READ - CARREGAR CONFIGURAÇÕES
    // =======================================================
    async function loadSettings() {
        // 1. Carregar Categorias
        // NOTA: Este endpoint (/api/categorias) não consta na doc v1.1, 
        // mas é essencial para o funcionamento desta tela. 
        try {
            const response = await fetch(`${API_BASE_URL}/api/categorias`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                // Salva o estado original (suporta paginação ou lista direta)
                loadedCategories = result.data || result; 
                renderTags(loadedCategories);
            } else {
                console.warn('Endpoint /categorias não encontrado ou erro ao carregar.');
            }

        } catch (error) {
            console.error(error);
            showToast('Não foi possível carregar as categorias.', 'error');
        }

        // 2. Carregar outras configurações
        // Endpoint conforme Doc: GET /configuracoes
        try {
            const response = await fetch(`${API_BASE_URL}/api/configuracoes`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });

            if (response.ok) {
                const config = await response.json();
                
                // Preenche os campos com os dados da API ou mantém os defaults se nulo
                if (elements.horasMinimas) elements.horasMinimas.value = config.horas_minimas || 200;
                if (elements.minPorArea) elements.minPorArea.value = config.min_por_area || 20;
                if (elements.maxPorArea) elements.maxPorArea.value = config.max_por_area || 60;
                if (elements.modoManutencao) elements.modoManutencao.checked = !!config.modo_manutencao;
                // Campos de API Externa (se existirem no backend)
                if (elements.apiUrl) elements.apiUrl.value = config.api_url || '';
                if (elements.apiKey) elements.apiKey.value = config.api_key || '';
            }
        } catch (error) {
            console.error("Erro ao carregar configurações gerais:", error);
        }
    }

    // =======================================================
    // UPDATE - SALVAR CONFIGURAÇÕES
    // =======================================================
    async function saveSettings() {
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        try {
            // --- 1. Lógica de salvar Categorias (Lógica Híbrida de Sync) ---
            // Pega os nomes das tags que estão na tela agora
            const currentTags = Array.from(elements.tagListContainer.querySelectorAll('.tag')).map(span => ({
                id: span.dataset.id || null, // ID string ou null
                nome: span.querySelector('.tag-text').textContent
            }));

            // Identifica criações e exclusões
            const tagsToCreate = currentTags.filter(t => !t.id);
            const tagsToDelete = loadedCategories.filter(old => !currentTags.find(now => now.id == old.id));

            // Promises de Criação
            const createPromises = tagsToCreate.map(tag => 
                fetch(`${API_BASE_URL}/api/categorias`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ nome: tag.nome })
                })
            );
            
            // Promises de Exclusão
            const deletePromises = tagsToDelete.map(tag => 
                fetch(`${API_BASE_URL}/api/categorias/${tag.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
                })
            );

            // --- 2. Lógica para salvar Configurações Gerais ---
            // Endpoint conforme Doc: PUT /configuracoes
            const configData = {
                horas_minimas: elements.horasMinimas ? elements.horasMinimas.value : 200,
                min_por_area: elements.minPorArea ? elements.minPorArea.value : 20,
                max_por_area: elements.maxPorArea ? elements.maxPorArea.value : 60,
                modo_manutencao: elements.modoManutencao ? elements.modoManutencao.checked : false,
                api_url: elements.apiUrl ? elements.apiUrl.value : null,
                api_key: elements.apiKey ? elements.apiKey.value : null
            };

            const configPromise = fetch(`${API_BASE_URL}/api/configuracoes`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(configData)
            });

            // Executa tudo em paralelo
            const allPromises = [...createPromises, ...deletePromises, configPromise];
            const results = await Promise.allSettled(allPromises);

            // Verifica falhas
            const rejected = results.filter(r => r.status === 'rejected');
            if (rejected.length > 0) {
                console.error(rejected);
                throw new Error('Ocorreram erros ao salvar alguns itens.');
            }
            
            // Verifica se a resposta da config (última promise) foi ok
            const configResult = results[results.length - 1];
            if (configResult.status === 'fulfilled' && !configResult.value.ok) {
                 throw new Error('Falha ao salvar configurações gerais.');
            }

            showToast('Todas as configurações foram salvas!');

        } catch (error) {
            showToast(`Erro parcial: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
            // Recarrega para atualizar IDs e estado
            loadSettings(); 
        }
    }

    // =======================================================
    // LÓGICA DA INTERFACE (TAGS)
    // =======================================================

    function renderTags(categoriaObjects) {
        elements.tagListContainer.innerHTML = '';
        categoriaObjects.forEach(cat => {
            addTagToDOM(cat.nome, cat.id);
        });
    }

    function addTagToDOM(tagText, tagId = null) {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        
        // Importante: dataset armazena como string. Se tagId for null, vira "null" ou undefined.
        if (tagId) tagSpan.dataset.id = tagId; 
        
        tagSpan.innerHTML = `<span class="tag-text">${tagText}</span> <i class="fas fa-times remove-tag"></i>`;
        
        tagSpan.querySelector('.remove-tag').addEventListener('click', () => {
            tagSpan.remove();
        });
        
        elements.tagListContainer.appendChild(tagSpan);
    }
    
    elements.addTagBtn.addEventListener('click', () => {
        const newTagValue = elements.newTagInput.value.trim();
        if (newTagValue) {
            addTagToDOM(newTagValue, null); 
            elements.newTagInput.value = '';
        }
    });

    // =======================================================
    // EVENTOS E INICIALIZAÇÃO
    // =======================================================
    saveBtn.addEventListener('click', saveSettings);
    
    // Inicia o carregamento
    loadSettings();
});