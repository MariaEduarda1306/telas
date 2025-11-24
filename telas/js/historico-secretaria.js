// js/historico-secretaria.js

document.addEventListener('DOMContentLoaded', () => {

    const listView = document.getElementById('student-list-view');
    const detailView = document.getElementById('student-detail-view');
    const studentListTbody = document.getElementById('student-list-tbody');
    const backBtn = document.getElementById('back-to-list-btn');
    const filterBtn = document.querySelector('.btn-primary');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const accordionPlaceholder = document.getElementById('accordion-placeholder');
    const courseFilterSelect = document.getElementById('curso');

    // =======================================================
    // ETAPA EXTRA: POPULAR O FILTRO DE CURSOS
    // =======================================================
    async function populateCourseFilter() {
        try {
            // Endpoint correto conforme doc (GET /cursos)
            const response = await fetch(`${API_BASE_URL}/api/cursos`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar cursos.');
            
            const result = await response.json();
            const cursos = result.data || result;
            
            cursos.forEach(curso => {
                const option = document.createElement('option');
                option.value = curso.id;
                option.textContent = curso.nome;
                courseFilterSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
        }
    }

    // =======================================================
    // ETAPA 1: LÓGICA DA LISTA DE ALUNOS
    // =======================================================
    async function fetchAndRenderStudents(queryParams = '') {
        studentListTbody.innerHTML = '<tr><td colspan="5">Carregando alunos...</td></tr>';
        try {
            // Endpoint correto conforme doc (GET /usuarios)
            // Adicionamos separator para garantir query string válida
            const separator = queryParams ? '&' : '';
            const response = await fetch(`${API_BASE_URL}/api/usuarios?tipo=ALUNO${separator}${queryParams}`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar a lista de alunos.');
            
            const result = await response.json();
            const alunos = result.data || result;

            if (alunos.length === 0) {
                studentListTbody.innerHTML = '<tr><td colspan="5">Nenhum aluno encontrado.</td></tr>';
                return;
            }

            studentListTbody.innerHTML = '';
            alunos.forEach(aluno => {
                const row = document.createElement('tr');
                row.className = 'student-row';
                row.style.cursor = 'pointer';
                
                row.innerHTML = `
                    <td data-label="Nome do Aluno">${aluno.nome}</td>
                    <td data-label="Matrícula">${aluno.matricula}</td>
                    <td data-label="Curso">${aluno.curso?.nome || 'N/A'}</td>
                    <td data-label="Fase">${aluno.fase ? aluno.fase + 'ª Fase' : '--'}</td>
                    <td data-label="Solicitações">${aluno.certificados_count || 0}</td>
                `;
                row.addEventListener('click', () => showDetailView(aluno.id, aluno.nome));
                studentListTbody.appendChild(row);
            });
        } catch (error) {
            studentListTbody.innerHTML = `<tr><td colspan="5" style="color: var(--status-reprovado);">${error.message}</td></tr>`;
        }
    }

    // =======================================================
    // ETAPA 2: LÓGICA DA VISÃO DE DETALHES (ACORDEÃO)
    // =======================================================
    async function showDetailView(studentId, studentName) {
        listView.style.display = 'none';
        detailView.style.display = 'block';
        document.getElementById('student-name-title').textContent = `Histórico de: ${studentName}`;
        accordionPlaceholder.innerHTML = '<p>Carregando histórico do aluno...</p>';

        try {
            // CORREÇÃO: Alterado de /usuarios/{id}/historico para /certificados?aluno_id={id}
            const response = await fetch(`${API_BASE_URL}/api/certificados?aluno_id=${studentId}`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar o histórico deste aluno.');
            
            const result = await response.json();
            const certificados = result.data || result;
            
            accordionPlaceholder.innerHTML = '';
            
            if (certificados.length === 0) {
                accordionPlaceholder.innerHTML = '<p>Este aluno ainda não enviou certificados.</p>';
                return;
            }

            certificados.forEach(cert => {
                const statusInfo = getStatusInfo(cert.status);
                const dataEnvio = new Date(cert.created_at).toLocaleDateString('pt-BR');
                
                const itemHTML = `
                <div class="accordion-item">
                    <button class="accordion-header">
                        <div class="header-title"><h3>${cert.nome_certificado}</h3></div>
                        <div class="header-status">
                            <span class="status ${statusInfo.className}">${statusInfo.text}</span>
                            <i class="fas fa-chevron-down accordion-icon"></i>
                        </div>
                    </button>
                    <div class="accordion-content">
                        <div class="content-wrapper">
                            <div class="details-list">
                                <div class="detail-item"><span>ID:</span> <span>${cert.id}</span></div>
                                <div class="detail-item"><span>Data de Envio:</span> <span>${dataEnvio}</span></div>
                                <div class="detail-item"><span>Horas Solicitadas:</span> <span>${cert.carga_horaria_solicitada}</span></div>
                                <div class="detail-item"><span>Observação:</span> <span>${cert.observacao || '--'}</span></div>
                            </div>
                            <div class="preview-section">
                                <h4>Pré-visualização do Comprovante</h4>
                                <embed class="pdf-preview" src="${cert.arquivo_url || ''}" type="application/pdf" />
                            </div>
                        </div>
                    </div>
                </div>`;
                accordionPlaceholder.innerHTML += itemHTML;
            });
            setupAccordion();
        } catch (error) {
            accordionPlaceholder.innerHTML = `<p style="color: var(--status-reprovado);">${error.message}</p>`;
        }
    }
    
    // =======================================================
    // 3. EVENTOS E INICIALIZAÇÃO
    // =======================================================
    backBtn.addEventListener('click', () => {
        detailView.style.display = 'none';
        listView.style.display = 'block';
    });

    filterBtn.addEventListener('click', () => {
        const params = new URLSearchParams();
        const nome = document.getElementById('aluno').value;
        const matricula = document.getElementById('matricula').value;
        const cursoId = document.getElementById('curso').value;
        const fase = document.getElementById('fase').value;

        if (nome) params.append('nome', nome);
        if (matricula) params.append('matricula', matricula);
        if (cursoId) params.append('curso_id', cursoId);
        if (fase) params.append('fase', fase);
        
        fetchAndRenderStudents(params.toString());
    });
    
    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filter-form').querySelectorAll('input, select').forEach(el => el.value = '');
        fetchAndRenderStudents();
    });

    // Carga inicial
    populateCourseFilter();
    fetchAndRenderStudents();
});