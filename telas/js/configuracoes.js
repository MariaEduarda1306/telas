// js/configuracoes.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- ESTADO GLOBAL DO DELETE ---
    let deleteTargetId = null;
    let deleteTargetType = null; // 'curso' ou 'categoria'

    // --- ELEMENTOS DE CURSOS ---
    const coursesTableBody = document.getElementById('courses-table-body');
    const courseModal = document.getElementById('course-modal');
    const courseForm = document.getElementById('course-form');
    const btnAddCourse = document.getElementById('btn-add-course');
    const courseModalTitle = document.getElementById('course-modal-title');

    // --- ELEMENTOS DE CATEGORIAS ---
    const categoriesTableBody = document.getElementById('categories-table-body');
    const categoryModal = document.getElementById('category-modal');
    const categoryForm = document.getElementById('category-form');
    const btnAddCategory = document.getElementById('btn-add-category');
    const categoryModalTitle = document.getElementById('category-modal-title');

    // --- ELEMENTOS GERAIS ---
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const deleteItemName = document.getElementById('delete-item-name');
    
    // Elementos de Integração
    const apiUrlInput = document.getElementById('api-url');
    const apiKeyInput = document.getElementById('api-key');
    const saveIntegrationsBtn = document.getElementById('save-integrations-btn');

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
    // 1. GERENCIAMENTO DE CURSOS (CRUD)
    // =======================================================

    async function loadCourses() {
        coursesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Carregando...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/api/cursos`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                const courses = result.data || result;
                renderCourses(courses);
            } else {
                coursesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--status-reprovado)">Erro ao carregar cursos.</td></tr>';
            }
        } catch (error) {
            console.error(error);
            showToast('Erro de conexão ao carregar cursos.', 'error');
        }
    }

    function renderCourses(courses) {
        coursesTableBody.innerHTML = '';
        if (courses.length === 0) {
            coursesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nenhum curso cadastrado.</td></tr>';
            return;
        }

        courses.forEach(course => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="ID">#${course.id}</td>
                <td data-label="Curso"><strong>${course.nome}</strong></td>
                <td data-label="Horas">${course.horas_necessarias}h</td>
                <td class="action-cell">
                    <button class="action-btn edit-course" data-id="${course.id}" data-nome="${course.nome}" data-horas="${course.horas_necessarias}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="openDeleteModal('curso', ${course.id}, '${course.nome}')" title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            coursesTableBody.appendChild(tr);
        });

        // Adiciona eventos aos botões de editar gerados dinamicamente
        document.querySelectorAll('.edit-course').forEach(btn => {
            btn.addEventListener('click', () => openCourseModal(true, btn.dataset));
        });
    }

    function openCourseModal(isEdit, data = {}) {
        const idInput = document.getElementById('course-id');
        const nameInput = document.getElementById('course-name');
        const hoursInput = document.getElementById('course-hours');

        // Limpa erros visuais anteriores
        toggleError(nameInput, false);
        toggleError(hoursInput, false);

        if (isEdit) {
            courseModalTitle.textContent = 'Editar Curso';
            idInput.value = data.id;
            nameInput.value = data.nome;
            hoursInput.value = data.horas;
        } else {
            courseModalTitle.textContent = 'Adicionar Curso';
            idInput.value = '';
            nameInput.value = '';
            hoursInput.value = '';
        }
        courseModal.showModal();
    }

    // Listener para limpar erros ao digitar (Curso)
    courseForm.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => toggleError(input, false));
    });

    courseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('course-id').value;
        const nameInput = document.getElementById('course-name');
        const hoursInput = document.getElementById('course-hours');
        
        let hasError = false;

        // --- VALIDAÇÃO VISUAL MANUAL ---
        if (!nameInput.value.trim()) { toggleError(nameInput, true); hasError = true; } 
        else { toggleError(nameInput, false); }

        if (!hoursInput.value.trim()) { toggleError(hoursInput, true); hasError = true; } 
        else { toggleError(hoursInput, false); }
        
        if (hasError) {
            return showToast('Por favor, preencha todos os campos.', 'error');
        }
        // -----------------------

        const nome = nameInput.value.trim();
        const horas = hoursInput.value.trim();

        const isEdit = !!id;
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE_URL}/api/cursos/${id}` : `${API_BASE_URL}/api/cursos`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 
                    'Authorization': `Bearer ${authToken}`, 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ nome, horas_necessarias: parseInt(horas) })
            });

            if (response.ok) {
                showToast(`Curso ${isEdit ? 'atualizado' : 'criado'} com sucesso!`);
                courseModal.close();
                loadCourses();
            } else {
                const err = await response.json();
                showToast(err.message || 'Erro ao salvar curso.', 'error');
            }
        } catch (error) {
            showToast('Erro de conexão.', 'error');
        }
    });

    // =======================================================
    // 2. GERENCIAMENTO DE CATEGORIAS (CRUD)
    // =======================================================

    async function loadCategories() {
        categoriesTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">Carregando...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/api/categorias`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                const categories = result.data || result;
                renderCategories(categories);
            } else {
                categoriesTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--status-reprovado)">Erro ao carregar categorias.</td></tr>';
            }
        } catch (error) {
            showToast('Erro ao carregar categorias.', 'error');
        }
    }

    function renderCategories(categories) {
        categoriesTableBody.innerHTML = '';
        if (categories.length === 0) {
            categoriesTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">Nenhuma categoria cadastrada.</td></tr>';
            return;
        }

        categories.forEach(cat => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="ID">#${cat.id}</td>
                <td data-label="Categoria"><strong>${cat.nome}</strong></td>
                <td class="action-cell">
                    <button class="action-btn edit-category" data-id="${cat.id}" data-nome="${cat.nome}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="openDeleteModal('categoria', ${cat.id}, '${cat.nome}')" title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            categoriesTableBody.appendChild(tr);
        });

        document.querySelectorAll('.edit-category').forEach(btn => {
            btn.addEventListener('click', () => openCategoryModal(true, btn.dataset));
        });
    }

    function openCategoryModal(isEdit, data = {}) {
        const idInput = document.getElementById('category-id');
        const nameInput = document.getElementById('category-name');

        // Limpa erro visual anterior
        toggleError(nameInput, false);

        if (isEdit) {
            categoryModalTitle.textContent = 'Editar Categoria';
            idInput.value = data.id;
            nameInput.value = data.nome;
        } else {
            categoryModalTitle.textContent = 'Adicionar Categoria';
            idInput.value = '';
            nameInput.value = '';
        }
        categoryModal.showModal();
    }

    // Listener para limpar erros ao digitar (Categoria)
    categoryForm.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => toggleError(input, false));
    });

    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('category-id').value;
        const nameInput = document.getElementById('category-name');
        
        // --- VALIDAÇÃO VISUAL MANUAL ---
        if (!nameInput.value.trim()) {
            toggleError(nameInput, true);
            return showToast('Por favor, preencha o nome da categoria.', 'error');
        } else {
            toggleError(nameInput, false);
        }
        // -----------------------
        
        const nome = nameInput.value.trim();
        const isEdit = !!id;
        const method = isEdit ? 'PUT' : 'POST'; 
        const url = isEdit ? `${API_BASE_URL}/api/categorias/${id}` : `${API_BASE_URL}/api/categorias`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 
                    'Authorization': `Bearer ${authToken}`, 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ nome })
            });

            if (response.ok) {
                showToast(`Categoria ${isEdit ? 'atualizada' : 'criada'} com sucesso!`);
                categoryModal.close();
                loadCategories();
            } else {
                const err = await response.json();
                showToast(err.message || 'Erro ao salvar categoria.', 'error');
            }
        } catch (error) {
            showToast('Erro de conexão.', 'error');
        }
    });

    // =======================================================
    // 3. LÓGICA DE EXCLUSÃO (GENÉRICA)
    // =======================================================

    window.openDeleteModal = (type, id, name) => {
        deleteTargetType = type;
        deleteTargetId = id;
        deleteItemName.textContent = name;
        deleteModal.showModal();
    };

    confirmDeleteBtn.addEventListener('click', async () => {
        const endpoint = deleteTargetType === 'curso' ? 'cursos' : 'categorias';
        const url = `${API_BASE_URL}/api/${endpoint}/${deleteTargetId}`;

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });

            if (response.ok) {
                showToast('Item removido com sucesso!');
                if (deleteTargetType === 'curso') loadCourses();
                else loadCategories();
            } else {
                const err = await response.json();
                showToast(err.message || 'Erro ao remover item.', 'error');
            }
        } catch (error) {
            showToast('Erro de conexão.', 'error');
        } finally {
            deleteModal.close();
        }
    });

    // =======================================================
    // 4. INTEGRAÇÕES / CONFIG GERAL
    // =======================================================
    
    async function loadIntegrations() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/configuracoes`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });

            if (response.ok) {
                const config = await response.json();
                if (apiUrlInput) apiUrlInput.value = config.api_url || '';
                if (apiKeyInput) apiKeyInput.value = config.api_key || '';
            }
        } catch (error) {
            console.warn("Erro ao carregar configs:", error);
        }
    }

    saveIntegrationsBtn.addEventListener('click', async () => {
        const originalText = saveIntegrationsBtn.innerHTML;
        saveIntegrationsBtn.disabled = true;
        saveIntegrationsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        try {
            const configData = {
                api_url: apiUrlInput.value,
                api_key: apiKeyInput.value,
                horas_minimas: 200, 
                min_por_area: 20,
                max_por_area: 60,
                modo_manutencao: false
            };

            const response = await fetch(`${API_BASE_URL}/api/configuracoes`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${authToken}`, 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' 
                },
                body: JSON.stringify(configData)
            });

            if (response.ok) {
                showToast('Integrações salvas!');
            } else {
                throw new Error('Falha ao salvar');
            }

        } catch (error) {
            showToast('Erro ao salvar configurações.', 'error');
        } finally {
            saveIntegrationsBtn.disabled = false;
            saveIntegrationsBtn.innerHTML = originalText;
        }
    });

    // =======================================================
    // INICIALIZAÇÃO E EVENTOS DE MODAL
    // =======================================================
    
    btnAddCourse.addEventListener('click', () => openCourseModal(false));
    btnAddCategory.addEventListener('click', () => openCategoryModal(false));

    // Fechar modais (botões X e Cancelar)
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('dialog').close();
        });
    });

    // Fechar clicando fora
    [courseModal, categoryModal, deleteModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.close();
        });
    });

    // Carregamento Inicial
    loadCourses();
    loadCategories();
    loadIntegrations();
});