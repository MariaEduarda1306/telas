// js/gerenciar-usuarios.js

document.addEventListener('DOMContentLoaded', () => {

    const usersTbody = document.getElementById('users-tbody');
    const userModal = document.getElementById('user-modal');
    const deleteModal = document.getElementById('delete-modal');
    const userForm = document.getElementById('user-form');
    let userIdToDelete = null;

    // =======================================================
    // READ - LER E RENDERIZAR USUÁRIOS
    // =======================================================
    async function fetchAndRenderUsers() {
        usersTbody.innerHTML = '<tr><td colspan="5">Carregando usuários...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/api/usuarios`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar usuários.');

            const result = await response.json();
            usersTbody.innerHTML = '';

            result.data.forEach(user => {
                const row = usersTbody.insertRow();
                row.innerHTML = `
                    <td data-label="Nome Completo">${user.nome}</td>
                    <td data-label="Email">${user.email}</td>
                    <td data-label="Matrícula/ID">${user.matricula}</td>
                    <td data-label="Papel">${getRoleBadge(user.tipo)}</td>
                    <td class="action-cell">
                        <button class="action-btn btn-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        ${user.id !== loggedInUser.id ? '<button class="action-btn btn-delete" title="Remover"><i class="fas fa-trash"></i></button>' : ''}
                    </td>
                `;
                row.querySelector('.btn-edit').addEventListener('click', () => openEditModal(user));
                const deleteBtn = row.querySelector('.btn-delete');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => openDeleteModal(user.id, user.nome));
                }
            });
        } catch (error) {
            usersTbody.innerHTML = `<tr><td colspan="5" style="color:var(--status-reprovado)">${error.message}</td></tr>`;
        }
    }
    
    // =======================================================
    // CREATE / UPDATE - ADICIONAR E EDITAR USUÁRIOS
    // =======================================================
    document.getElementById('add-user-btn').addEventListener('click', () => {
        userForm.reset();
        document.getElementById('user-id').value = '';
        document.getElementById('modal-title').textContent = 'Adicionar Novo Usuário';
        
        // Reseta os custom selects para o padrão
        updateCustomSelectUI(document.getElementById('curso'), "");
        updateCustomSelectUI(document.getElementById('fase'), "");
        
        toggleConditionalFields();
        userModal.showModal();
    });

    function openEditModal(user) {
        userForm.reset();
        document.getElementById('modal-title').textContent = 'Editar Usuário';
        document.getElementById('user-id').value = user.id;
        document.getElementById('nome').value = user.nome;
        document.getElementById('email').value = user.email;
        document.getElementById('matricula').value = user.matricula;
        document.getElementById('papel').value = user.tipo;

        // Define os valores e atualiza a UI dos custom selects
        const cursoSelect = document.getElementById('curso');
        cursoSelect.value = user.curso_id || '';
        updateCustomSelectUI(cursoSelect);

        const faseSelect = document.getElementById('fase');
        faseSelect.value = user.fase || '';
        updateCustomSelectUI(faseSelect);
        
        toggleConditionalFields();
        userModal.showModal();
    }

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('user-id').value;
        const isEditing = !!userId;

        const data = {
            nome: document.getElementById('nome').value,
            matricula: document.getElementById('matricula').value,
            email: document.getElementById('email').value,
            tipo: document.getElementById('papel').value,
            curso_id: document.getElementById('curso').value || null,
            fase: document.getElementById('fase').value || null,
        };

        const senha = document.getElementById('senha').value;
        if (senha) data.password = senha;

        const url = isEditing ? `${API_BASE_URL}/api/usuarios/${userId}` : `${API_BASE_URL}/api/usuarios`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Falha ao salvar usuário.');
            
            userModal.close();
            fetchAndRenderUsers();
        } catch (error) {
            // ALTERADO AQUI
            showToast(error.message, 'error');
        }
    });

    // =======================================================
    // DELETE - REMOVER USUÁRIO
    // =======================================================
    function openDeleteModal(id, name) {
        userIdToDelete = id;
        document.getElementById('delete-user-name').textContent = name;
        deleteModal.showModal();
    }

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        if (!userIdToDelete) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/usuarios/${userIdToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao remover usuário.');

            deleteModal.close();
            fetchAndRenderUsers();
        } catch (error) {
            // ALTERADO AQUI
            showToast(error.message, 'error');
        }
    });

    // =======================================================
    // LÓGICA AUXILIAR E CUSTOM SELECTS
    // =======================================================
    const papelSelect = document.getElementById('papel');
    const cursoGroup = document.getElementById('curso-group');
    const faseGroup = document.getElementById('fase-group');

    function toggleConditionalFields() {
        const papel = papelSelect.value;
        cursoGroup.classList.toggle('hidden', papel !== 'ALUNO' && papel !== 'COORDENADOR');
        faseGroup.classList.toggle('hidden', papel !== 'ALUNO');
    }
    papelSelect.addEventListener('change', toggleConditionalFields);
    
    async function populateCourseSelects() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cursos`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) return;

            const result = await response.json();
            const modalSelect = document.getElementById('curso');
            const optionsContainer = modalSelect.nextElementSibling.querySelector('.custom-options');
            
            modalSelect.innerHTML = '<option value="">Selecione um curso...</option>';
            optionsContainer.innerHTML = '<div class="custom-option" data-value="">Selecione um curso...</div>';
            
            result.data.forEach(curso => {
                modalSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
                optionsContainer.insertAdjacentHTML('beforeend', `<div class="custom-option" data-value="${curso.id}">${curso.nome}</div>`);
            });
        } catch (error) { console.error("Erro ao popular cursos:", error); }
    }

    function getRoleBadge(role) {
        if (!role) return '';
        const roleLower = role.toLowerCase();
        const roleText = role.charAt(0) + roleLower.slice(1);
        return `<span class="role-badge role-${roleLower.split('_')[0]}">${roleText}</span>`;
    }

    document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()));
    
    // Função para criar e controlar os selects personalizados
    function setupCustomSelect(wrapper) {
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const optionsContainer = wrapper.querySelector('.custom-options');
        const hiddenSelect = wrapper.previousElementSibling;
        const triggerSpan = trigger.querySelector('span');
        
        // Atualiza a lista de opções do 'Fase' (que é estático)
        if (hiddenSelect.id === 'fase') {
             optionsContainer.innerHTML = '';
             Array.from(hiddenSelect.options).forEach(option => {
                 optionsContainer.insertAdjacentHTML('beforeend', `<div class="custom-option" data-value="${option.value}">${option.textContent}</div>`);
             });
        }

        const options = optionsContainer.querySelectorAll('.custom-option');

        trigger.addEventListener('click', () => {
            wrapper.classList.toggle('open');
        });

        options.forEach(option => {
            option.addEventListener('click', () => {
                triggerSpan.textContent = option.textContent;
                hiddenSelect.value = option.dataset.value;
                hiddenSelect.dispatchEvent(new Event('change'));
                wrapper.classList.remove('open');
            });
        });
    }
    
    // Função para atualizar a UI do select
    function updateCustomSelectUI(selectElement, value) {
        const triggerSpan = selectElement.nextElementSibling.querySelector('span');
        
        let selectedOption;
        if (value !== undefined) {
             selectedOption = selectElement.querySelector(`option[value="${value || ''}"]`);
        } else {
             selectedOption = selectElement.options[selectElement.selectedIndex];
        }

        if (selectedOption) {
            triggerSpan.textContent = selectedOption.textContent;
        } else {
            // Valor padrão caso não encontre
            triggerSpan.textContent = 'Selecione...';
        }
    }

    // Fecha o dropdown se clicar fora
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
            }
        });
    });

    // =======================================================
    // INICIALIZAÇÃO
    // =======================================================
    populateCourseSelects();
    fetchAndRenderUsers();
    document.querySelectorAll('.custom-select-wrapper').forEach(setupCustomSelect);
});