// js/validar-horas.js

document.addEventListener('DOMContentLoaded', () => {

    const listView = document.getElementById('student-list-view');
    const detailView = document.getElementById('student-detail-view');
    const studentListTbody = document.getElementById('student-list-tbody');
    const backBtn = document.getElementById('back-to-list-btn');
    const accordionPlaceholder = document.getElementById('accordion-placeholder');

    // =======================================================
    // ETAPA 1: CARREGAR A LISTA DE ALUNOS COM PENDÊNCIAS
    // =======================================================
    async function fetchAndRenderStudents() {
        studentListTbody.innerHTML = '<tr><td colspan="4">Carregando alunos com pendências...</td></tr>';
        try {
            // ALTERADO AQUI
            const response = await fetch(`${API_BASE_URL}/api/certificados?status=ENTREGUE`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao buscar pendências.');

            const result = await response.json();
            const pendingCertificates = result.data;

            if (pendingCertificates.length === 0) {
                studentListTbody.innerHTML = '<tr><td colspan="4">Nenhum aluno com solicitação pendente.</td></tr>';
                return;
            }

            const studentsWithPending = pendingCertificates.reduce((acc, cert) => {
                const studentId = cert.requerente.id;
                if (!acc[studentId]) {
                    acc[studentId] = {
                        ...cert.requerente,
                        pending_count: 0
                    };
                }
                acc[studentId].pending_count++;
                return acc;
            }, {});

            studentListTbody.innerHTML = '';
            Object.values(studentsWithPending).forEach(aluno => {
                const row = document.createElement('tr');
                row.className = 'student-row';
                row.style.cursor = 'pointer';
                row.innerHTML = `
                    <td data-label="Notificação"><i class="fas fa-bell notification-bell" title="Nova atividade para validar!"></i></td>
                    <td data-label="Nome do Aluno">${aluno.nome}</td>
                    <td data-label="Matrícula">${aluno.matricula}</td>
                    <td data-label="Solicitações Pendentes">${aluno.pending_count}</td>
                `;
                row.addEventListener('click', () => showDetailView(aluno.id, aluno.nome));
                studentListTbody.appendChild(row);
            });
        } catch (error) {
            studentListTbody.innerHTML = `<tr><td colspan="4" style="color: var(--status-reprovado);">${error.message}</td></tr>`;
        }
    }

    // =======================================================
    // ETAPA 2: EXIBIR DETALHES E PAINEL DE VALIDAÇÃO
    // =======================================================
    async function showDetailView(studentId, studentName) {
        listView.style.display = 'none';
        detailView.style.display = 'block';
        document.getElementById('student-name-title').textContent = `Validar: ${studentName}`;
        accordionPlaceholder.innerHTML = '<p>Carregando certificados do aluno...</p>';

        try {
            // ALTERADO AQUI
            const response = await fetch(`${API_BASE_URL}/api/usuarios/${studentId}/historico`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Falha ao carregar certificados.');
            
            const certificados = await response.json();
            accordionPlaceholder.innerHTML = '';

            certificados.forEach(cert => {
                const statusInfo = getStatusInfo(cert.status);
                const dataEnvio = new Date(cert.created_at).toLocaleDateString('pt-BR');

                const validationPanel = cert.status === 'ENTREGUE' ? `
                    <div class="validation-panel" data-cert-id="${cert.id}">
                        <h4>Painel de Validação</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Horas Validadas</label>
                                <input type="number" class="horas-validadas" value="${cert.carga_horaria_solicitada}" min="0">
                            </div>
                            <div class="form-group full-width">
                                <label>Observação (Obrigatória para reprovar ou aprovar com ressalvas)</label>
                                <textarea class="observacao" placeholder="Justifique a sua decisão..."></textarea>
                            </div>
                        </div>
                        <div class="validation-actions">
                            <button class="btn btn-danger btn-avaliar" data-action="REPROVADO"><i class="fas fa-times-circle"></i> Reprovar</button>
                            <button class="btn btn-warning btn-avaliar" data-action="APROVADO_COM_RESSALVAS"><i class="fas fa-exclamation-triangle"></i> Aprovar com Ressalvas</button>
                            <button class="btn btn-success btn-avaliar" data-action="APROVADO"><i class="fas fa-check-circle"></i> Aprovar</button>
                        </div>
                    </div>` : '';

                const itemHTML = `
                <div class="accordion-item">
                    <button class="accordion-header">
                        <div class="header-title"><h3>${cert.nome_certificado}</h3></div>
                        <div class="header-status"><span class="status ${statusInfo.className}">${statusInfo.text}</span><i class="fas fa-chevron-down accordion-icon"></i></div>
                    </button>
                    <div class="accordion-content">
                        <div class="content-wrapper">
                            <div class="details-list">
                                <div class="detail-item"><span>ID:</span> <span>${cert.id}</span></div>
                                <div class="detail-item"><span>Data de Envio:</span> <span>${dataEnvio}</span></div>
                                <div class="detail-item"><span>Horas Solicitadas:</span> <span>${cert.carga_horaria_solicitada}</span></div>
                                <div class="detail-item"><span>Observação Coordenador:</span> <span>${cert.observacao || '--'}</span></div>
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
            
            document.querySelectorAll('.btn-avaliar').forEach(button => {
                button.addEventListener('click', () => {
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
    // ETAPA 3: LÓGICA DE AVALIAÇÃO (ENVIO PARA A API)
    // =======================================================
    async function handleEvaluation(certificateId, newStatus, studentId, studentName) {
        const panel = document.querySelector(`.validation-panel[data-cert-id="${certificateId}"]`);
        const horasInput = panel.querySelector('.horas-validadas');
        const obsTextarea = panel.querySelector('.observacao');
        
        const data = {
            status: newStatus,
            horas_validadas: horasInput.value,
            observacao: obsTextarea.value,
        };

        if ((newStatus === 'REPROVADO' || newStatus === 'APROVADO_COM_RESSALVAS') && !data.observacao) {
            // SUBSTITUIÇÃO 1: alert() por showToast()
            showToast('A observação é obrigatória para esta ação.', 'error');
            return;
        }
        
        try {
            // ALTERADO AQUI
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
            
            // SUBSTITUIÇÃO 2: alert() por showToast()
            showToast('Certificado avaliado com sucesso!');
            
            // Recarrega a visão de detalhes para mostrar o status atualizado
            showDetailView(studentId, studentName);

        } catch (error) {
            // SUBSTITUIÇÃO 3: alert() por showToast()
            showToast(error.message, 'error');
        }
    }

    // =======================================================
    // 4. EVENTOS E INICIALIZAÇÃO
    // =======================================================
    backBtn.addEventListener('click', () => {
        detailView.style.display = 'none';
        listView.style.display = 'block';
        fetchAndRenderStudents(); 
    });

    fetchAndRenderStudents();
});