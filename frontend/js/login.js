/**
 * Login Page Logic
 */

(function () {
    // If already authenticated, redirect to home
    if (isAuthenticated()) {
        window.location.replace('home.html');
        return;
    }

    const form = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('login-error');

    // Enable/disable submit button based on field values
    function checkFields() {
        const usernameValid = usernameInput.value.trim().length > 0;
        const passwordValid = passwordInput.value.length > 0;
        loginBtn.disabled = !(usernameValid && passwordValid);
    }

    usernameInput.addEventListener('input', checkFields);
    passwordInput.addEventListener('input', checkFields);

    // Hide error when user starts typing
    usernameInput.addEventListener('input', hideError);
    passwordInput.addEventListener('input', hideError);

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.add('visible');
    }

    function hideError() {
        errorDiv.classList.remove('visible');
    }

    // Handle form submit
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideError();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showError('Please enter both username and password.');
            return;
        }

        setLoading(loginBtn, true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.status === 401) {
                const data = await response.json();
                showError(data.detail || 'Invalid username or password');
                setLoading(loginBtn, false);
                return;
            }

            if (!response.ok) {
                showError('Something went wrong. Please try again.');
                setLoading(loginBtn, false);
                return;
            }

            const data = await response.json();

            // Store tokens and redirect
            storeTokens(data.access_token, data.refresh_token);
            window.location.replace('home.html');

        } catch (error) {
            showError('Server is unavailable. Please try again later.');
            setLoading(loginBtn, false);
        }
    });
})();
