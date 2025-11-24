// js/historico-coordenador.js

document.addEventListener('DOMContentLoaded', () => {

    const listView = document.getElementById('student-list-view');
    const detailView = document.getElementById('student-detail-view');
    const studentListTbody = document.getElementById('student-list-tbody');
    const backBtn = document.getElementById('back-to-list-btn');
    const filterBtn = document.querySelector('.btn-primary');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const accordionPlaceholder = document.getElementById('accordion-placeholder');

    // =======================================================
    // ETAPA 1: LÓGICA DA LISTA DE ALUNOS
    // =======================================================

    async function fetchAndRenderStudents(queryParams = '') {
        studentListTbody.innerHTML = '<tr><td colspan="4">Carregando alunos...</td></tr>';
        
        try {
            // CORREÇÃO: Adicionado tipo=ALUNO para filtrar corretamente na lista de usuários
            const separator = queryParams ? '&' : '';
            const response = await fetch(`${API_BASE_URL}/api/usuarios?tipo=ALUNO${separator}${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Falha ao carregar a lista de alunos.');
            
            const result = await response.json();
            const alunos = result.data || result;

            if (alunos.length === 0) {
                studentListTbody.innerHTML = '<tr><td colspan="4">Nenhum aluno encontrado.</td></tr>';
                return;
            }

            studentListTbody.innerHTML = '';
            alunos.forEach(aluno => {
                // Redundância de segurança: verifica se é aluno mesmo
                if (aluno.tipo === 'ALUNO') {
                    const row = document.createElement('tr');
                    row.className = 'student-row';
                    row.style.cursor = 'pointer';
                    
                    row.innerHTML = `
                        <td data-label="Nome do Aluno">${aluno.nome}</td>
                        <td data-label="Matrícula">${aluno.matricula}</td>
                        <td data-label="Fase">${aluno.fase ? aluno.fase + 'ª Fase' : '--'}</td>
                        <td data-label="Solicitações">${aluno.certificados_count || 0}</td>
                    `;

                    row.addEventListener('click', () => {
                        showDetailView(aluno.id, aluno.nome);
                    });

                    studentListTbody.appendChild(row);
                }
            });

        } catch (error) {
            studentListTbody.innerHTML = `<tr><td colspan="4" style="color: var(--status-reprovado);">${error.message}</td></tr>`;
        }
    }

    // =======================================================
    // ETAPA 2: LÓGICA DA VISÃO DE DETALHES (COM EDIÇÃO)
    // =======================================================

    async function showDetailView(studentId, studentName) {
        listView.style.display = 'none';
        detailView.style.display = 'block';
        document.getElementById('student-name-title').textContent = `Histórico de: ${studentName}`;
        accordionPlaceholder.innerHTML = '<p>Carregando histórico do aluno...</p>';

        try {
            // CORREÇÃO CRÍTICA: Rota alterada para GET /certificados?aluno_id=...
            const response = await fetch(`${API_BASE_URL}/api/certificados?aluno_id=${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Falha ao carregar o histórico deste aluno.');
            
            const result = await response.json();
            const certificados = result.data || result;

            if (certificados.length === 0) {
                accordionPlaceholder.innerHTML = '<p>Este aluno ainda não enviou certificados.</p>';
                return;
            }

            accordionPlaceholder.innerHTML = ''; 
            
            certificados.forEach(cert => {
                const statusInfo = getStatusInfo(cert.status);
                const dataEnvio = new Date(cert.created_at).toLocaleDateString('pt-BR');
                
                // --- LÓGICA DO PAINEL DE EDIÇÃO ---
                const horasValue = (cert.horas_validadas !== null && cert.horas_validadas !== undefined) 
                                   ? cert.horas_validadas 
                                   : cert.carga_horaria_solicitada;
                
                const obsValue = cert.observacao || '';

                // HTML do Painel de Edição
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
                                <textarea class="observacao" placeholder="Insira uma observação para o aluno...">${obsValue}</textarea>
                            </div>
                        </div>
                        <div class="validation-actions">
                            <button class="btn btn-danger btn-avaliar" data-action="REPROVADO" title="Reprovar"><i class="fas fa-times-circle"></i> Reprovar</button>
                            <button class="btn btn-warning btn-avaliar" data-action="APROVADO_COM_RESSALVAS" title="Aprovar com Ressalvas"><i class="fas fa-exclamation-triangle"></i> Aprovar com Ressalvas</button>
                            <button class="btn btn-success btn-avaliar" data-action="APROVADO" title="Aprovar"><i class="fas fa-check-circle"></i> Aprovar</button>
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
                                <div class="detail-item"><span>Data de Envio:</span> <span>${dataEnvio}</span></div>
                                <div class="detail-item"><span>Horas Originais:</span> <span>${cert.carga_horaria_solicitada}</span></div>
                                <div class="detail-item"><span>Status Atual:</span> <span class="status ${statusInfo.className}">${statusInfo.text}</span></div>
                                ${validationPanel} 
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

            // Adiciona os eventos aos botões do painel recém-criado
            document.querySelectorAll('.btn-avaliar').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Previne fechar o acordeão
                    const panel = button.closest('.validation-panel');
                    const certificateId = panel.dataset.certId;
                    const newStatus = button.dataset.action;
                    handleEvaluation(certificateId, newStatus, studentId, studentName);
                });
            });

        } catch (error) {
            accordionPlaceholder.innerHTML = `<p style="color: var(--status-reprovado);">${error.message}</p>`;
        }
    }

    // =======================================================
    // ETAPA 3: LÓGICA DE SALVAR EDIÇÃO (Handle Evaluation)
    // =======================================================
    async function handleEvaluation(certificateId, newStatus, studentId, studentName) {
        const panel = document.querySelector(`.validation-panel[data-cert-id="${certificateId}"]`);
        const horasInput = panel.querySelector('.horas-validadas');
        const obsTextarea = panel.querySelector('.observacao');
        
        const data = {
            status: newStatus,
            horas_validadas: parseInt(horasInput.value),
            observacao: obsTextarea.value,
        };

        // Validação simples
        if ((newStatus === 'REPROVADO' || newStatus === 'APROVADO_COM_RESSALVAS') && !data.observacao.trim()) {
            showToast('A observação é obrigatória para reprovar ou aprovar com ressalvas.', 'error');
            return;
        }
        
        try {
            // CORREÇÃO CRÍTICA: Rota e Método conforme doc v1.1
            const response = await fetch(`${API_BASE_URL}/api/certificados/${certificateId}/avaliar`, {
                method: 'PATCH', // Método correto: PATCH
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Falha ao atualizar avaliação.');
            }
            
            showToast('Avaliação atualizada com sucesso!');
            
            // Recarrega a tela para mostrar os dados atualizados (e o status novo no header do acordeão)
            showDetailView(studentId, studentName);

        } catch (error) {
            showToast(error.message, 'error');
        }
    }
    
    // =======================================================
    // 4. EVENTOS E INICIALIZAÇÃO
    // =======================================================

    backBtn.addEventListener('click', () => {
        detailView.style.display = 'none';
        listView.style.display = 'block';
    });

    filterBtn.addEventListener('click', () => {
        const nome = document.getElementById('aluno').value;
        const matricula = document.getElementById('matricula').value;
        const fase = document.getElementById('fase').value;
        
        const params = new URLSearchParams();
        if (nome) params.append('nome', nome);
        if (matricula) params.append('matricula', matricula);
        if (fase) params.append('fase', fase);
        
        fetchAndRenderStudents(params.toString());
    });
    
    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filter-form').querySelectorAll('input, select').forEach(el => el.value = '');
        fetchAndRenderStudents();
    });

    fetchAndRenderStudents();
});