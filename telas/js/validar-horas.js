// js/validar-horas.js

document.addEventListener('DOMContentLoaded', () => {

    const listView = document.getElementById('student-list-view');
    const detailView = document.getElementById('student-detail-view');
    const studentListTbody = document.getElementById('student-list-tbody');
    const backBtn = document.getElementById('back-to-list-btn');
    const accordionPlaceholder = document.getElementById('accordion-placeholder');
    
    // Seletores de Filtro
    const filterBtn = document.getElementById('filter-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const faseSelect = document.getElementById('fase');

    // =======================================================
    // SINCRONIZAÇÃO DO SELECT CUSTOMIZADO DE FASE
    // =======================================================
    const faseWrapper = faseSelect?.nextElementSibling;
    if (faseWrapper && faseWrapper.classList.contains('custom-select-wrapper')) {
        const trigger = faseWrapper.querySelector('.custom-select-trigger');
        const optionsContainer = faseWrapper.querySelector('.custom-options');
        const triggerSpan = trigger.querySelector('span');

        optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.custom-option');
            if (!option) return;
            const value = option.dataset.value;
            const text = option.textContent;

            faseSelect.value = value;
            triggerSpan.textContent = text;

            faseSelect.dispatchEvent(new Event('change'));
            faseWrapper.classList.remove('open');
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            faseWrapper.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            faseWrapper.classList.remove('open');
        });
    }

    // =======================================================
    // ETAPA 1: CARREGAR E FILTRAR A LISTA DE ALUNOS
    // =======================================================
    async function fetchAndRenderStudents() {
        studentListTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';
        
        try {
            // 1. Busca TODOS os certificados pendentes
            const response = await fetch(`${API_BASE_URL}/api/certificados?status=ENTREGUE`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            
            if (!response.ok) throw new Error('Falha ao buscar pendências.');

            const result = await response.json();
            const pendingCertificates = result.data || result;

            if (!Array.isArray(pendingCertificates) || pendingCertificates.length === 0) {
                studentListTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma pendência encontrada.</td></tr>';
                return;
            }

            // 2. Agrupa por aluno
            const studentsMap = {};

            pendingCertificates.forEach(cert => {
                const dadosAluno = cert.aluno || cert.requerente;
                if (dadosAluno) {
                    const studentId = dadosAluno.id;
                    if (!studentsMap[studentId]) {
                        studentsMap[studentId] = {
                            id: studentId,
                            nome: dadosAluno.nome,
                            matricula: dadosAluno.matricula,
                            fase: dadosAluno.fase ?? '',
                            pending_count: 0
                        };
                    }
                    studentsMap[studentId].pending_count++;
                }
            });

            let studentsArray = Object.values(studentsMap);

            // 3. APLICAÇÃO DOS FILTROS
            const filterNome = document.getElementById('aluno').value.toLowerCase().trim();
            const filterMatricula = document.getElementById('matricula').value.trim();
            const filterFase = faseSelect ? faseSelect.value : '';

            if (filterNome) {
                studentsArray = studentsArray.filter(s =>
                    s.nome && s.nome.toLowerCase().includes(filterNome)
                );
            }
            if (filterMatricula) {
                studentsArray = studentsArray.filter(s =>
                    String(s.matricula ?? '').includes(filterMatricula)
                );
            }
            if (filterFase) {
                studentsArray = studentsArray.filter(s =>
                    String(s.fase ?? '') === filterFase
                );
            }

            // 4. Renderiza a tabela filtrada
            if (!studentsArray.length) {
                studentListTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum aluno encontrado com esses filtros.</td></tr>';
                return;
            }

            studentListTbody.innerHTML = '';
            studentsArray.forEach(aluno => {
                const row = document.createElement('tr');
                row.className = 'student-row';
                row.style.cursor = 'pointer';
                row.innerHTML = `
                    <td data-label="Notificação">
                        <i class="fas fa-bell notification-bell" style="color:var(--status-ressalva)" title="Nova atividade!"></i>
                    </td>
                    <td data-label="Nome do Aluno"><strong>${aluno.nome}</strong></td>
                    <td data-label="Matrícula">${aluno.matricula}</td>
                    <td data-label="Fase">${aluno.fase || 'N/A'}</td>
                    <td data-label="Solicitações Pendentes">
                        <span class="status status-ressalva">${aluno.pending_count}</span>
                    </td>
                `;
                row.addEventListener('click', () => showDetailView(aluno.id, aluno.nome));
                studentListTbody.appendChild(row);
            });

        } catch (error) {
            studentListTbody.innerHTML = `<tr><td colspan="4" style="color: var(--status-reprovado); text-align:center;">${error.message}</td></tr>`;
            console.error(error);
        }
    }

    // =======================================================
    // ETAPA 2: EXIBIR DETALHES
    // =======================================================
    async function showDetailView(studentId, studentName) {
        listView.style.display = 'none';
        detailView.style.display = 'block';
        document.getElementById('student-name-title').textContent = `Validar: ${studentName}`;
        accordionPlaceholder.innerHTML = '<p style="text-align:center;">Carregando certificados...</p>';

        try {
            const response = await fetch(`${API_BASE_URL}/api/certificados?aluno_id=${studentId}&status=ENTREGUE`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar certificados.');

            const result = await response.json();
            const certificados = result.data || result;

            accordionPlaceholder.innerHTML = '';

            if (!Array.isArray(certificados) || certificados.length === 0) {
                accordionPlaceholder.innerHTML = '<p style="text-align:center;">Nenhum certificado pendente.</p>';
                return;
            }

            certificados.forEach(cert => {
                const statusInfo = getStatusInfo(cert.status);
                const dataEnvio = new Date(cert.created_at).toLocaleDateString('pt-BR');
                
                // Correção de URL
                let fileUrl = cert.arquivo_url;
                if (fileUrl && !fileUrl.startsWith('http')) {
                    let cleanPath = fileUrl.replace(/^public\//, '').replace(/^\/?storage\//, '');
                    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
                    fileUrl = `${API_BASE_URL}/storage/${cleanPath}`;
                }

                const validationPanel = `
                    <div class="validation-panel" data-cert-id="${cert.id}" style="margin-top:2rem; padding-top:2rem; border-top:1px dashed var(--glass-border);">
                        <h4>Painel de Validação</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Horas Validadas</label>
                                <input type="number" class="horas-validadas" value="${cert.carga_horaria_solicitada}" min="0">
                            </div>
                            <div class="form-group full-width">
                                <label>Observação</label>
                                <textarea class="observacao" placeholder="Justificativa..."></textarea>
                            </div>
                        </div>
                        <div class="validation-actions" style="display:flex; gap:1rem; justify-content:flex-end; margin-top:1rem;">
                            <button class="btn btn-danger btn-avaliar" data-action="REPROVADO">
                                <i class="fas fa-times-circle"></i> Reprovar
                            </button>
                            <button class="btn btn-warning btn-avaliar" data-action="APROVADO_COM_RESSALVAS">
                                <i class="fas fa-exclamation-triangle"></i> Ressalvas
                            </button>
                            <button class="btn btn-success btn-avaliar" data-action="APROVADO">
                                <i class="fas fa-check-circle"></i> Aprovar
                            </button>
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
                                <div class="detail-item"><span>ID:</span> <span>${cert.id}</span></div>
                                <div class="detail-item"><span>Data:</span> <span>${dataEnvio}</span></div>
                                <div class="detail-item"><span>Horas:</span> <span>${cert.carga_horaria_solicitada}</span></div>
                                <div class="detail-item"><span>Obs:</span> <span>${cert.observacao || '--'}</span></div>
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
                    const certificateId = panel.dataset.certId;
                    const newStatus = button.dataset.action;
                    handleEvaluation(certificateId, newStatus, studentId, studentName);
                });
            });

        } catch (error) {
            accordionPlaceholder.innerHTML = `<p style="color: var(--status-reprovado); text-align:center;">${error.message}</p>`;
        }
    }

    // =======================================================
    // ETAPA 3: ENVIAR AVALIAÇÃO
    // =======================================================
    async function handleEvaluation(certificateId, newStatus, studentId, studentName) {
        const panel = document.querySelector(`.validation-panel[data-cert-id="${certificateId}"]`);
        const horasInput = panel.querySelector('.horas-validadas');
        const obsTextarea = panel.querySelector('.observacao');

        const data = {
            status: newStatus,
            horas_validadas: parseInt(horasInput.value),
            observacao: obsTextarea.value
        };

        if ((newStatus === 'REPROVADO' || newStatus === 'APROVADO_COM_RESSALVAS') && !data.observacao.trim()) {
            showToast('A observação é obrigatória para esta ação.', 'error');
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
                throw new Error(result.message || 'Falha ao processar avaliação.');
            }

            showToast('Certificado avaliado com sucesso!');
            showDetailView(studentId, studentName);

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // =======================================================
    // EVENTOS DE BOTÕES
    // =======================================================
    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fetchAndRenderStudents();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            document.getElementById('aluno').value = '';
            document.getElementById('matricula').value = '';
            if (faseSelect) {
                faseSelect.value = '';
                if (faseSelect.nextElementSibling && faseSelect.nextElementSibling.classList.contains('custom-select-wrapper')) {
                    faseSelect.nextElementSibling.querySelector('.custom-select-trigger span').textContent = 'Todas';
                }
            }
            fetchAndRenderStudents();
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            detailView.style.display = 'none';
            listView.style.display = 'block';
            fetchAndRenderStudents();
        });
    }

    // Inicialização
    fetchAndRenderStudents();
});
