// js/cadastro-horas.js

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('cadastro-form');
    const submitButton = form.querySelector('button[type="submit"]');

    // =======================================================
    // 1. BUSCAR CATEGORIAS DA API
    // =======================================================
    async function populateCategorias() {
        const select = document.getElementById('categoria');
        const customWrapper = select.nextElementSibling;
        const customOptions = customWrapper.querySelector('.custom-options');
        const triggerSpan = customWrapper.querySelector('.custom-select-trigger span');

        try {
            const response = await fetch(`${API_BASE_URL}/api/categorias`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });

            if (!response.ok) throw new Error('Falha ao carregar categorias.');

            const result = await response.json(); // Assumindo que a API retorna um array de categorias
            
            // Limpa o select e o custom select
            select.innerHTML = '<option value="">Selecione uma categoria...</option>';
            customOptions.innerHTML = '<div class="custom-option" data-value="">Selecione uma categoria...</div>';
            triggerSpan.textContent = 'Selecione uma categoria...';

            result.data.forEach(categoria => {
                // Adiciona ao <select> real
                const option = document.createElement('option');
                option.value = categoria.id; // Envia o ID
                option.textContent = categoria.nome; // Mostra o Nome
                select.appendChild(option);

                // Adiciona ao <div class="custom-options">
                const customOption = document.createElement('div');
                customOption.classList.add('custom-option');
                customOption.dataset.value = categoria.id;
                customOption.textContent = categoria.nome;
                customOptions.appendChild(customOption);
            });

            // Re-inicializa os eventos do custom select com as novas opções
            setupCustomSelect(customWrapper);

        } catch (error) {
            console.error(error);
            triggerSpan.textContent = 'Erro ao carregar categorias';
            select.innerHTML = '<option value="">Erro ao carregar</option>';
            customOptions.innerHTML = '<div class="custom-option" data-value="">Erro ao carregar</div>';
        }
    }

    // =======================================================
    // 2. LÓGICA DE ENVIO DO FORMULÁRIO PARA A API
    // =======================================================
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        const formData = new FormData();
        
        // ATUALIZADO: Enviando 'categoria_id' em vez de 'categoria'
        formData.append('categoria_id', document.getElementById('categoria').value);
        formData.append('nome_certificado', document.getElementById('nome-atividade').value);
        formData.append('instituicao', document.getElementById('instituicao').value);
        formData.append('carga_horaria_solicitada', document.getElementById('carga-horaria').value);
        
        // ATUALIZADO: Lendo do input de data
        const dataEmissao = document.getElementById('data_emissao').value;
        formData.append('data_emissao', dataEmissao);  
        
        const fileInput = document.getElementById('comprovante');
        if (fileInput.files.length > 0) {
            formData.append('arquivo', fileInput.files[0]);
        } else {
            showToast('Por favor, selecione um arquivo de comprovante.', 'error');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/certificados`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 422) {
                    let errorMessages = Object.values(result.errors).join('\n');
                    throw new Error('Erro de validação:\n' + errorMessages);
                }
                throw new Error(result.message || 'Ocorreu um erro ao enviar o certificado.');
            }
            
            showToast('Certificado enviado com sucesso!');
            
            setTimeout(() => {
                window.location.href = 'histórico aluno.html';
            }, 1500);

        } catch (error) {
            showToast(error.message, 'error');
            console.error('Erro no envio:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });

    // =======================================================
    // 3. LÓGICA DA INTERFACE (SELECTS E UPLOAD)
    // =======================================================
    const fileInput = document.getElementById('comprovante');
    const fileUploadText = document.querySelector('.file-upload-text');
    const fileNameSpan = document.getElementById('file-name');

    // Lógica do 'ano' foi removida
    
    function setupCustomSelect(wrapper) {
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const optionsContainer = wrapper.querySelector('.custom-options');
        const hiddenSelect = wrapper.previousElementSibling;
        const triggerSpan = trigger.querySelector('span');
        
        // Limpa opções antigas para evitar duplicatas ao re-inicializar
        const customOptions = optionsContainer.querySelectorAll('.custom-option');
        
        trigger.addEventListener('click', () => wrapper.classList.toggle('open'));
        
        // Adiciona eventos nas opções (incluindo as carregadas da API)
        customOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                // Remove o listener antigo para não disparar múltiplos eventos
                e.stopPropagation(); 
                triggerSpan.textContent = option.textContent;
                hiddenSelect.value = option.dataset.value;
                wrapper.classList.remove('open');
            });
        });
    }

    // Inicializa os selects que já existem no HTML (neste caso, 'categoria')
    // A função populateCategorias() vai chamar setupCustomSelect DE NOVO
    // quando os dados da API chegarem.
    document.querySelectorAll('.custom-select-wrapper').forEach(setupCustomSelect);
    
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
            if (!wrapper.contains(e.target)) wrapper.classList.remove('open');
        });
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            fileUploadText.style.display = 'none';
            fileNameSpan.innerHTML = `<span class="label">Arquivo selecionado:</span><span class="name">${fileName}</span>`;
        } else {
            fileUploadText.style.display = 'block'; 
            fileNameSpan.innerHTML = '';
        }
    });

    // =======================================================
    // INICIALIZAÇÃO
    // =======================================================
    populateCategorias();

});