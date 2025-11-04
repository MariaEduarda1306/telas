// js/gerenciar-usuarios.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. SEGURANÇA E SELEÇÃO DE ELEMENTOS
    const authToken = localStorage.getItem('authToken');
    const loggedInUser = JSON.parse(localStorage.getItem('userData'));
    if (!authToken || !loggedInUser) {
        window.location.href = 'index.html';
        return;
    }

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
            const response = await fetch('http://localhost:8000/api/usuarios', {
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
        toggleConditionalFields(); // Garante o estado inicial correto dos campos
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
        document.getElementById('curso').value = user.curso_id || '';
        document.getElementById('fase').value = user.fase || '';
        toggleConditionalFields(); // Ajusta a visibilidade dos campos com base no papel do usuário
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
        if (senha) data.password = senha; // Só envia a senha se for preenchida

        const url = isEditing ? `http://localhost:8000/api/usuarios/${userId}` : 'http://localhost:8000/api/usuarios';
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
            alert(error.message);
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
            const response = await fetch(`http://localhost:8000/api/usuarios/${userIdToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao remover usuário.');

            deleteModal.close();
            fetchAndRenderUsers();
        } catch (error) {
            alert(error.message);
        }
    });

    // =======================================================
    // LÓGICA AUXILIAR
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
            const response = await fetch('http://localhost:8000/api/cursos', {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) return;

            const result = await response.json();
            const modalSelect = document.getElementById('curso');
            modalSelect.innerHTML = '<option value="">Selecione um curso...</option>'; // Limpa e adiciona opção padrão
            
            result.data.forEach(curso => {
                modalSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
            });
        } catch (error) { console.error("Erro ao popular cursos:", error); }
    }

    function getRoleBadge(role) {
        const roleLower = role.toLowerCase();
        const roleText = role.charAt(0) + roleLower.slice(1);
        return `<span class="role-badge role-${roleLower.split('_')[0]}">${roleText}</span>`;
    }

    document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()));
    
    // =======================================================
    // INICIALIZAÇÃO
    // =======================================================
    populateCourseSelects();
    fetchAndRenderUsers();
});