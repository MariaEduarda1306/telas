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
        // 1. Carregar Categorias (Parte conectada ao Backend)
        try {
            const response = await fetch(`${API_BASE_URL}/api/categorias`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar categorias.');
            
            const result = await response.json();
            
            // Salva o estado original
            loadedCategories = result.data || []; 
            renderTags(loadedCategories);

        } catch (error) {
            console.error(error);
            showToast('Não foi possível carregar as categorias.', 'error');
        }

        // 2. Carregar outras configurações (Simulado - Backend Incompleto)
        // TODO: Implementar o fetch para as outras regras (horas, api, etc.)
        //       quando os endpoints do backend estiverem prontos.
        //       Por enquanto, usamos valores padrão.
        try {
            elements.horasMinimas.value = 200;
            elements.minPorArea.value = 20;
            elements.maxPorArea.value = 60;
            elements.modoManutencao.checked = false;
            elements.apiUrl.value = 'https://api.instituicao.com/v1/alunos';
            elements.apiKey.value = '**************';
        } catch (error) {
            console.error("Erro ao carregar configurações simuladas:", error);
        }
    }

    // =======================================================
    // UPDATE - SALVAR CONFIGURAÇÕES
    // =======================================================
    async function saveSettings() {
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        // --- 1. Lógica de salvar Categorias ---
        // Pega os nomes das tags que estão na tela agora
        const newTagNames = Array.from(elements.tagListContainer.querySelectorAll('.tag-text'))
            .map(span => span.textContent);
        
        // Pega os nomes das tags que foram carregadas do BD
        const oldTagNames = loadedCategories.map(c => c.nome);

        // Compara para saber o que criar e o que deletar
        const tagsToCreate = newTagNames.filter(name => !oldTagNames.includes(name));
        const tagsToDelete = loadedCategories.filter(c => !newTagNames.includes(c.nome));

        // Cria as promises de Crate (POST)
        const createPromises = tagsToCreate.map(name => 
            fetch(`${API_BASE_URL}/api/categorias`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ nome: name })
            })
        );
        
        // Cria as promises de Delete (DELETE)
        const deletePromises = tagsToDelete.map(cat => 
            fetch(`${API_BASE_URL}/api/categorias/${cat.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            })
        );
        
        // --- 2. Lógica para salvar outras configurações ---
        // TODO: Implementar o save para os outros campos quando o backend estiver pronto.
        // const otherSettingsData = {
        //     horas_minimas: elements.horasMinimas.value,
        //     min_por_area: elements.minPorArea.value,
        //     ...
        // };
        // const saveOtherSettingsPromise = fetch(..., { method: 'PUT', body: JSON.stringify(otherSettingsData) });

        try {
            // Executa todas as promises de Categoria
            const results = await Promise.allSettled([...createPromises, ...deletePromises]);

            const failedCreations = results.slice(0, createPromises.length).filter(r => r.status === 'rejected');
            const failedDeletions = results.slice(createPromises.length).filter(r => r.status === 'rejected');

            if (failedCreations.length > 0 || failedDeletions.length > 0) {
                throw new Error('Algumas categorias falharam ao salvar.');
            }
            
            showToast('Configurações salvas com sucesso!');

        } catch (error) {
            showToast(`Erro ao salvar: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
            // Recarrega o estado do BD para sincronizar os IDs
            loadSettings(); 
        }
    }

    // =======================================================
    // LÓGICA DA INTERFACE (TAGS)
    // =======================================================

    // Alterado para receber os objetos de categoria
    function renderTags(categoriaObjects) {
        elements.tagListContainer.innerHTML = '';
        categoriaObjects.forEach(cat => {
            addTagToDOM(cat.nome, cat.id); // Passa o nome e o ID
        });
    }

    // Alterado para armazenar o ID
    function addTagToDOM(tagText, tagId = null) {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        
        // Armazena o ID no dataset (null se for uma tag nova)
        tagSpan.dataset.id = tagId; 
        
        tagSpan.innerHTML = `<span class="tag-text">${tagText}</span> <i class="fas fa-times remove-tag"></i>`;
        
        tagSpan.querySelector('.remove-tag').addEventListener('click', () => {
            tagSpan.remove();
        });
        
        elements.tagListContainer.appendChild(tagSpan);
    }
    
    // Botão de adicionar nova tag (lógica local, só salva ao clicar em "Salvar Tudo")
    elements.addTagBtn.addEventListener('click', () => {
        const newTagValue = elements.newTagInput.value.trim();
        if (newTagValue) {
            // Adiciona a tag na tela sem ID (tagId = null)
            addTagToDOM(newTagValue, null); 
            elements.newTagInput.value = '';
        }
    });

    // =======================================================
    // EVENTOS E INICIALIZAÇÃO
    // =======================================================
    saveBtn.addEventListener('click', saveSettings);
    loadSettings(); // Carrega as configurações ao abrir a página
});