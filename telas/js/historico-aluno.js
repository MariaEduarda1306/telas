// js/historico-aluno.js

document.addEventListener('DOMContentLoaded', async () => {
    
    const accordionContainer = document.getElementById('accordion-container');
    accordionContainer.innerHTML = '<p>Carregando seu histórico...</p>'; // Feedback inicial

    try {
        // 2. BUSCAR OS CERTIFICADOS NA API
        // ALTERADO AQUI
        const response = await fetch(`${API_BASE_URL}/api/certificados`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Não foi possível carregar seu histórico.');
        }

        const certificados = await response.json();

        // 3. RENDERIZAR OS DADOS NA TELA
        if (certificados.data.length === 0) { // Ajustado para pegar o array 'data' da paginação
            accordionContainer.innerHTML = '<p>Você ainda não enviou nenhum certificado.</p>';
            return;
        }

        accordionContainer.innerHTML = ''; // Limpa a mensagem "Carregando..."

        certificados.data.forEach(cert => { // Ajustado para pegar o array 'data' da paginação
            const statusInfo = getStatusInfo(cert.status);
            
            // Formata a data para um formato mais legível (DD/MM/YYYY)
            const dataEnvio = new Date(cert.created_at).toLocaleDateString('pt-BR');

            const accordionItemHTML = `
                <div class="accordion-item">
                    <button class="accordion-header">
                        <div class="header-title">
                            <h3>${cert.nome_certificado}</h3>
                            <p>ID do Requerimento: ${cert.id}</p>
                        </div>
                        <div class="header-status">
                            <span class="status ${statusInfo.className}">${statusInfo.text}</span>
                            <i class="fas fa-chevron-down accordion-icon"></i>
                        </div>
                    </button>
                    <div class="accordion-content">
                        <div class="content-wrapper">
                            <div class="details-list">
                                <div class="detail-item"><span>Data de Envio:</span> <span>${dataEnvio}</span></div>
                                <div class="detail-item"><span>Categoria:</span> <span>${cert.categoria.replace('_', ' ')}</span></div>
                                <div class="detail-item"><span>Horas Solicitadas:</span> <span>${cert.carga_horaria_solicitada}</span></div>
                                <div class="detail-item"><span>Horas Aprovadas:</span> <span>${cert.horas_validadas || '--'}</span></div>
                                <div class="detail-item"><span>Observação:</span> <span>${cert.observacao || 'Nenhuma observação.'}</span></div>
                            </div>
                            <div class="preview-section">
                                <h4>Pré-visualização do Comprovante</h4>
                                <embed class="pdf-preview" src="${cert.arquivo_url || ''}" type="application/pdf" />
                            </div>
                        </div>
                    </div>
                </div>
            `;
            accordionContainer.innerHTML += accordionItemHTML;
        });

        // 4. REATIVAR A FUNCIONALIDADE DO ACORDEÃO
        setupAccordion();

    } catch (error) {
        accordionContainer.innerHTML = `<p style="color: var(--status-reprovado);">${error.message}</p>`;
        console.error('Erro:', error);
    }
});