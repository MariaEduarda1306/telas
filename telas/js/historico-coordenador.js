// js/historico-coordenador.js

document.addEventListener('DOMContentLoaded', () => {

    const listView = document.getElementById('student-list-view');
    const detailView = document.getElementById('student-detail-view');
    const studentListTbody = document.getElementById('student-list-tbody');
    const backBtn = document.getElementById('back-to-list-btn');
    const filterBtn = document.querySelector('.btn-primary'); // Botão Filtrar
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const accordionPlaceholder = document.getElementById('accordion-placeholder');

    // Variável global para armazenar a lista completa na memória
    let allStudentsData = [];

    // =======================================================
    // LÓGICA DO MENU CUSTOMIZADO (Dropdown Fase)
    // =======================================================
    const faseSelect = document.getElementById('fase');
    const faseWrapper = document.querySelector('.custom-select-wrapper');
    
    if (faseSelect && faseWrapper) {
        const trigger = faseWrapper.querySelector('.custom-select-trigger');
        const triggerSpan = trigger.querySelector('span');
        const options = faseWrapper.querySelectorAll('.custom-option');

        // Abrir/Fechar menu
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            faseWrapper.classList.toggle('open');
        });

        // Selecionar Opção
        options.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                const text = option.textContent;

                // Atualiza visual
                triggerSpan.textContent = text;
                faseWrapper.classList.remove('open');
                
                // Atualiza o select escondido
                faseSelect.value = value;
                
                // (Opcional) Se quiser filtrar assim que clicar na opção, descomente a linha abaixo:
                // renderStudentsTable(); 
            });
        });

        // Fechar se clicar fora
        document.addEventListener('click', (e) => {
            if (!faseWrapper.contains(e.target)) {
                faseWrapper.classList.remove('open');
            }
        });
    }

    // =======================================================
    // ETAPA 1: BUSCAR DADOS (FETCH)
    // =======================================================
    async function fetchStudents() {
        studentListTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando alunos...</td></tr>';
        
        try {
            // Busca TODOS os alunos
            const response = await fetch(`${API_BASE_URL}/api/usuarios?tipo=ALUNO`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`, 
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Falha ao carregar a lista de alunos.');
            
            const result = await response.json();
            // Salva na memória
            allStudentsData = result.data || result;

            if (!Array.isArray(allStudentsData)) allStudentsData = [];

            // Chama a renderização inicial
            renderStudentsTable();

        } catch (error) {
            studentListTbody.innerHTML = `<tr><td colspan="4" style="color: var(--status-reprovado); text-align:center;">${error.message}</td></tr>`;
        }
    }

    // =======================================================
    // ETAPA 2: FILTRAR E RENDERIZAR (LOCALMENTE)
    // =======================================================
    function renderStudentsTable() {
        // 1. Captura valores dos inputs
        const nomeFilter = document.getElementById('aluno').value.toLowerCase().trim();
        const matriculaFilter = document.getElementById('matricula').value.trim();
        const faseFilter = document.getElementById('fase').value; // Pega do select escondido

        // 2. Filtra o array da memória
        const filteredStudents = allStudentsData.filter(aluno => {
            if (aluno.tipo !== 'ALUNO') return false;

            const matchNome = !nomeFilter || (aluno.nome && aluno.nome.toLowerCase().includes(nomeFilter));
            const matchMatricula = !matriculaFilter || (String(aluno.matricula || '').includes(matriculaFilter));
            const matchFase = !faseFilter || (String(aluno.fase || '') === String(faseFilter));

            return matchNome && matchMatricula && matchFase;
        });

        // 3. Renderiza HTML
        studentListTbody.innerHTML = '';

        if (filteredStudents.length === 0) {
            studentListTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum aluno encontrado.</td></tr>';
            return;
        }

        filteredStudents.forEach(aluno => {
            const row = document.createElement('tr');
            row.className = 'student-row';
            row.style.cursor = 'pointer';
            
            row.innerHTML = `
                <td data-label="Nome do Aluno"><strong>${aluno.nome}</strong></td>
                <td data-label="Matrícula">${aluno.matricula || '--'}</td>
                <td data-label="Fase">${aluno.fase ? aluno.fase + 'ª Fase' : '--'}</td>
                <td data-label="Solicitações">
                    <span class="status status-aguardando" style="color: #333; background: #eee;">
                        ${aluno.certificados_count || 0}
                    </span>
                </td>
            `;

            row.addEventListener('click', () => {
                showDetailView(aluno.id, aluno.nome);
            });

            studentListTbody.appendChild(row);
        });
    }

    // =======================================================
    // ETAPA 3: DETALHES E EDIÇÃO
    // =======================================================

    async function showDetailView(studentId, studentName) {
        listView.style.display = 'none';
        detailView.style.display = 'block';
        document.getElementById('student-name-title').textContent = `Histórico de: ${studentName}`;
        accordionPlaceholder.innerHTML = '<p style="text-align:center; padding: 2rem;">Carregando histórico...</p>';

        try {
            const response = await fetch(`${API_BASE_URL}/api/certificados?aluno_id=${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Falha ao carregar o histórico.');
            
            const result = await response.json();
            const certificados = result.data || result;

            if (!Array.isArray(certificados) || certificados.length === 0) {
                accordionPlaceholder.innerHTML = '<p style="text-align:center; padding: 2rem;">Este aluno ainda não enviou certificados.</p>';
                return;
            }

            accordionPlaceholder.innerHTML = ''; 
            
            certificados.forEach(cert => {
                const statusInfo = getStatusInfo(cert.status);
                const dataEnvio = new Date(cert.created_at).toLocaleDateString('pt-BR');
                
                let fileUrl = cert.arquivo_url;
                if (fileUrl && !fileUrl.startsWith('http')) {
                    let cleanPath = fileUrl.replace(/^public\//, '').replace(/^\/?storage\//, '');
                    fileUrl = `${API_BASE_URL}/storage/${cleanPath}`;
                }
                
                const horasValue = (cert.horas_validadas !== null && cert.horas_validadas !== undefined) 
                                   ? cert.horas_validadas 
                                   : cert.carga_horaria_solicitada;
                
                const obsValue = cert.observacao || '';

                const validationPanel = `
                    <div class="validation-panel" data-cert-id="${cert.id}">
                        <h4 style="margin-top: 1.5rem; border-top: 1px dashed var(--glass-border); padding-top: 1rem;">Editar Avaliação</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Horas Validadas</label>
                                <input type="number" class="horas-validadas" value="${horasValue}" min="0">
                            </div>
                            <div class="form-group full-width">
                                <label>Observação / Feedback</label>
                                <textarea class="observacao" placeholder="Insira uma observação...">${obsValue}</textarea>
                            </div>
                        </div>
                        <div class="validation-actions">
                            <button class="btn btn-danger btn-avaliar" data-action="REPROVADO"><i class="fas fa-times-circle"></i> Reprovar</button>
                            <button class="btn btn-warning btn-avaliar" data-action="APROVADO_COM_RESSALVAS"><i class="fas fa-exclamation-triangle"></i> Ressalvas</button>
                            <button class="btn btn-success btn-avaliar" data-action="APROVADO"><i class="fas fa-check-circle"></i> Aprovar</button>
                        </div>
                    </div>`;

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
                                <div class="detail-item"><span>Data Envio:</span> <span>${dataEnvio}</span></div>
                                <div class="detail-item"><span>Horas Solicitadas:</span> <span>${cert.carga_horaria_solicitada}</span></div>
                                <div class="detail-item"><span>Status Atual:</span> <span class="status ${statusInfo.className}">${statusInfo.text}</span></div>
                                ${validationPanel} 
                            </div>
                            <div class="preview-section">
                                <h4>Comprovante</h4>
                                <embed class="pdf-preview" src="${fileUrl || ''}" type="application/pdf" />
                            </div>
                        </div>
                    </div>
                </div>`;
                accordionPlaceholder.innerHTML += itemHTML;
            });

            setupAccordion();

            document.querySelectorAll('.btn-avaliar').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const panel = button.closest('.validation-panel');
                    handleEvaluation(panel.dataset.certId, button.dataset.action, studentId, studentName);
                });
            });

        } catch (error) {
            accordionPlaceholder.innerHTML = `<p style="color: var(--status-reprovado); text-align:center;">${error.message}</p>`;
        }
    }

    async function handleEvaluation(certificateId, newStatus, studentId, studentName) {
        const panel = document.querySelector(`.validation-panel[data-cert-id="${certificateId}"]`);
        const horasInput = panel.querySelector('.horas-validadas');
        const obsTextarea = panel.querySelector('.observacao');
        
        const data = {
            status: newStatus,
            horas_validadas: parseInt(horasInput.value),
            observacao: obsTextarea.value,
        };

        if ((newStatus === 'REPROVADO' || newStatus === 'APROVADO_COM_RESSALVAS') && !data.observacao.trim()) {
            showToast('Observação obrigatória para esta ação.', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/certificados/${certificateId}/avaliar`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Erro ao avaliar.');
            }
            
            showToast('Atualizado com sucesso!');
            showDetailView(studentId, studentName);

        } catch (error) {
            showToast(error.message, 'error');
        }
    }
    
    // =======================================================
    // EVENTOS DOS FILTROS
    // =======================================================

    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            renderStudentsTable(); 
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Limpa Inputs Normais
            document.getElementById('aluno').value = '';
            document.getElementById('matricula').value = '';
            
            // Limpa Menu Customizado
            document.getElementById('fase').value = ''; // Select escondido
            const triggerSpan = document.querySelector('.custom-select-trigger span'); // Visual
            if(triggerSpan) triggerSpan.textContent = 'Todas';

            renderStudentsTable();
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            detailView.style.display = 'none';
            listView.style.display = 'block';
        });
    }

    // Inicialização
    fetchStudents();
});