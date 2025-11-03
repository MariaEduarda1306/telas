// js/gerenciar-alunos.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. SEGURANÇA E SELEÇÃO DE ELEMENTOS
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }

    const studentsTbody = document.getElementById('students-tbody');
    const studentModal = document.getElementById('student-modal');
    const deleteModal = document.getElementById('delete-modal');
    const studentForm = document.getElementById('student-form');
    let studentIdToDelete = null;

    // =======================================================
    // READ - LER E RENDERIZAR ALUNOS
    // =======================================================
    async function fetchAndRenderStudents(queryParams = '') {
        studentsTbody.innerHTML = '<tr><td colspan="6">Carregando alunos...</td></tr>';
        try {
            const response = await fetch(`http://localhost:8000/api/usuarios?tipo=ALUNO&${queryParams}`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar alunos.');

            const result = await response.json();
            studentsTbody.innerHTML = '';
            
            if (result.data.length === 0) {
                studentsTbody.innerHTML = '<tr><td colspan="6">Nenhum aluno encontrado.</td></tr>';
                return;
            }

            result.data.forEach(aluno => {
                const row = studentsTbody.insertRow();
                row.innerHTML = `
                    <td data-label="Nome Completo">${aluno.nome}</td>
                    <td data-label="Matrícula">${aluno.matricula}</td>
                    <td data-label="Email">${aluno.email}</td>
                    <td data-label="Curso">${aluno.curso?.nome || 'N/A'}</td>
                    <td data-label="Fase">${aluno.fase ? aluno.fase + 'ª' : 'N/A'}</td>
                    <td class="action-cell">
                        <button class="action-btn btn-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="action-btn btn-delete" title="Remover"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                // Adiciona eventos aos botões de ação
                row.querySelector('.btn-edit').addEventListener('click', () => openEditModal(aluno));
                row.querySelector('.btn-delete').addEventListener('click', () => openDeleteModal(aluno.id, aluno.nome));
            });
        } catch (error) {
            studentsTbody.innerHTML = `<tr><td colspan="6" style="color:var(--status-reprovado)">${error.message}</td></tr>`;
        }
    }
    
    // =======================================================
    // CREATE / UPDATE - ADICIONAR E EDITAR ALUNOS
    // =======================================================
    // Abrir modal para ADICIONAR
    document.getElementById('add-student-btn').addEventListener('click', () => {
        studentForm.reset();
        document.getElementById('student-id').value = ''; // Garante que o ID esteja limpo
        document.getElementById('modal-title').textContent = 'Adicionar Novo Aluno';
        studentModal.showModal();
    });

    // Abrir modal para EDITAR
    function openEditModal(aluno) {
        studentForm.reset();
        document.getElementById('modal-title').textContent = 'Editar Aluno';
        document.getElementById('student-id').value = aluno.id; // Define o ID para modo de edição
        document.getElementById('nome').value = aluno.nome;
        document.getElementById('matricula').value = aluno.matricula;
        document.getElementById('email').value = aluno.email;
        document.getElementById('curso').value = aluno.curso_id;
        document.getElementById('fase').value = aluno.fase;
        studentModal.showModal();
    }

    // Lógica do SUBMIT do formulário (cria ou atualiza)
    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentId = document.getElementById('student-id').value;
        const isEditing = !!studentId;

        const data = {
            nome: document.getElementById('nome').value,
            matricula: document.getElementById('matricula').value,
            email: document.getElementById('email').value,
            curso_id: document.getElementById('curso').value,
            fase: document.getElementById('fase').value,
            tipo: 'ALUNO', // Sempre criar como aluno
        };

        const url = isEditing ? `http://localhost:8000/api/usuarios/${studentId}` : 'http://localhost:8000/api/usuarios';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error( (await response.json()).message || 'Falha ao salvar aluno.');
            
            studentModal.close();
            fetchAndRenderStudents(); // Recarrega a lista
        } catch (error) {
            alert(error.message);
        }
    });

    // =======================================================
    // DELETE - REMOVER ALUNO
    // =======================================================
    function openDeleteModal(id, name) {
        studentIdToDelete = id;
        document.getElementById('delete-student-name').textContent = name;
        deleteModal.showModal();
    }

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        if (!studentIdToDelete) return;
        try {
            const response = await fetch(`http://localhost:8000/api/usuarios/${studentIdToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao remover aluno.');

            deleteModal.close();
            fetchAndRenderStudents(); // Recarrega a lista
        } catch (error) {
            alert(error.message);
        }
    });

    // =======================================================
    // LÓGICA AUXILIAR (FILTROS, MODAIS, ETC.)
    // =======================================================
    // Popular selects de curso
    async function populateCourseSelects() {
        try {
            const response = await fetch('http://localhost:8000/api/cursos', {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) return;

            const result = await response.json();
            const filterSelect = document.getElementById('filtro-curso');
            const modalSelect = document.getElementById('curso');
            
            result.data.forEach(curso => {
                // Adiciona ao filtro
                filterSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
                // Adiciona ao modal
                modalSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
            });
        } catch (error) { console.error("Erro ao popular cursos:", error); }
    }

    // Filtros
    document.getElementById('filter-btn').addEventListener('click', () => {
        const params = new URLSearchParams();
        const nome = document.getElementById('filtro-nome').value;
        const matricula = document.getElementById('filtro-matricula').value;
        const curso = document.getElementById('filtro-curso').value;
        const fase = document.getElementById('filtro-fase').value;
        if(nome) params.append('nome', nome);
        if(matricula) params.append('matricula', matricula);
        if(curso) params.append('curso_id', curso);
        if(fase) params.append('fase', fase);
        fetchAndRenderStudents(params.toString());
    });

    // Limpar filtros
    document.getElementById('clear-filters-btn').addEventListener('click', () => {
        document.getElementById('filter-form').reset();
        fetchAndRenderStudents();
    });

    // Fechar modais
    document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()));
    
    // =======================================================
    // INICIALIZAÇÃO
    // =======================================================
    populateCourseSelects();
    fetchAndRenderStudents();
});