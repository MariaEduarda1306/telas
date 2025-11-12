// js/login.js

document.addEventListener('DOMContentLoaded', () => {

    // =======================================================
    // LÓGICA DE LOGIN (CONEXÃO COM A API)
    // =======================================================
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impede o recarregamento da página

            // ALTERADO AQUI: Busca pelo id "cpf" (do HTML corrigido)
            const userField = document.getElementById('cpf');
            const passwordField = document.getElementById('password');
            
            // Lógica de feedback removida, usaremos showToast()

            // ALTERADO AQUI: Chave "email" alterada para "cpf"
            const data = {
                cpf: userField.value, // Alterado de 'email' para 'cpf'
                password: passwordField.value
            };

            try {
                // 1. Faz a requisição para a API
                const response = await fetch('http://localhost:8000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                // 2. Verifica se a resposta foi bem-sucedida
                if (!response.ok) {
                    throw new Error(result.message || 'Usuário ou senha inválidos.');
                }
                
                // 3. Se o login deu certo, armazena o token e os dados do usuário
                //    (CORRIGIDO para access_token e usuario)
                localStorage.setItem('authToken', result.access_token);
                localStorage.setItem('userData', JSON.stringify(result.usuario));

                // 4. Redireciona para o dashboard correto
                //    (CORRIGIDO para result.usuario.tipo)
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
                        throw new Error('Tipo de usuário desconhecido.');
                }

            } catch (error) {
                // 5. Se falhar, mostra a mensagem de erro com showToast
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
    
    forgotPasswordLink.addEventListener('click', () => {
        loginWrapper.classList.add('hidden');
        recoveryWrapper.classList.remove('hidden');
    });

    recoveryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        recoveryWrapper.classList.add('hidden');
        confirmationWrapper.classList.remove('hidden');
    });

    const showLogin = () => {
        recoveryWrapper.classList.add('hidden');
        confirmationWrapper.classList.add('hidden');
        loginWrapper.classList.remove('hidden');
    };

    backToLoginLink1.addEventListener('click', showLogin);
    backToLoginLink2.addEventListener('click', showLogin);

    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('password-toggle');
    
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