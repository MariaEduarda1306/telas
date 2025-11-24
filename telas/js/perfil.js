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

    const userData = JSON.parse(userDataString);

    // =======================================================
    // 2. PREENCHIMENTO DOS DADOS DO USUÁRIO NA PÁGINA
    // =======================================================
    function populateUserData() {
        document.getElementById('profile-name').textContent = userData.nome || 'Nome não encontrado';
        document.getElementById('profile-email').textContent = userData.email || 'Email não encontrado';

        const userType = userData.tipo;

        if (userType === 'ALUNO') {
            document.getElementById('aluno-matricula').textContent = userData.matricula || '--';
            document.getElementById('aluno-curso').textContent = userData.curso?.nome || 'Não informado';
            document.getElementById('aluno-fase').textContent = userData.fase ? `${userData.fase}ª` : '--';
            fetchAndDisplayProgress(userData.id, authToken);
        }
        else if (userType === 'COORDENADOR') {
            document.getElementById('coord-curso').textContent = userData.curso_coordenado?.nome || 'Não informado';
            document.getElementById('coord-id').textContent = userData.matricula || '--';
        }
        else if (userType === 'SECRETARIA') {
            document.getElementById('secretaria-id').textContent = userData.matricula || '--';
        }
        else if (userType === 'ADMINISTRADOR') {
            document.getElementById('admin-id').textContent = userData.matricula || '--';
        }
    }

    async function fetchAndDisplayProgress(userId, token) {
        try {
            // Rota conforme documentação (Seção 5): GET /usuarios/{id}/progresso
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
            const percentage = (totalCompleted / totalRequired) * 100;

            // Atualiza a barra de progresso visualmente
            const progressBarFill = document.querySelector('.progress-bar-fill');
            if (progressBarFill) {
                progressBarFill.style.width = `${percentage}%`;
            }
            
            const progressLabel = document.querySelector('.progress-label');
            if (progressLabel) {
                progressLabel.textContent = `${totalCompleted} / ${totalRequired} Horas`;
            }

        } catch (error) {
            console.error("Erro ao carregar progresso:", error);
            const progressLabel = document.querySelector('.progress-label');
            if (progressLabel) {
                progressLabel.textContent = "Erro ao carregar dados.";
            }
        }
    }

    // =======================================================
    // 3. LÓGICA DA INTERFACE (AVATAR, SENHA, LOGOUT)
    // =======================================================
    const logoutBtn = document.querySelector('.logout-btn[href="index.html"]');
     if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    }

    const avatarWrapper = document.querySelector('.profile-avatar-wrapper');
    if (avatarWrapper) {
      const avatarInput = document.getElementById('avatar-input');
      const profileAvatarImg = document.getElementById('profile-avatar');
      const avatarMenu = document.getElementById('avatar-menu');
      const uploadBtn = document.getElementById('upload-btn');
      const removeBtn = document.getElementById('remove-btn');
      let userHasPhoto = false;

      function setAvatarState(hasPhoto) {
        userHasPhoto = hasPhoto;
        avatarWrapper.classList.toggle('has-photo', hasPhoto);
        removeBtn.classList.toggle('hidden', !hasPhoto);
        if (!hasPhoto) profileAvatarImg.src = "";
      }
      // Estado inicial (poderia ser melhorado verificando se o userData tem avatar_url)
      setAvatarState(userHasPhoto);

      avatarWrapper.addEventListener('click', (e) => {
        if (!e.target.closest('#avatar-menu')) {
          avatarMenu.style.display = avatarMenu.style.display === 'block' ? 'none' : 'block';
        }
      });
      document.addEventListener('click', (e) => {
        if (!avatarWrapper.contains(e.target)) avatarMenu.style.display = 'none';
      });

      uploadBtn.addEventListener('click', () => avatarInput.click());
      removeBtn.addEventListener('click', () => setAvatarState(false));

      avatarInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          profileAvatarImg.src = e.target.result;
          setAvatarState(true);
        };
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            // Rota conforme documentação (Seção 5): POST /usuarios/avatar
            const response = await fetch(`${API_BASE_URL}/api/usuarios/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                },
                body: formData
            });

            if (!response.ok) throw new Error('Falha ao enviar a imagem.');
            
            showToast('Foto de perfil atualizada com sucesso!');

        } catch (error) {
            console.error('Erro no upload do avatar:', error);
            showToast('Erro ao atualizar a foto de perfil.', 'error');
        }
      });
    }

    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
      const changePasswordBtn = document.getElementById('change-password-btn');
      const closeModalBtn = passwordModal.querySelector('.close-btn');
      const cancelBtn = passwordModal.querySelector('#cancel-btn');

      changePasswordBtn.addEventListener('click', () => passwordModal.showModal());
      closeModalBtn.addEventListener('click', () => passwordModal.close());
      cancelBtn.addEventListener('click', () => passwordModal.close());
      passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) passwordModal.close();
      });

      const passwordForm = document.getElementById('password-form');
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // const currentPassword = document.getElementById('current-password').value; // Se necessário enviar no futuro
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            showToast('A nova senha e a confirmação não correspondem.', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showToast('A nova senha deve ter no mínimo 8 caracteres.', 'error');
            return;
        }

        try {
            // Rota conforme documentação (Seção 3): POST /auth/change-password
            const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'POST', 
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    password: newPassword,
                    password_confirmation: confirmPassword
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Não foi possível alterar a senha.');

            showToast('Senha alterada com sucesso!');
            passwordModal.close();
            passwordForm.reset();

        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            showToast(`Erro: ${error.message}`, 'error');
        }
      });
    }

    // =======================================================
    // 4. INICIALIZAÇÃO
    // =======================================================
    populateUserData();
});