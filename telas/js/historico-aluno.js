// js/historico-aluno.js

document.addEventListener('DOMContentLoaded', async () => {
    
    const accordionContainer = document.getElementById('accordion-container');
    accordionContainer.innerHTML = '<p>Carregando seu histórico...</p>'; // Feedback inicial

    try {
        // 2. BUSCAR OS CERTIFICADOS NA API (Filtra implicitamente pelo token do aluno logado)
        const response = await fetch(`${API_BASE_URL}/api/certificados`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Não foi possível carregar seu histórico.');
        }

        const result = await response.json();
        // MELHORIA: Suporte a resposta com ou sem paginação (wrapper 'data')
        const certificados = result.data || result;

        // 3. RENDERIZAR OS DADOS NA TELA
        if (certificados.length === 0) {
            accordionContainer.innerHTML = '<p>Você ainda não enviou nenhum certificado.</p>';
            return;
        }

        accordionContainer.innerHTML = ''; // Limpa a mensagem "Carregando..."

        certificados.forEach(cert => {
            const statusInfo = getStatusInfo(cert.status);
            
            // Formata a data para um formato mais legível (DD/MM/YYYY)
            const dataEnvio = new Date(cert.created_at).toLocaleDateString('pt-BR');

            // Tratamento seguro para categoria, caso venha nulo ou undefined
            const categoriaTexto = cert.categoria ? cert.categoria.replace(/_/g, ' ') : 'Sem categoria';

            // --- CORREÇÃO ROBUSTA DA URL DO ARQUIVO ---
            let rawPath = cert.arquivo_url || '';
            
            // 1. Se já for uma URL completa (http...), usa ela direto
            let fileUrl = rawPath;

            if (rawPath && !rawPath.startsWith('http')) {
                // 2. Limpa prefixos comuns que o Laravel pode ter salvo
                // Remove 'public/' do início
                let cleanPath = rawPath.replace(/^public\//, '');
                
                // Remove '/storage/' ou 'storage/' do início para evitar duplicação
                cleanPath = cleanPath.replace(/^\/?storage\//, '');
                
                // Remove qualquer barra solta no início
                if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

                // 3. Monta a URL final limpa
                fileUrl = `${API_BASE_URL}/storage/${cleanPath}`;
            }
            // -------------------------------------------

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
                                <div class="detail-item"><span>Categoria:</span> <span>${categoriaTexto}</span></div>
                                <div class="detail-item"><span>Horas Solicitadas:</span> <span>${cert.carga_horaria_solicitada}</span></div>
                                <div class="detail-item"><span>Horas Aprovadas:</span> <span>${cert.horas_validadas || '--'}</span></div>
                                <div class="detail-item"><span>Observação:</span> <span>${cert.observacao || 'Nenhuma observação.'}</span></div>
                            </div>
                            <div class="preview-section">
                                <h4>Pré-visualização do Comprovante</h4>
                                <embed class="pdf-preview" src="${fileUrl || ''}" type="application/pdf" />
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