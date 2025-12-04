// js/gerenciar-alunos.js

document.addEventListener('DOMContentLoaded', () => {

    const studentsTbody = document.getElementById('students-tbody');
    const studentModal = document.getElementById('student-modal');
    const deleteModal = document.getElementById('delete-modal');
    const studentForm = document.getElementById('student-form');
    let studentIdToDelete = null;
    let cursosCarregados = false;

    // ============================
    // FUNÇÃO DE MÁSCARA DE CPF
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
            const diff = newLength - oldLength;
            e.target.setSelectionRange(cursorPos + diff, cursorPos + diff);
        });
    }

    // =======================================================
    // FUNÇÃO AUXILIAR: MARCAR/DESMARCAR ERRO (VISUAL)
    // =======================================================
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
    // READ - LER E RENDERIZAR ALUNOS
    // =======================================================
    async function fetchAndRenderStudents(queryParams = '') {
        studentsTbody.innerHTML = '<tr><td colspan="6">Carregando alunos...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/api/usuarios?tipo=ALUNO&${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Falha ao carregar alunos.');

            const result = await response.json();
            const students = result.data || result;

            studentsTbody.innerHTML = '';

            if (!Array.isArray(students) || students.length === 0) {
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
    
    // Limpa erros visuais ao abrir/resetar modal
    function clearFormErrors() {
        studentForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error', 'shake'));
    }

    // Abrir modal para ADICIONAR
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
        if (passwordGroup) {
            passwordGroup.classList.add('hidden');
        }

        studentModal.showModal();
    });

    // Abrir modal para EDITAR
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

        if (cursoSelect) {
            if (cursoId != null) {
                const valueToSet = String(cursoId);
                cursoSelect.value = valueToSet;
                const existeOption = Array.from(cursoSelect.options).some(opt => opt.value === valueToSet);
                if (!existeOption) cursoSelect.value = '';
            } else {
                cursoSelect.value = '';
            }
        }

        document.getElementById('fase').value = aluno.fase || '';

        const dataNascInput = document.getElementById('data_nascimento');
        const passwordGroup = document.getElementById('password-group');

        if (dataNascInput) {
            if (aluno.data_nascimento) dataNascInput.value = aluno.data_nascimento;
            dataNascInput.parentElement.classList.remove('hidden');
        }

        if (passwordGroup) {
            passwordGroup.classList.remove('hidden');
        }

        studentModal.showModal();
    }

    // SUBMIT do formulário (cria ou atualiza)
    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const studentId = document.getElementById('student-id').value;
        const isEditing = !!studentId;

        // --- SELETORES DOS CAMPOS ---
        const nomeInput = document.getElementById('nome');
        const cpfInput = document.getElementById('cpf');
        const matriculaInput = document.getElementById('matricula');
        const emailInput = document.getElementById('email');
        const cursoSelect = document.getElementById('curso');
        const faseSelect = document.getElementById('fase');
        const dataNascInput = document.getElementById('data_nascimento');

        let hasError = false;

        // --- VALIDAÇÃO VISUAL MANUAL ---
        
        // 1. Campos obrigatórios simples
        if (!nomeInput.value.trim()) { toggleError(nomeInput, true); hasError = true; } else { toggleError(nomeInput, false); }
        if (!matriculaInput.value.trim()) { toggleError(matriculaInput, true); hasError = true; } else { toggleError(matriculaInput, false); }
        if (!emailInput.value.trim()) { toggleError(emailInput, true); hasError = true; } else { toggleError(emailInput, false); }
        if (!cursoSelect.value) { toggleError(cursoSelect, true); hasError = true; } else { toggleError(cursoSelect, false); }
        if (!faseSelect.value) { toggleError(faseSelect, true); hasError = true; } else { toggleError(faseSelect, false); }

        // 2. Validação CPF
        const cpfRaw = cpfInput.value.replace(/\D/g, '');
        if (!cpfRaw || cpfRaw.length !== 11) {
            toggleError(cpfInput, true);
            hasError = true;
            if (cpfRaw.length > 0 && cpfRaw.length !== 11) showToast('CPF inválido.', 'error');
        } else {
            toggleError(cpfInput, false);
        }

        // 3. Validação Condicional Data Nascimento (Obrigatória se criando)
        if (!isEditing) {
            if (!dataNascInput.value) {
                toggleError(dataNascInput, true);
                hasError = true;
            } else {
                toggleError(dataNascInput, false);
            }
        }

        if (hasError) {
            showToast('Por favor, verifique os campos destacados.', 'error');
            return;
        }
        // --- FIM DA VALIDAÇÃO ---

        const data = {
            nome: nomeInput.value,
            matricula: matriculaInput.value,
            email: emailInput.value,
            cpf: cpfRaw,
            curso_id: cursoSelect.value,
            fase: faseSelect.value,
            tipo: 'ALUNO'
        };

        if (dataNascInput && dataNascInput.value) {
            data.data_nascimento = dataNascInput.value;
        }

        const passwordInput = document.getElementById('password');

        if (!isEditing) {
            if (dataNascInput && dataNascInput.value) {
                const [year, month, day] = dataNascInput.value.split('-');
                data.password = `${day}${month}${year}`;
            }
        } else {
            if (passwordInput && passwordInput.value) {
                data.password = passwordInput.value;
            }
        }

        const url = isEditing
            ? `${API_BASE_URL}/api/usuarios/${studentId}`
            : `${API_BASE_URL}/api/usuarios`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Falha ao salvar aluno.');
            }

            showToast(`Aluno ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`);
            studentModal.close();
            fetchAndRenderStudents();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // =======================================================
    // EVENTOS DE LIMPEZA DE ERRO (INPUT/CHANGE)
    // =======================================================
    studentForm.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', () => toggleError(input, false));
        input.addEventListener('change', () => toggleError(input, false));
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
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json'
                }
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
    // LÓGICA AUXILIAR
    // =======================================================
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

            if (!Array.isArray(cursos)) return;

            cursos.forEach(curso => {
                if (filterSelect) filterSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
                if (modalSelect) modalSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
            });

            cursosCarregados = true;
        } catch (error) {
            console.error('Erro ao popular cursos:', error);
        }
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

            if (nome) params.append('nome', nome);
            if (matricula) params.append('matricula', matricula);
            if (curso) params.append('curso_id', curso);
            if (fase) params.append('fase', fase);

            fetchAndRenderStudents(params.toString());
        });
    }

    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            const form = document.getElementById('filter-form');
            if (form) form.reset();
            fetchAndRenderStudents();
        });
    }

    document.querySelectorAll('.close-btn').forEach(btn =>
        btn.addEventListener('click', () => btn.closest('dialog').close())
    );

    (async () => {
        await populateCourseSelects();
        fetchAndRenderStudents();
    })();
});