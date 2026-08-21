/**
 * Users Page Logic - User Management Module
 */

(function () {
    // Auth guard
    authGuard();

    // Set active tab
    const tabUsers = document.getElementById('tab-users');
    if (tabUsers) tabUsers.classList.add('active');

    // Display current user
    try {
        const token = getAccessToken();
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const name = payload.username || 'admin';
            const nameEl = document.getElementById('user-name');
            const avatarEl = document.getElementById('user-avatar');
            if (nameEl) nameEl.textContent = name;
            if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
        }
    } catch (e) {}

    // Logout
    document.getElementById('logout-btn').addEventListener('click', function () {
        clearTokens();
        window.location.replace('login.html');
    });

    // State
    let currentPage = 1;
    let pageSize = 10;
    let searchFilter = '';
    let totalUsers = 0;
    let deleteTargetId = null;
    let sortBy = 'id';
    let sortDir = 'asc';

    // DOM Elements
    const tbody = document.getElementById('users-tbody');
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    const paginationDiv = document.getElementById('pagination');
    const searchInput = document.getElementById('search-input');

    // ==================== Fetch & Render Users ====================

    async function fetchUsers() {
        showLoading(true);
        emptyState.style.display = 'none';

        try {
            const params = new URLSearchParams({
                page: currentPage,
                size: pageSize,
                sort_by: sortBy,
                sort_dir: sortDir
            });
            if (searchFilter) {
                params.set('username', searchFilter);
            }

            const data = await apiRequest(`/api/users?${params.toString()}`);
            totalUsers = data.total;
            renderTable(data.users);
            renderPagination();
        } catch (error) {
            showToast(error.message || 'Could not retrieve users', 'error');
            tbody.innerHTML = '';
        } finally {
            showLoading(false);
        }
    }

    function renderTable(users) {
        if (!users || users.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        // Color palette for user avatars
        const colors = ['#4a90d9', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50'];

        tbody.innerHTML = users.map(user => {
            const initial = user.username.charAt(0).toUpperCase();
            const color = colors[user.id % colors.length];
            return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-cell-avatar" style="background: ${color}">${initial}</div>
                        <div class="user-cell-info">
                            <span class="user-cell-name">${escapeHtml(user.username)}</span>
                        </div>
                    </div>
                </td>
                <td>${formatDate(user.created_at)}</td>
                <td class="actions-cell" style="justify-content: flex-end;">
                    <button class="action-icon" title="Edit" onclick="openEditModal(${user.id}, '${escapeAttr(user.username)}')">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button class="action-icon" title="Change Password" onclick="openPasswordModal(${user.id})">
                        <i class="fa-solid fa-lock"></i>
                    </button>
                    <button class="action-icon action-danger" title="Delete" onclick="openDeleteModal(${user.id}, '${escapeAttr(user.username)}')">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        // Update user count
        const countEl = document.getElementById('user-count');
        if (countEl) countEl.textContent = `${totalUsers} user${totalUsers !== 1 ? 's' : ''}`;
    }

    function renderPagination() {
        const totalPages = Math.ceil(totalUsers / pageSize);
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }

        paginationDiv.innerHTML = `
            <button class="page-nav-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="page-indicator">${currentPage} / ${totalPages}</span>
            <button class="page-nav-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;
    }

    function showLoading(show) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    // ==================== Search ====================

    let searchTimeout;
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchFilter = searchInput.value.trim();
            currentPage = 1;
            fetchUsers();
        }, 400);
    });

    // Page size change
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function () {
            pageSize = parseInt(this.value);
            currentPage = 1;
            fetchUsers();
        });
    }

    // ==================== Create User ====================

    document.getElementById('create-user-btn').addEventListener('click', () => openModal('create-modal'));

    document.getElementById('create-submit-btn').addEventListener('click', async function () {
        const username = document.getElementById('create-username').value.trim();
        const password = document.getElementById('create-password').value;

        let valid = true;
        if (!username) {
            showFormError('create-username-error', 'Username is required');
            valid = false;
        } else {
            hideFormError('create-username-error');
        }
        if (!password || password.length < 8) {
            showFormError('create-password-error', 'Password must be at least 8 characters');
            valid = false;
        } else {
            hideFormError('create-password-error');
        }
        if (!valid) return;

        setLoading(this, true);
        try {
            await apiRequest('/api/users', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            showToast('User created successfully', 'success');
            closeModal('create-modal');
            document.getElementById('create-user-form').reset();
            fetchUsers();
        } catch (error) {
            showToast(error.message || 'Could not create user', 'error');
        } finally {
            setLoading(this, false);
        }
    });

    // ==================== Edit User ====================

    window.openEditModal = function (id, username) {
        document.getElementById('edit-user-id').value = id;
        document.getElementById('edit-username').value = username;
        openModal('edit-modal');
    };

    document.getElementById('edit-submit-btn').addEventListener('click', async function () {
        const userId = document.getElementById('edit-user-id').value;
        const username = document.getElementById('edit-username').value.trim();

        if (!username) {
            showFormError('edit-username-error', 'Username is required');
            return;
        }
        hideFormError('edit-username-error');

        setLoading(this, true);
        try {
            await apiRequest(`/api/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ username })
            });
            showToast('User updated successfully', 'success');
            closeModal('edit-modal');
            fetchUsers();
        } catch (error) {
            showToast(error.message || 'Could not update user', 'error');
        } finally {
            setLoading(this, false);
        }
    });

    // ==================== Change Password ====================

    window.openPasswordModal = function (id) {
        document.getElementById('password-user-id').value = id;
        document.getElementById('password-form').reset();
        hideFormError('new-password-error');
        hideFormError('confirm-password-error');
        openModal('password-modal');
    };

    document.getElementById('password-submit-btn').addEventListener('click', async function () {
        const userId = document.getElementById('password-user-id').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        let valid = true;
        if (!newPassword || newPassword.length < 8) {
            showFormError('new-password-error', 'Password must be 8-128 characters');
            valid = false;
        } else {
            hideFormError('new-password-error');
        }
        if (newPassword !== confirmPassword) {
            showFormError('confirm-password-error', 'Passwords do not match');
            valid = false;
        } else {
            hideFormError('confirm-password-error');
        }
        if (!valid) return;

        setLoading(this, true);
        try {
            await apiRequest(`/api/users/${userId}/password`, {
                method: 'PUT',
                body: JSON.stringify({ new_password: newPassword, confirm_password: confirmPassword })
            });
            showToast('Password updated successfully', 'success');
            closeModal('password-modal');
        } catch (error) {
            showToast(error.message || 'Could not update password', 'error');
        } finally {
            setLoading(this, false);
        }
    });

    // ==================== Delete User ====================

    window.openDeleteModal = function (id, username) {
        deleteTargetId = id;
        document.getElementById('delete-username-display').textContent = `User "${username}" will be permanently deleted.`;
        openModal('delete-modal');
    };

    document.getElementById('delete-confirm-btn').addEventListener('click', async function () {
        if (!deleteTargetId) return;

        setLoading(this, true);
        try {
            await fetch(`${API_BASE_URL}/api/users/${deleteTargetId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAccessToken()}` }
            }).then(res => {
                if (res.status === 204) return null;
                if (!res.ok) return res.json().then(d => { throw new Error(d.detail || 'Delete failed'); });
                return null;
            });
            showToast('User deleted successfully', 'success');
            closeModal('delete-modal');
            deleteTargetId = null;
            fetchUsers();
        } catch (error) {
            showToast(error.message || 'Could not delete user', 'error');
        } finally {
            setLoading(this, false);
        }
    });

    // ==================== Pagination ====================

    window.goToPage = function (page) {
        const totalPages = Math.ceil(totalUsers / pageSize);
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        fetchUsers();
    };

    // ==================== Modal Helpers ====================

    function openModal(id) {
        document.getElementById(id).classList.add('active');
    }

    function closeModal(id) {
        document.getElementById(id).classList.remove('active');
    }

    // Close modal buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function () {
            closeModal(this.dataset.close);
        });
    });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });

    // ==================== Form Error Helpers ====================

    function showFormError(id, message) {
        const el = document.getElementById(id);
        el.textContent = message;
        el.classList.add('visible');
    }

    function hideFormError(id) {
        const el = document.getElementById(id);
        el.textContent = '';
        el.classList.remove('visible');
    }

    // ==================== Utility ====================

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ==================== Sorting ====================

    window.sortUsers = function (column) {
        if (sortBy === column) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            sortBy = column;
            sortDir = 'asc';
        }
        currentPage = 1;
        fetchUsers();
        updateSortIndicators();
    };

    function updateSortIndicators() {
        document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
            const col = th.dataset.sort;
            const icon = th.querySelector('.sort-icon');
            if (!icon) return;
            if (col === sortBy) {
                icon.className = sortDir === 'asc' ? 'fa-solid fa-sort-up sort-icon active' : 'fa-solid fa-sort-down sort-icon active';
            } else {
                icon.className = 'fa-solid fa-sort sort-icon';
            }
        });
    }

    // ==================== Init ====================

    fetchUsers();
})();
