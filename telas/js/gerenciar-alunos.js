// js/gerenciar-alunos.js

document.addEventListener('DOMContentLoaded', () => {

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
            const response = await fetch(`${API_BASE_URL}/api/usuarios?tipo=ALUNO&${queryParams}`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar alunos.');

            const result = await response.json();
            // MELHORIA: Tratamento robusto para paginação ou array direto
            const students = result.data || result;

            studentsTbody.innerHTML = '';
            
            if (students.length === 0) {
                studentsTbody.innerHTML = '<tr><td colspan="6">Nenhum aluno encontrado.</td></tr>';
                return;
            }

            students.forEach(aluno => {
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
        document.getElementById('student-id').value = ''; 
        document.getElementById('modal-title').textContent = 'Adicionar Novo Aluno';
        
        // Se houver campo de data de nascimento, torna obrigatório na criação
        const dataNascInput = document.getElementById('data_nascimento');
        if (dataNascInput) {
            dataNascInput.required = true;
            dataNascInput.parentElement.classList.remove('hidden');
        }

        studentModal.showModal();
    });

    // Abrir modal para EDITAR
    function openEditModal(aluno) {
        studentForm.reset();
        document.getElementById('modal-title').textContent = 'Editar Aluno';
        document.getElementById('student-id').value = aluno.id;
        document.getElementById('nome').value = aluno.nome;
        document.getElementById('matricula').value = aluno.matricula;
        document.getElementById('email').value = aluno.email;
        document.getElementById('curso').value = aluno.curso_id;
        document.getElementById('fase').value = aluno.fase;

        // Na edição, a data de nascimento (senha) não é obrigatória
        const dataNascInput = document.getElementById('data_nascimento');
        if (dataNascInput) {
            dataNascInput.required = false;
            // Opcional: Esconder o campo na edição se desejar
            // dataNascInput.parentElement.classList.add('hidden'); 
        }

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
            tipo: 'ALUNO', 
        };

        // CORREÇÃO CRÍTICA: Geração de senha padrão (DDMMAAAA) na criação
        if (!isEditing) {
            const dataNascInput = document.getElementById('data_nascimento');
            
            if (dataNascInput && dataNascInput.value) {
                const rawDate = dataNascInput.value; // YYYY-MM-DD
                data.data_nascimento = rawDate;

                // Formata para DDMMAAAA para ser a senha inicial
                const [year, month, day] = rawDate.split('-');
                data.password = `${day}${month}${year}`;
            } else {
                // Fallback caso o usuário não tenha adicionado o input no HTML ainda
                // (Isso evita que o JS quebre, mas a API pode rejeitar por falta de senha)
                console.warn('Campo data_nascimento não encontrado ou vazio. Senha não gerada.');
            }
        }

        const url = isEditing ? `${API_BASE_URL}/api/usuarios/${studentId}` : `${API_BASE_URL}/api/usuarios`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || 'Falha ao salvar aluno.');
            
            showToast(`Aluno ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`);
            studentModal.close();
            fetchAndRenderStudents(); // Recarrega a lista
        } catch (error) {
            showToast(error.message, 'error');
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
            const response = await fetch(`${API_BASE_URL}/api/usuarios/${studentIdToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao remover aluno.');

            showToast('Aluno removido com sucesso.');
            deleteModal.close();
            fetchAndRenderStudents(); 
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // =======================================================
    // LÓGICA AUXILIAR (FILTROS, MODAIS, ETC.)
    // =======================================================
    // Popular selects de curso
    async function populateCourseSelects() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cursos`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) return;

            const result = await response.json();
            const cursos = result.data || result;

            const filterSelect = document.getElementById('filtro-curso');
            const modalSelect = document.getElementById('curso');
            
            cursos.forEach(curso => {
                // Adiciona ao filtro
                if(filterSelect) filterSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
                // Adiciona ao modal
                if(modalSelect) modalSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
            });
        } catch (error) { console.error("Erro ao popular cursos:", error); }
    }

    // Filtros
    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
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
    }

    // Limpar filtros
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            const form = document.getElementById('filter-form');
            if(form) form.reset();
            fetchAndRenderStudents();
        });
    }

    // Fechar modais
    document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()));
    
    // =======================================================
    // INICIALIZAÇÃO
    // =======================================================
    populateCourseSelects();
    fetchAndRenderStudents();
});