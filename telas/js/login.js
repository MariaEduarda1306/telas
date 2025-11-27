// js/login.js

document.addEventListener('DOMContentLoaded', () => {

    // =======================================================
    // LÓGICA DE LOGIN (CONEXÃO COM A API)
    // =======================================================
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impede o recarregamento da página

            const userField = document.getElementById('cpf');
            const passwordField = document.getElementById('password');
            
            // Monta o payload conforme a Documentação v1.1
            const data = {
                cpf: userField.value,
                password: passwordField.value
            };

            try {
                // MELHORIA: Usando a variável global API_BASE_URL definida em utils.js
                // Isso garante consistência com o resto do sistema.
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                // Verifica se a resposta foi bem-sucedida
                if (!response.ok) {
                    throw new Error(result.message || 'Usuário ou senha inválidos.');
                }
                
                // Armazena o token e os dados do usuário
                localStorage.setItem('authToken', result.access_token);
                localStorage.setItem('userData', JSON.stringify(result.usuario));

                // Redireciona para o dashboard correto com base no ENUM de tipos
                const userType = result.usuario.tipo; 
                
                switch (userType) {
                    case 'ALUNO':
                        window.location.href = 'dashboard alunos.html';
                        break;
                    case 'COORDENADOR':
                        window.location.href = 'dashboard coordenador.html';
                        break;
                    case 'SECRETARIA':
                        window.location.href = 'dashboard secretaria.html';
                        break;
                    case 'ADMINISTRADOR':
                        window.location.href = 'dashboard administrador.html';
                        break;
                    default:
                        throw new Error('Tipo de usuário desconhecido ou sem dashboard definido.');
                }

            } catch (error) {
                // Mostra a mensagem de erro visualmente
                showToast(error.message, 'error');
                console.error('Falha no login:', error);
            }
        });
    }

    // =======================================================
    // LÓGICA DA INTERFACE (Troca de formulário, Modal, etc.)
    // =======================================================
    const loginWrapper = document.getElementById('login-form-wrapper');
    const recoveryWrapper = document.getElementById('recovery-form-wrapper');
    const confirmationWrapper = document.getElementById('confirmation-wrapper');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const recoveryForm = document.getElementById('recovery-form');
    const backToLoginLink1 = document.getElementById('back-to-login-link1');
    const backToLoginLink2 = document.getElementById('back-to-login-link2');
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', () => {
            loginWrapper.classList.add('hidden');
            recoveryWrapper.classList.remove('hidden');
        });
    }

    if (recoveryForm) {
        recoveryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Aqui entraria a lógica de recuperação de senha (ex: API call)
            recoveryWrapper.classList.add('hidden');
            confirmationWrapper.classList.remove('hidden');
        });
    }

    const showLogin = () => {
        recoveryWrapper.classList.add('hidden');
        confirmationWrapper.classList.add('hidden');
        loginWrapper.classList.remove('hidden');
    };

    if (backToLoginLink1) backToLoginLink1.addEventListener('click', showLogin);
    if (backToLoginLink2) backToLoginLink2.addEventListener('click', showLogin);

    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('password-toggle');
    
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordToggle.classList.remove('fa-eye-slash');
                passwordToggle.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                passwordToggle.classList.remove('fa-eye');
                passwordToggle.classList.add('fa-eye-slash');
            }
        });
    }

    // --- Lógica do Modal de Primeiro Acesso ---
    const firstAccessLink = document.getElementById('first-access-link');
    const firstAccessModal = document.getElementById('first-access-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const confirmCloseBtn = document.getElementById('confirm-close-btn');

    if (firstAccessLink && firstAccessModal) {
        firstAccessLink.addEventListener('click', (e) => {
            e.preventDefault();
            firstAccessModal.showModal();
        });

        closeModalBtn.addEventListener('click', () => {
            firstAccessModal.close();
        });

        confirmCloseBtn.addEventListener('click', () => {
            firstAccessModal.close();
        });
    }
});