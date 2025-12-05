// js/gerenciar-usuarios.js

document.addEventListener('DOMContentLoaded', () => {

    const usersTbody = document.getElementById('users-tbody');
    const userModal = document.getElementById('user-modal');
    const deleteModal = document.getElementById('delete-modal');
    const userForm = document.getElementById('user-form');
    let userIdToDelete = null;

    // Variável Global para filtragem local
    let allUsersData = [];

    // Garante que o navegador não tente validar nativamente
    userForm.setAttribute('novalidate', true);

    // Seletores do Formulário Modal
    const papelSelect = document.getElementById('papel');
    const cursoGroup = document.getElementById('curso-group');
    const faseGroup = document.getElementById('fase-group');
    const cursoSelect = document.getElementById('curso');
    const faseSelect = document.getElementById('fase');
    const nascimentoGroup = document.getElementById('nascimento-group');
    const passwordGroup = document.getElementById('password-group');

    // Seletores de Filtro
    const filterBtn = document.getElementById('filter-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

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

    // Aplica máscara no Modal E no Filtro
    const cpfInputs = [document.getElementById('cpf'), document.getElementById('filtro-cpf')];
    cpfInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', (e) => {
                const cursorPos = e.target.selectionStart;
                const oldLength = e.target.value.length;
                e.target.value = formatCPF(e.target.value);
                const newLength = e.target.value.length;
                const diff = newLength - oldLength;
                e.target.setSelectionRange(cursorPos + diff, cursorPos + diff);
            });
        }
    });

    // =======================================================
    // FUNÇÃO AUXILIAR: MARCAR/DESMARCAR ERRO (VISUAL)
    // =======================================================
    function toggleError(element, hasError) {
        if (!element) return;
        
        let target = element;
        if (element.tagName === 'SELECT' && element.classList.contains('hidden-select')) {
            const wrapper = element.nextElementSibling;
            if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                target = wrapper.querySelector('.custom-select-trigger') || wrapper;
            }
        }

        if (hasError) {
            target.classList.add('input-error', 'shake');
            setTimeout(() => target.classList.remove('shake'), 500);
        } else {
            target.classList.remove('input-error', 'shake');
        }
    }

    function clearFormErrors() {
        userForm.querySelectorAll('.input-error, .shake').forEach(el => {
            el.classList.remove('input-error', 'shake');
        });
    }

    function toInputDateFormat(dateStr) {
        if (!dateStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [dia, mes, ano] = parts;
            return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        return '';
    }

    // =======================================================
    // ETAPA 1: BUSCAR TODOS OS USUÁRIOS
    // =======================================================
    async function fetchUsers() {
        usersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando usuários...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/api/usuarios`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });

            if (response.status === 401 || response.status === 403) {
                window.location.href = 'index.html';
                return;
            }

            if (!response.ok) throw new Error('Falha ao carregar usuários.');

            const result = await response.json();
            // Salva na memória global
            allUsersData = result.data || result;

            if (!Array.isArray(allUsersData)) allUsersData = [];

            // Chama a renderização inicial
            renderUsersTable();

        } catch (error) {
            usersTbody.innerHTML = `<tr><td colspan="6" style="color:var(--status-reprovado)">${error.message}</td></tr>`;
        }
    }

    // =======================================================
    // ETAPA 2: FILTRAR E RENDERIZAR
    // =======================================================
    function renderUsersTable() {
        // 1. Pega valores dos filtros
        const nomeFilter = document.getElementById('filtro-nome').value.toLowerCase().trim();
        const cpfFilter = document.getElementById('filtro-cpf').value.replace(/\D/g, ''); // Remove pontuação
        const papelFilter = document.getElementById('filtro-papel').value;

        // 2. Filtra array da memória
        const filteredUsers = allUsersData.filter(user => {
            const userCpf = user.cpf ? user.cpf.replace(/\D/g, '') : '';
            
            const matchNome = !nomeFilter || (user.nome && user.nome.toLowerCase().includes(nomeFilter));
            const matchCpf = !cpfFilter || userCpf.includes(cpfFilter);
            const matchPapel = !papelFilter || (user.tipo === papelFilter);

            return matchNome && matchCpf && matchPapel;
        });

        // 3. Renderiza
        usersTbody.innerHTML = '';

        if (filteredUsers.length === 0) {
            usersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum usuário encontrado.</td></tr>';
            return;
        }

        filteredUsers.forEach(user => {
            const row = usersTbody.insertRow();
            row.innerHTML = `
                <td data-label="Nome">${user.nome}</td>
                <td data-label="CPF">${user.cpf || 'Sem CPF'}</td>
                <td data-label="Email">${user.email}</td>
                <td data-label="ID">${user.matricula || '-'}</td>
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
    }

    // =======================================================
    // EVENTOS DE FILTRO
    // =======================================================
    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            renderUsersTable();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Limpa inputs
            document.getElementById('filtro-nome').value = '';
            document.getElementById('filtro-cpf').value = '';
            
            // Limpa Select Customizado
            const papelSelectFilter = document.getElementById('filtro-papel');
            papelSelectFilter.value = '';
            const triggerSpan = papelSelectFilter.nextElementSibling.querySelector('.custom-select-trigger span');
            if (triggerSpan) triggerSpan.textContent = 'Todos';

            renderUsersTable();
        });
    }

    // =======================================================
    // LÓGICA DE CAMPOS CONDICIONAIS (Curso e Fase)
    // =======================================================
    function toggleConditionalFields() {
        const papel = papelSelect.value;
        const isAluno = papel === 'ALUNO';
        const isCoord = papel === 'COORDENADOR';

        if (cursoGroup) cursoGroup.classList.toggle('hidden', !isAluno && !isCoord);
        if (faseGroup) faseGroup.classList.toggle('hidden', !isAluno);

        if (!isAluno && !isCoord) toggleError(cursoSelect, false);
        if (!isAluno) toggleError(faseSelect, false);

        if (cursoSelect && !isAluno && !isCoord) {
            cursoSelect.value = "";
            updateCustomSelectUI(cursoSelect, "");
        }
        if (faseSelect && !isAluno) {
            faseSelect.value = "";
            updateCustomSelectUI(faseSelect, "");
        }
    }

    if (papelSelect) papelSelect.addEventListener('change', toggleConditionalFields);

    // =======================================================
    // MODAL ACTIONS
    // =======================================================
    document.getElementById('add-user-btn').addEventListener('click', () => {
        userForm.reset();
        clearFormErrors();
        document.getElementById('user-id').value = '';
        document.getElementById('modal-title').textContent = 'Adicionar Novo Usuário';

        if (cursoSelect) updateCustomSelectUI(cursoSelect, "");
        if (faseSelect) updateCustomSelectUI(faseSelect, "");
        if (papelSelect) updateCustomSelectUI(papelSelect, "");

        toggleConditionalFields();

        if (nascimentoGroup) nascimentoGroup.classList.remove('hidden');
        if (passwordGroup) passwordGroup.classList.add('hidden');

        userModal.showModal();
    });

    function openEditModal(user) {
        userForm.reset();
        clearFormErrors();
        document.getElementById('modal-title').textContent = 'Editar Usuário';
        document.getElementById('user-id').value = user.id;

        document.getElementById('nome').value = user.nome;
        document.getElementById('email').value = user.email;
        document.getElementById('cpf').value = user.cpf ? formatCPF(user.cpf) : '';
        document.getElementById('matricula').value = user.matricula || '';
        document.getElementById('papel').value = user.tipo;

        const nascimentoInput = document.getElementById('data_nascimento');
        if (nascimentoInput) {
            nascimentoInput.value = user.data_nascimento ? toInputDateFormat(user.data_nascimento) : '';
        }

        updateCustomSelectUI(papelSelect, user.tipo);

        if (cursoSelect) {
            const cursoId = user.curso_id || (user.curso && user.curso.id) || '';
            cursoSelect.value = cursoId;
            updateCustomSelectUI(cursoSelect, cursoId);
        }

        if (faseSelect) {
            const faseVal = user.fase || '';
            faseSelect.value = faseVal;
            updateCustomSelectUI(faseSelect, faseVal);
        }

        toggleConditionalFields();

        if (nascimentoGroup) nascimentoGroup.classList.remove('hidden');
        if (passwordGroup) passwordGroup.classList.remove('hidden');

        userModal.showModal();
    }

    // =======================================================
    // SUBMIT (CREATE / UPDATE)
    // =======================================================
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = document.getElementById('user-id').value;
        const isEditing = !!userId;
        
        const nomeInput = document.getElementById('nome');
        const emailInput = document.getElementById('email');
        const cpfInput = document.getElementById('cpf');
        const matriculaInput = document.getElementById('matricula');
        const dataNascInput = document.getElementById('data_nascimento');

        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim();
        const cpfRaw = cpfInput.value.replace(/\D/g, '');
        const matricula = matriculaInput.value.trim();
        const papel = papelSelect.value;
        const dataNascimento = dataNascInput.value;

        let hasError = false;

        if (!nome) { toggleError(nomeInput, true); hasError = true; } else { toggleError(nomeInput, false); }
        if (!email) { toggleError(emailInput, true); hasError = true; } else { toggleError(emailInput, false); }
        if (!matricula) { toggleError(matriculaInput, true); hasError = true; } else { toggleError(matriculaInput, false); }
        if (!papel) { toggleError(papelSelect, true); hasError = true; } else { toggleError(papelSelect, false); }

        if (!cpfRaw || cpfRaw.length !== 11) { 
            toggleError(cpfInput, true); 
            hasError = true; 
            if(cpfRaw.length > 0) showToast('CPF inválido.', 'error');
        } else { 
            toggleError(cpfInput, false); 
        }

        // Validações Condicionais (Curso/Fase)
        if (cursoGroup && !cursoGroup.classList.contains('hidden')) {
            if (!cursoSelect.value) { toggleError(cursoSelect, true); hasError = true; } 
            else { toggleError(cursoSelect, false); }
        }
        if (faseGroup && !faseGroup.classList.contains('hidden')) {
            if (!faseSelect.value) { toggleError(faseSelect, true); hasError = true; } 
            else { toggleError(faseSelect, false); }
        }
        if (!isEditing) {
            if (!dataNascimento) { toggleError(dataNascInput, true); hasError = true; } 
            else { toggleError(dataNascInput, false); }
        }

        if (hasError) {
            showToast('Por favor, verifique os campos destacados.', 'error');
            return;
        }

        const payload = {
            nome: nome,
            email: email,
            cpf: cpfRaw,
            matricula: matricula,
            tipo: papel,
            curso_id: (!cursoGroup.classList.contains('hidden') && cursoSelect.value) ? cursoSelect.value : null,
            fase: (!faseGroup.classList.contains('hidden') && faseSelect.value) ? faseSelect.value : null,
        };

        if (isEditing) {
            const password = document.getElementById('password').value;
            if (password && password.trim() !== '') {
                payload.password = password;
            }
            if (dataNascimento) payload.data_nascimento = dataNascimento;
        } else {
            payload.data_nascimento = dataNascimento;
        }

        const url = isEditing ? `${API_BASE_URL}/api/usuarios/${userId}` : `${API_BASE_URL}/api/usuarios`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 
                    'Authorization': `Bearer ${authToken}`, 
                    'Content-Type': 'application/json', 
                    'Accept': 'application/json' 
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 422 && result.errors) {
                    let msg = "Erro de validação:\n";
                    for (const [key, msgs] of Object.entries(result.errors)) {
                        msg += `- ${msgs[0]}\n`;
                    }
                    throw new Error(msg);
                }
                throw new Error(result.message || 'Falha ao salvar usuário.');
            }

            showToast(`Usuário ${isEditing ? 'atualizado' : 'criado'} com sucesso!`, 'success');
            userModal.close();
            fetchUsers(); // Recarrega para atualizar a lista
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // Listeners de limpeza de erro
    userForm.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', () => toggleError(input, false));
        input.addEventListener('change', () => toggleError(input, false));
    });

    // =======================================================
    // DELETE
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

            showToast('Usuário removido com sucesso.', 'success');
            deleteModal.close();
            fetchUsers();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    async function populateCourseSelects() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cursos`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) return;

            const result = await response.json();
            const cursos = result.data || result;

            if (!cursoSelect) return;

            cursoSelect.innerHTML = '<option value="">Selecione um curso...</option>';

            const optionsContainer = cursoSelect.nextElementSibling.querySelector('.custom-options');
            if (optionsContainer) {
                optionsContainer.innerHTML = '<div class="custom-option" data-value="">Selecione um curso...</div>';
            }

            cursos.forEach(curso => {
                cursoSelect.insertAdjacentHTML('beforeend', `<option value="${curso.id}">${curso.nome}</option>`);
                if (optionsContainer) {
                    optionsContainer.insertAdjacentHTML('beforeend', `<div class="custom-option" data-value="${curso.id}">${curso.nome}</div>`);
                }
            });

        } catch (error) { console.error("Erro ao popular cursos:", error); }
    }

    function getRoleBadge(role) {
        if (!role) return '';
        const roleLower = role.toLowerCase();
        const mapClasses = {
            'aluno': 'role-aluno',
            'coordenador': 'role-coord',
            'secretaria': 'role-secret',
            'administrador': 'role-admin'
        };
        const cssClass = mapClasses[roleLower] || '';
        return `<span class="role-badge ${cssClass}">${role}</span>`;
    }

    // Custom Select Logic (UI)
    function setupCustomSelect(wrapper) {
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const optionsContainer = wrapper.querySelector('.custom-options');
        const hiddenSelect = wrapper.previousElementSibling;
        const triggerSpan = trigger.querySelector('span');

        if (!hiddenSelect) return;

        optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.custom-option');
            if (option) {
                e.stopPropagation();
                const value = option.dataset.value;
                const text = option.textContent;

                triggerSpan.textContent = text;
                hiddenSelect.value = value;
                hiddenSelect.dispatchEvent(new Event('change'));
                wrapper.classList.remove('open');
            }
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
                if (el !== wrapper) el.classList.remove('open');
            });
            wrapper.classList.toggle('open');
            toggleError(hiddenSelect, false);
        });
    }

    function updateCustomSelectUI(selectElement, value) {
        if (!selectElement) return;
        const wrapper = selectElement.nextElementSibling;
        if (!wrapper || !wrapper.classList.contains('custom-select-wrapper')) return;

        const triggerSpan = wrapper.querySelector('.custom-select-trigger span');
        let text = 'Selecione...';
        
        // Ajuste para o filtro de "Todos"
        if (value === "" && selectElement.id === 'filtro-papel') text = "Todos";
        else if (value === "") text = "Selecione...";

        if (value) {
            const option = selectElement.querySelector(`option[value="${value}"]`);
            if (option) text = option.textContent;
        }
        triggerSpan.textContent = text;
    }

    // Inicialização
    populateCourseSelects();
    fetchUsers();

    document.querySelectorAll('.custom-select-wrapper').forEach(setupCustomSelect);
    
    document.addEventListener('click', () =>
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'))
    );
    
    document.querySelectorAll('.close-btn').forEach(btn =>
        btn.addEventListener('click', () => btn.closest('dialog').close())
    );
});