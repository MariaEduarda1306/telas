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
            // Tenta buscar categorias. Se a rota não existir na doc, isso vai falhar.
            // Idealmente, o backend deve implementar essa rota ou retornar categorias em /configuracoes
            const response = await fetch(`${API_BASE_URL}/api/categorias`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });

            if (!response.ok) throw new Error('Falha ao carregar categorias.');

            const result = await response.json(); 
            // Suporte a wrapper 'data' ou array direto
            const categorias = result.data || result;
            
            // Limpa o select e o custom select
            select.innerHTML = '<option value="">Selecione uma categoria...</option>';
            customOptions.innerHTML = '<div class="custom-option" data-value="">Selecione uma categoria...</div>';
            triggerSpan.textContent = 'Selecione uma categoria...';

            if (categorias.length === 0) {
                 triggerSpan.textContent = 'Nenhuma categoria disponível';
            }

            categorias.forEach(categoria => {
                // Adiciona ao <select> real
                const option = document.createElement('option');
                option.value = categoria.id; // Assume que o backend espera ID
                option.textContent = categoria.nome;
                select.appendChild(option);

                // Adiciona ao <div class="custom-options">
                const customOption = document.createElement('div');
                customOption.classList.add('custom-option');
                customOption.dataset.value = categoria.id;
                customOption.textContent = categoria.nome;
                customOptions.appendChild(customOption);
            });

            // Re-inicializa os eventos do custom select
            setupCustomSelect(customWrapper);

        } catch (error) {
            console.error(error);
            triggerSpan.textContent = 'Erro ao carregar categorias';
            // Fallback visual
            customOptions.innerHTML = '<div class="custom-option" data-value="">Erro de conexão</div>';
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

        // --- NOVA VALIDAÇÃO MANUAL AQUI ---
        const categoriaSelect = document.getElementById('categoria');
        if (!categoriaSelect.value) {
            showToast('Por favor, selecione uma categoria.', 'error');
            
            // Restaura o botão e para a execução
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }

        const formData = new FormData();
        
        // A doc pede 'categoria' no payload. Se o backend espera ID, o nome padrão Laravel é 'categoria_id'.
        // Se o backend espera STRING, mude .value para o texto da opção selecionada.
        // Mantendo .value (ID) que é o padrão mais robusto.
        formData.append('categoria_id', document.getElementById('categoria').value);
        
        formData.append('nome_certificado', document.getElementById('nome-atividade').value);
        formData.append('instituicao', document.getElementById('instituicao').value);
        formData.append('carga_horaria_solicitada', document.getElementById('carga-horaria').value);
        
        // Data de emissão deve ser Y-m-d (o input date já retorna isso)
        formData.append('data_emissao', document.getElementById('data_emissao').value);  
        
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
            // Endpoint conforme Doc: POST /certificados
            const response = await fetch(`${API_BASE_URL}/api/certificados`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                    // Não setar Content-Type para multipart/form-data manualmente, o fetch faz isso
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 422) {
                    // Tratamento de erro de validação do Laravel
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
    
    // Inicializa o wrapper do select imediatamente para não quebrar o layout enquanto carrega
    const categoriaSelectWrapper = document.getElementById('categoria').nextElementSibling;
    if (categoriaSelectWrapper) {
        setupCustomSelect(categoriaSelectWrapper);
    }

    populateCategorias();

});
