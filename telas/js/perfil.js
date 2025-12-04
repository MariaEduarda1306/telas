// js/perfil.js

document.addEventListener('DOMContentLoaded', () => {
    // =======================================================
    // 1. SEGURANÇA E CARREGAMENTO DE DADOS
    // =======================================================
    const userDataString = localStorage.getItem('userData');
    const authToken = localStorage.getItem('authToken');

    if (!userDataString || !authToken) {
        window.location.href = 'index.html';
        return;
    }

    let userData = JSON.parse(userDataString);

    // Helper: Formatar Data
    function formatDate(dateString) {
        if (!dateString) return '--';
        const parts = dateString.split('-'); // Assume formato Y-m-d
        if (parts.length !== 3) return dateString;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    // Helper: Formatar Tipo de Usuário
    function formatUserType(type) {
        if (!type) return '--';
        const map = {
            'ALUNO': 'Aluno',
            'COORDENADOR': 'Coordenador',
            'SECRETARIA': 'Secretaria',
            'ADMINISTRADOR': 'Administrador'
        };
        return map[type] || type;
    }

    // Helper: Corrigir URL do Arquivo (Evita 404/403)
    function getCorrectFileUrl(rawPath) {
        if (!rawPath) return '';
        if (rawPath.startsWith('http')) return rawPath;

        // Limpa prefixos para evitar 'storage/storage/...'
        let cleanPath = rawPath.replace(/^public\//, '');
        cleanPath = cleanPath.replace(/^\/?storage\//, '');
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

        return `${API_BASE_URL}/storage/${cleanPath}`;
    }

    // Helper: Feedback Visual de Erro
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
    // 2. PREENCHIMENTO DOS DADOS DO USUÁRIO NA PÁGINA
    // =======================================================
    function populateUserData() {
        // Dados Básicos
        const nameElement = document.getElementById('profile-name');
        const emailElement = document.getElementById('profile-email');
        const avatarImg = document.getElementById('profile-avatar');
        
        // Campos Específicos
        const typeElement = document.getElementById('profile-type');
        const dobElement = document.getElementById('profile-dob');

        if (nameElement) nameElement.textContent = userData.nome || 'Nome não encontrado';
        if (emailElement) emailElement.textContent = userData.email || 'Email não encontrado';
        
        if (typeElement) typeElement.textContent = formatUserType(userData.tipo);

        // Data de Nascimento (Exceto Admin)
        if (dobElement && userData.tipo !== 'ADMINISTRADOR') {
            dobElement.textContent = formatDate(userData.data_nascimento);
        }

        // Carregar Avatar Salvo
        if (avatarImg && userData.avatar_url) {
            avatarImg.src = getCorrectFileUrl(userData.avatar_url);
            
            const avatarWrapper = document.querySelector('.profile-avatar-wrapper');
            if (avatarWrapper) avatarWrapper.classList.add('has-photo');
            
            const removeBtn = document.getElementById('remove-btn');
            if (removeBtn) removeBtn.classList.remove('hidden');
        }

        const userType = userData.tipo;
        const displayId = userData.cpf || userData.id || '--';

        // Preenchimento Condicional por Tipo
        if (userType === 'ALUNO') {
            const elMatricula = document.getElementById('aluno-matricula');
            const elCurso = document.getElementById('aluno-curso');
            const elFase = document.getElementById('aluno-fase');

            if (elMatricula) elMatricula.textContent = displayId;
            if (elCurso) elCurso.textContent = userData.curso?.nome || 'Não informado';
            if (elFase) elFase.textContent = userData.fase ? `${userData.fase}ª` : '--';
            
            fetchAndDisplayProgress(userData.id, authToken);
        }
        else if (userType === 'COORDENADOR') {
            const elCoordCurso = document.getElementById('coord-curso');
            const elCoordId = document.getElementById('coord-id');

            if (elCoordCurso) {
                const nomeCurso = userData.curso_coordenado?.nome || userData.curso?.nome || 'Não informado';
                elCoordCurso.textContent = nomeCurso;
            }
            if (elCoordId) elCoordId.textContent = displayId;
        }
        else if (userType === 'SECRETARIA') {
            const elSecId = document.getElementById('secretaria-id');
            if (elSecId) elSecId.textContent = displayId;
        }
        else if (userType === 'ADMINISTRADOR') {
            const elAdminId = document.getElementById('admin-id');
            if (elAdminId) elAdminId.textContent = displayId;
        }
    }

    // Barra de Progresso (Apenas Aluno)
    async function fetchAndDisplayProgress(userId, token) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/usuarios/${userId}/progresso`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Falha ao buscar progresso.');
            
            const progressData = await response.json();
            const totalRequired = progressData.horas_necessarias || 200;
            const totalCompleted = progressData.total_horas_aprovadas || 0;
            
            let percentage = (totalCompleted / totalRequired) * 100;
            if (percentage > 100) percentage = 100;

            const progressBarFill = document.querySelector('.progress-bar-fill');
            if (progressBarFill) progressBarFill.style.width = `${percentage}%`;
            
            const progressLabel = document.querySelector('.progress-label');
            if (progressLabel) progressLabel.textContent = `${totalCompleted} / ${totalRequired} Horas`;

        } catch (error) {
            console.error("Erro ao carregar progresso:", error);
            const progressLabel = document.querySelector('.progress-label');
            if (progressLabel) progressLabel.textContent = "Dados indisponíveis";
        }
    }

    // =======================================================
    // 3. LÓGICA DA INTERFACE (AVATAR, SENHA, LOGOUT)
    // =======================================================
    
    // Logout
    const logoutBtn = document.querySelector('.logout-btn[href="index.html"]');
     if (logoutBtn) {
        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
            } catch (e) { console.warn('Logout offline ou falha na API'); }
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    }

    // Avatar Logic (Upload e Visualização)
    const avatarWrapper = document.querySelector('.profile-avatar-wrapper');
    if (avatarWrapper) {
      const avatarInput = document.getElementById('avatar-input');
      const profileAvatarImg = document.getElementById('profile-avatar');
      const avatarMenu = document.getElementById('avatar-menu');
      const uploadBtn = document.getElementById('upload-btn');
      const removeBtn = document.getElementById('remove-btn');
      
      function setAvatarState(hasPhoto, url = "") {
        avatarWrapper.classList.toggle('has-photo', hasPhoto);
        if (removeBtn) removeBtn.classList.toggle('hidden', !hasPhoto);
        
        if (hasPhoto && url) {
            profileAvatarImg.src = url;
        } else if (!hasPhoto) {
            profileAvatarImg.src = ""; 
        }
      }

      avatarWrapper.addEventListener('click', (e) => {
        if (!e.target.closest('#avatar-menu') && !e.target.closest('#avatar-input')) {
          avatarMenu.style.display = avatarMenu.style.display === 'block' ? 'none' : 'block';
        }
      });

      document.addEventListener('click', (e) => {
        if (!avatarWrapper.contains(e.target)) avatarMenu.style.display = 'none';
      });

      if (uploadBtn) uploadBtn.addEventListener('click', () => avatarInput.click());
      
      if (removeBtn) {
          removeBtn.addEventListener('click', () => {
              setAvatarState(false);
              showToast('Foto removida (visualização).', 'info');
          });
      }

      if (avatarInput) {
        avatarInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Preview Imediato (Base64)
            const reader = new FileReader();
            reader.onload = (e) => { profileAvatarImg.src = e.target.result; };
            reader.readAsDataURL(file);

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const response = await fetch(`${API_BASE_URL}/api/usuarios/avatar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Accept': 'application/json',
                    },
                    body: formData
                });

                if (!response.ok) throw new Error('Falha ao enviar a imagem.');
                
                const result = await response.json();
                
                if (result.avatar_url) {
                    userData.avatar_url = result.avatar_url;
                    localStorage.setItem('userData', JSON.stringify(userData));
                    // Usa o helper para garantir a URL correta
                    setAvatarState(true, getCorrectFileUrl(result.avatar_url));
                } else {
                    setAvatarState(true);
                }

                showToast('Foto de perfil atualizada com sucesso!');
                avatarMenu.style.display = 'none';

            } catch (error) {
                console.error('Erro no upload do avatar:', error);
                showToast('Erro ao salvar a foto no servidor.', 'error');
                // Reverte para a imagem anterior correta se falhar
                if (userData.avatar_url) {
                    profileAvatarImg.src = getCorrectFileUrl(userData.avatar_url);
                } else {
                    setAvatarState(false);
                }
            }
        });
      }
    }

    // Alteração de Senha (Com Validação Visual)
    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
      const changePasswordBtn = document.getElementById('change-password-btn');
      const closeModalBtn = passwordModal.querySelector('.close-btn');
      const cancelBtn = passwordModal.querySelector('#cancel-btn');

      if (changePasswordBtn) {
          changePasswordBtn.addEventListener('click', () => {
              passwordModal.querySelectorAll('input').forEach(input => toggleError(input, false));
              passwordModal.showModal();
          });
      }
      
      if (closeModalBtn) closeModalBtn.addEventListener('click', () => passwordModal.close());
      if (cancelBtn) cancelBtn.addEventListener('click', () => passwordModal.close());
      
      passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) passwordModal.close();
      });

      const passwordForm = document.getElementById('password-form');
      if (passwordForm) {
          passwordForm.querySelectorAll('input').forEach(input => {
              input.addEventListener('input', () => toggleError(input, false));
          });

          passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentInput = document.getElementById('current-password');
            const newInput = document.getElementById('new-password');
            const confirmInput = document.getElementById('confirm-password');
            
            const currentVal = currentInput.value;
            const newVal = newInput.value;
            const confirmVal = confirmInput.value;
            
            let hasError = false;

            // Validação Visual
            if (!currentVal) { toggleError(currentInput, true); hasError = true; }
            if (!newVal) { toggleError(newInput, true); hasError = true; }
            if (!confirmVal) { toggleError(confirmInput, true); hasError = true; }

            if (hasError) return showToast('Por favor, preencha todos os campos.', 'error');

            if (newVal !== confirmVal) {
                showToast('A nova senha e a confirmação não conferem.', 'error');
                toggleError(newInput, true);
                toggleError(confirmInput, true);
                return;
            }
            if (newVal.length < 8) {
                showToast('A nova senha deve ter no mínimo 8 caracteres.', 'error');
                toggleError(newInput, true);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                    method: 'POST', 
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        current_password: currentVal,
                        password: newVal,
                        password_confirmation: confirmVal
                    })
                });

                if (response.status === 204) {
                    showToast('Senha alterada com sucesso!');
                    passwordModal.close();
                    passwordForm.reset();
                    return;
                }

                const result = await response.json();

                if (!response.ok) throw new Error(result.message || 'Erro ao alterar senha.');
                
                showToast('Senha alterada com sucesso!');
                passwordModal.close();
                passwordForm.reset();

            } catch (error) {
                console.error('Erro:', error);
                showToast(`Erro: ${error.message || 'Erro desconhecido'}`, 'error');
                if (error.message.toLowerCase().includes('atual')) toggleError(currentInput, true);
            }
          });
      }
    }

    populateUserData();

    // =======================================================
    // 4. CARREGAMENTO DOS SUMÁRIOS (Dashboard Stats)
    // =======================================================
    async function loadProfileSummary() {
        const userType = userData.tipo;

        // COORDENADOR
        if (userType === 'COORDENADOR') {
            const elHoras = document.getElementById('summary-horas');
            const elPendencias = document.getElementById('summary-pendencias');
            if (!elHoras && !elPendencias) return;

            try {
                const respPendencias = await fetch(`${API_BASE_URL}/api/certificados?status=ENTREGUE`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const pendenciasData = await respPendencias.json();
                const countPendencias = Array.isArray(pendenciasData) ? pendenciasData.length : (pendenciasData.data ? pendenciasData.data.length : 0);
                if (elPendencias) elPendencias.textContent = countPendencias;

                const respAprovados = await fetch(`${API_BASE_URL}/api/certificados?status=APROVADO`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const aprovadosData = await respAprovados.json();
                const listaAprovados = Array.isArray(aprovadosData) ? aprovadosData : (aprovadosData.data || []);
                const totalHoras = listaAprovados.reduce((acc, cert) => acc + (Number(cert.horas_validadas) || 0), 0);
                if (elHoras) elHoras.textContent = totalHoras;
            } catch (error) { console.error("Erro ao carregar sumário:", error); }
        }

        // SECRETARIA
        else if (userType === 'SECRETARIA') {
            const elTotalAlunos = document.getElementById('summary-alunos');
            const elTotalCoords = document.getElementById('summary-coords');
            if (!elTotalAlunos && !elTotalCoords) return;

            try {
                const response = await fetch(`${API_BASE_URL}/api/usuarios`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (!response.ok) throw new Error('Falha');
                const usersData = await response.json();
                const usersList = Array.isArray(usersData) ? usersData : (usersData.data || []);

                if (elTotalAlunos) elTotalAlunos.textContent = usersList.filter(u => u.tipo === 'ALUNO').length;
                if (elTotalCoords) elTotalCoords.textContent = usersList.filter(u => u.tipo === 'COORDENADOR').length;
            } catch (error) { console.error("Erro ao carregar sumário:", error); }
        }
    }

    loadProfileSummary();
});