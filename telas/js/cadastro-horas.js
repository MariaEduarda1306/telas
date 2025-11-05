// js/cadastro-horas.js

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('cadastro-form');
    const submitButton = form.querySelector('button[type="submit"]');

    // =======================================================
    // 2. LÓGICA DE ENVIO DO FORMULÁRIO PARA A API
    // =======================================================
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        const formData = new FormData();
        
        formData.append('nome_certificado', document.getElementById('nome-atividade').value);
        formData.append('instituicao', document.getElementById('instituicao').value);
        formData.append('carga_horaria_solicitada', document.getElementById('carga-horaria').value);
        formData.append('categoria', document.getElementById('categoria').value);
        
        const ano = document.getElementById('ano').value;
        formData.append('data_emissao', `${ano}-01-01`); 
        
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
            // ALTERADO AQUI
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
    const anoSelect = document.getElementById('ano');
    const fileInput = document.getElementById('comprovante');
    const fileUploadText = document.querySelector('.file-upload-text');
    const fileNameSpan = document.getElementById('file-name');

    const anoAtual = new Date().getFullYear();
    for (let ano = anoAtual; ano >= anoAtual - 10; ano--) {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        anoSelect.appendChild(option);
    }

    function setupCustomSelect(wrapper) {
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const optionsContainer = wrapper.querySelector('.custom-options');
        const hiddenSelect = wrapper.previousElementSibling;
        const triggerSpan = trigger.querySelector('span');

        optionsContainer.innerHTML = '';
        Array.from(hiddenSelect.options).forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.classList.add('custom-option');
            optionDiv.textContent = option.textContent;
            optionDiv.dataset.value = option.value;
            optionsContainer.appendChild(optionDiv);
        });
        
        const initialOption = hiddenSelect.options[hiddenSelect.selectedIndex];
        if(initialOption) {
            triggerSpan.textContent = initialOption.textContent;
        }

        const customOptions = optionsContainer.querySelectorAll('.custom-option');
        trigger.addEventListener('click', () => wrapper.classList.toggle('open'));
        
        customOptions.forEach(option => {
            option.addEventListener('click', () => {
                triggerSpan.textContent = option.textContent;
                hiddenSelect.value = option.dataset.value;
                wrapper.classList.remove('open');
            });
        });
    }

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
});