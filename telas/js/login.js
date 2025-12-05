// js/login.js

document.addEventListener('DOMContentLoaded', () => {

    // =======================================================
    // 0. MÁSCARA DE CPF (VISUAL)
    // =======================================================
    const cpfInput = document.getElementById('cpf');

    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value;

            // 1. Remove tudo que não é número para refazer a máscara
            value = value.replace(/\D/g, "");

            // 2. Limita a 11 dígitos numéricos
            if (value.length > 11) {
                value = value.slice(0, 11);
            }

            // 3. Aplica a formatação progressiva
            value = value.replace(/(\d{3})(\d)/, "$1.$2");
            value = value.replace(/(\d{3})(\d)/, "$1.$2");
            value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

            // 4. Devolve o valor formatado ao input
            e.target.value = value;
        });
    }

    // =======================================================
    // FUNÇÃO AUXILIAR: MARCAR/DESMARCAR ERRO (VISUAL)
    // =======================================================
    function toggleError(element, hasError) {
        if (!element) return;
        if (hasError) {
            element.classList.add('input-error', 'shake');
            // Remove a animação de "tremida" depois que ela roda
            setTimeout(() => element.classList.remove('shake'), 500);
        } else {
            element.classList.remove('input-error', 'shake');
        }
    }

    // =======================================================
    // 1. LÓGICA DE LOGIN (CONEXÃO COM A API)
    // =======================================================
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        // Listener para limpar o erro visual assim que o usuário digita
        const inputs = loginForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => toggleError(input, false));
        });

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const userField = document.getElementById('cpf');
            const passwordField = document.getElementById('password');
            let hasError = false;

            // --- VALIDAÇÃO VISUAL MANUAL ---
            if (!userField.value.trim()) {
                toggleError(userField, true);
                hasError = true;
            } else {
                toggleError(userField, false);
            }

            if (!passwordField.value.trim()) {
                toggleError(passwordField, true);
                hasError = true;
            } else {
                toggleError(passwordField, false);
            }

            if (hasError) {
                showToast('Por favor, preencha os campos destacados.', 'error');
                return; // Para a execução aqui
            }
            // -------------------------------

            const data = {
                cpf: userField.value,
                password: passwordField.value
            };

            // Feedback visual no botão (Loading)
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Usuário ou senha inválidos.');
                }

                localStorage.setItem('authToken', result.access_token);
                localStorage.setItem('userData', JSON.stringify(result.usuario));

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
                showToast(error.message, 'error');
                console.error('Falha no login:', error);
                
                // Se der erro (ex: senha errada), restaura o botão
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                // Opcional: Marcar os campos como erro novamente para feedback visual
                toggleError(userField, true);
                toggleError(passwordField, true);
            }
        });
    }

    // =======================================================
    // 2. LÓGICA DA INTERFACE (Troca de formulário, etc.)
    // =======================================================
    const loginWrapper = document.getElementById('login-form-wrapper');
    const recoveryWrapper = document.getElementById('recovery-form-wrapper');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink1 = document.getElementById('back-to-login-link1');

    if (forgotPasswordLink && loginWrapper && recoveryWrapper) {
        forgotPasswordLink.addEventListener('click', () => {
            loginWrapper.classList.add('hidden');
            recoveryWrapper.classList.remove('hidden');
        });
    }

    const showLogin = () => {
        if (recoveryWrapper) recoveryWrapper.classList.add('hidden');
        if (loginWrapper) loginWrapper.classList.remove('hidden');
    };

    if (backToLoginLink1) {
        backToLoginLink1.addEventListener('click', showLogin);
    }

    // =======================================================
    // 3. TOGGLE DE SENHA (Mostrar/Ocultar)
    // =======================================================
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

    // =======================================================
    // 4. MODAL DE PRIMEIRO ACESSO
    // =======================================================
    const firstAccessLink = document.getElementById('first-access-link');
    const firstAccessModal = document.getElementById('first-access-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const confirmCloseBtn = document.getElementById('confirm-close-btn');

    if (firstAccessLink && firstAccessModal) {
        firstAccessLink.addEventListener('click', (e) => {
            e.preventDefault();
            firstAccessModal.showModal();
        });

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                firstAccessModal.close();
            });
        }

        if (confirmCloseBtn) {
            confirmCloseBtn.addEventListener('click', () => {
                firstAccessModal.close();
            });
        }
    }
});