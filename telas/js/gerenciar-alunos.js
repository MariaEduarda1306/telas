// js/gerenciar-alunos.js

document.addEventListener('DOMContentLoaded', () => {

    const studentsTbody = document.getElementById('students-tbody');
    const studentModal = document.getElementById('student-modal');
    const deleteModal = document.getElementById('delete-modal');
    const studentForm = document.getElementById('student-form');
    let studentIdToDelete = null;
    let cursosCarregados = false;
    
    // Variável global para dados
    let allStudentsData = []; 

    // ============================
    // MÁSCARA DE CPF
    // ============================
    function formatCPF(value) {
        value = value.replace(/\D/g, '');
        value = value.slice(0, 11);
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        return value;
    }

    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            const cursorPos = e.target.selectionStart;
            const oldLength = e.target.value.length;
            e.target.value = formatCPF(e.target.value);
            const newLength = e.target.value.length;
            e.target.setSelectionRange(cursorPos + (newLength - oldLength), cursorPos + (newLength - oldLength));
        });
    }

    function toggleError(element, hasError) {
        if (!element) return;
        if (hasError) {
            element.classList.add('input-error', 'shake');
            setTimeout(() => element.classList.remove('shake'), 500);
        } else {
            element.classList.remove('input-error', 'shake');
        }
    }

    // =======================================================
    // READ - CARREGAR DADOS
    // =======================================================
    async function fetchStudents() {
        studentsTbody.innerHTML = '<tr><td colspan="6">Carregando alunos...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/api/usuarios?tipo=ALUNO`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Falha ao carregar alunos.');

            const result = await response.json();
            allStudentsData = result.data || result;

            if (!Array.isArray(allStudentsData)) allStudentsData = [];

            renderStudentsTable();

        } catch (error) {
            studentsTbody.innerHTML = `<tr><td colspan="6" style="color:var(--status-reprovado)">${error.message}</td></tr>`;
        }
    }

    // =======================================================
    // RENDERIZAR TABELA (Filtro Local)
    // =======================================================
    function renderStudentsTable() {
        const nomeFilter = document.getElementById('filtro-nome').value.toLowerCase().trim();
        const matriculaFilter = document.getElementById('filtro-matricula').value.trim();
        const cursoFilter = document.getElementById('filtro-curso').value;
        
        const filteredStudents = allStudentsData.filter(aluno => {
            const matchNome = !nomeFilter || (aluno.nome && aluno.nome.toLowerCase().includes(nomeFilter));
            const matchMatricula = !matriculaFilter || (String(aluno.matricula || '').includes(matriculaFilter));
            
            const alunoCursoId = aluno.curso?.id || aluno.curso_id;
            const matchCurso = !cursoFilter || (String(alunoCursoId) === String(cursoFilter));

            return matchNome && matchMatricula && matchCurso;
        });

        studentsTbody.innerHTML = '';

        if (filteredStudents.length === 0) {
            studentsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum aluno encontrado.</td></tr>';
            return;
        }

        filteredStudents.forEach(aluno => {
            const row = studentsTbody.insertRow();
            row.innerHTML = `
                <td data-label="Nome Completo">${aluno.nome}</td>
                <td data-label="Matrícula">${aluno.matricula || '--'}</td>
                <td data-label="Email">${aluno.email}</td>
                <td data-label="Curso">${aluno.curso?.nome || 'N/A'}</td>
                <td data-label="Fase">${aluno.fase ? aluno.fase + 'ª' : 'N/A'}</td>
                <td class="action-cell">
                    <button class="action-btn btn-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    <button class="action-btn btn-delete" title="Remover"><i class="fas fa-trash"></i></button>
                </td>
            `;
            row.querySelector('.btn-edit').addEventListener('click', () => openEditModal(aluno));
            row.querySelector('.btn-delete').addEventListener('click', () => openDeleteModal(aluno.id, aluno.nome));
        });
    }

    // =======================================================
    // EVENTOS DOS BOTÕES DE FILTRO
    // =======================================================
    
    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            renderStudentsTable();
        });
    }

    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('filtro-nome').value = '';
            document.getElementById('filtro-matricula').value = '';
            document.getElementById('filtro-curso').value = '';
            
            renderStudentsTable();
        });
    }

    // =======================================================
    // CRUD: CREATE / UPDATE
    // =======================================================
    function clearFormErrors() {
        studentForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error', 'shake'));
    }

    document.getElementById('add-student-btn').addEventListener('click', () => {
        studentForm.reset();
        clearFormErrors();
        document.getElementById('student-id').value = '';
        document.getElementById('modal-title').textContent = 'Adicionar Novo Aluno';
        
        const dataNascInput = document.getElementById('data_nascimento');
        const passwordGroup = document.getElementById('password-group');
        if (dataNascInput) {
            dataNascInput.parentElement.classList.remove('hidden');
            dataNascInput.value = '';
        }
        if (passwordGroup) passwordGroup.classList.add('hidden');
        
        studentModal.showModal();
    });

    function openEditModal(aluno) {
        if (!cursosCarregados) {
            setTimeout(() => openEditModal(aluno), 100);
            return;
        }
        studentForm.reset();
        clearFormErrors();
        document.getElementById('modal-title').textContent = 'Editar Aluno';
        document.getElementById('student-id').value = aluno.id;
        document.getElementById('nome').value = aluno.nome || '';
        document.getElementById('cpf').value = aluno.cpf ? formatCPF(aluno.cpf) : '';
        document.getElementById('matricula').value = aluno.matricula || '';
        document.getElementById('email').value = aluno.email || '';

        const cursoSelect = document.getElementById('curso');
        const cursoId = aluno.curso_id || aluno.curso?.id;
        if (cursoSelect && cursoId != null) {
            cursoSelect.value = String(cursoId);
        }

        document.getElementById('fase').value = aluno.fase || '';
        
        const dataNascInput = document.getElementById('data_nascimento');
        if (dataNascInput) dataNascInput.parentElement.classList.add('hidden'); 

        const passwordGroup = document.getElementById('password-group');
        if (passwordGroup) passwordGroup.classList.remove('hidden');

        studentModal.showModal();
    }

    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentId = document.getElementById('student-id').value;
        const isEditing = !!studentId;

        const nomeInput = document.getElementById('nome');
        const matriculaInput = document.getElementById('matricula');
        if (!nomeInput.value.trim() || !matriculaInput.value.trim()) {
            showToast('Preencha os campos obrigatórios', 'error');
            return;
        }

        const data = {
            nome: nomeInput.value,
            matricula: matriculaInput.value,
            email: document.getElementById('email').value,
            cpf: document.getElementById('cpf').value.replace(/\D/g, ''),
            curso_id: document.getElementById('curso').value,
            fase: document.getElementById('fase').value,
            tipo: 'ALUNO'
        };

        const dataNascInput = document.getElementById('data_nascimento');
        if (!isEditing && dataNascInput.value) {
            data.data_nascimento = dataNascInput.value;
            const [y, m, d] = data.data_nascimento.split('-');
            data.password = `${d}${m}${y}`;
        }
        
        const passwordInput = document.getElementById('password');
        if (isEditing && passwordInput && passwordInput.value) {
            data.password = passwordInput.value;
        }

        const url = isEditing ? `${API_BASE_URL}/api/usuarios/${studentId}` : `${API_BASE_URL}/api/usuarios`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao salvar');

            showToast(`Aluno ${isEditing ? 'atualizado' : 'cadastrado'}!`);
            studentModal.close();
            fetchStudents(); 
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // =======================================================
    // DELETE
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
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('Erro ao deletar');
            
            showToast('Aluno removido.');
            deleteModal.close();
            fetchStudents();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // =======================================================
    // INICIALIZAÇÃO E POPULAR SELECTS
    // =======================================================
    async function populateCourseSelects() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cursos`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) return;
            const result = await response.json();
            const cursos = result.data || result;

            const filterSelect = document.getElementById('filtro-curso');
            const modalSelect = document.getElementById('curso');

            cursos.forEach(curso => {
                if (filterSelect) filterSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
                if (modalSelect) modalSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
            });
            cursosCarregados = true;
        } catch (e) { console.error(e); }
    }

    document.querySelectorAll('.close-btn').forEach(btn =>
        btn.addEventListener('click', () => btn.closest('dialog').close())
    );

    (async () => {
        await populateCourseSelects();
        fetchStudents(); 
    })();
});