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

            const result = await response.json(); 
            const categorias = result.data || result;
            
            select.innerHTML = '<option value="">Selecione uma categoria...</option>';
            customOptions.innerHTML = '<div class="custom-option" data-value="">Selecione uma categoria...</div>';
            triggerSpan.textContent = 'Selecione uma categoria...';

            if (categorias.length === 0) {
                 triggerSpan.textContent = 'Nenhuma categoria disponível';
            }

            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.id; 
                option.textContent = categoria.nome;
                select.appendChild(option);

                const customOption = document.createElement('div');
                customOption.classList.add('custom-option');
                customOption.dataset.value = categoria.id;
                customOption.textContent = categoria.nome;
                customOptions.appendChild(customOption);
            });

            setupCustomSelect(customWrapper);

        } catch (error) {
            console.error(error);
            triggerSpan.textContent = 'Erro ao carregar categorias';
            customOptions.innerHTML = '<div class="custom-option" data-value="">Erro de conexão</div>';
            setupCustomSelect(customWrapper); 
        }
    }

    // =======================================================
    // FUNÇÃO AUXILIAR: MARCAR/DESMARCAR ERRO
    // =======================================================
    function toggleError(element, hasError) {
        if (hasError) {
            element.classList.add('input-error', 'shake');
            // Remove a animação de "tremida" depois que ela roda, para poder rodar de novo se precisar
            setTimeout(() => element.classList.remove('shake'), 500);
        } else {
            element.classList.remove('input-error', 'shake');
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

        // --- VALIDAÇÃO VISUAL E DE DADOS ---
        
        // 1. Seleciona os ELEMENTOS (não apenas os valores)
        const categoriaSelect = document.getElementById('categoria');
        const nomeInput = document.getElementById('nome-atividade');
        const instituicaoInput = document.getElementById('instituicao');
        const horasInput = document.getElementById('carga-horaria');
        const dataInput = document.getElementById('data_emissao');
        const fileInput = document.getElementById('comprovante');
        
        // Wrapper especial para pintar a borda do Custom Select
        const customSelectTrigger = categoriaSelect.nextElementSibling.querySelector('.custom-select-trigger');
        // Wrapper especial para pintar a borda do File Upload
        const fileUploadWrapper = form.querySelector('.file-upload-wrapper');

        let hasError = false;

        // 2. Valida cada campo individualmente e aplica o estilo
        
        // Categoria
        if (!categoriaSelect.value) {
            toggleError(customSelectTrigger, true);
            hasError = true;
        } else {
            toggleError(customSelectTrigger, false);
        }

        // Nome
        if (!nomeInput.value.trim()) {
            toggleError(nomeInput, true);
            hasError = true;
        } else {
            toggleError(nomeInput, false);
        }

        // Instituição
        if (!instituicaoInput.value.trim()) {
            toggleError(instituicaoInput, true);
            hasError = true;
        } else {
            toggleError(instituicaoInput, false);
        }

        // Carga Horária
        if (!horasInput.value || horasInput.value <= 0) {
            toggleError(horasInput, true);
            hasError = true;
        } else {
            toggleError(horasInput, false);
        }

        // Data
        if (!dataInput.value) {
            toggleError(dataInput, true);
            hasError = true;
        } else {
            toggleError(dataInput, false);
        }

        // Arquivo
        if (fileInput.files.length === 0) {
            toggleError(fileUploadWrapper, true);
            hasError = true;
        } else {
            toggleError(fileUploadWrapper, false);
        }

        // 3. Se houver qualquer erro, para tudo e avisa
        if (hasError) {
            showToast('Por favor, preencha os campos destacados em vermelho.', 'error');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }

        // --- FIM DA VALIDAÇÃO ---

        const formData = new FormData();
        
        formData.append('categoria_id', categoriaSelect.value);
        formData.append('nome_certificado', nomeInput.value);
        formData.append('instituicao', instituicaoInput.value);
        formData.append('carga_horaria_solicitada', horasInput.value);
        formData.append('data_emissao', dataInput.value);  
        formData.append('arquivo', fileInput.files[0]);

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
                    const errors = result.errors || {};
                    let errorMessages = Object.values(errors).flat().join('\n');
                    throw new Error('Erro de validação:\n' + (errorMessages || result.message));
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
    // 3. INICIALIZAÇÃO
    // =======================================================
    
    // Remove o erro visual assim que o usuário muda o valor do campo
    form.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', () => toggleError(input, false));
        input.addEventListener('change', () => toggleError(input, false));
    });

    // Inicializa o wrapper do select
    const categoriaSelectWrapper = document.getElementById('categoria').nextElementSibling;
    if (categoriaSelectWrapper) {
        setupCustomSelect(categoriaSelectWrapper);
        // Remove erro do select customizado ao clicar
        categoriaSelectWrapper.addEventListener('click', () => {
            const trigger = categoriaSelectWrapper.querySelector('.custom-select-trigger');
            toggleError(trigger, false);
        });
    }
    
    // Remove erro do upload de arquivo ao mudar
    const fileUploadLabel = form.querySelector('.file-upload-wrapper');
    const fileInputReal = document.getElementById('comprovante');
    if(fileInputReal) {
        fileInputReal.addEventListener('change', () => toggleError(fileUploadLabel, false));
    }

    populateCategorias();

});