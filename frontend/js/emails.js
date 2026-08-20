/**
 * Email Module Logic - Display emails received via webhook
 */

(function () {
    // Auth guard
    authGuard();

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
    let totalEmails = 0;

    // DOM Elements
    const tbody = document.getElementById('emails-tbody');
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    const paginationDiv = document.getElementById('pagination');
    const searchInput = document.getElementById('search-input');

    // ==================== Fetch & Render Emails ====================

    async function fetchEmails() {
        showLoading(true);
        emptyState.style.display = 'none';

        try {
            const params = new URLSearchParams({
                page: currentPage,
                size: pageSize,
            });
            if (searchFilter) {
                params.set('search', searchFilter);
            }

            const data = await apiRequest(`/api/emails?${params.toString()}`);
            totalEmails = data.total;
            renderTable(data.emails);
            renderPagination();

            const countEl = document.getElementById('email-count');
            if (countEl) countEl.textContent = `${totalEmails} email${totalEmails !== 1 ? 's' : ''}`;
        } catch (error) {
            showToast(error.message || 'Could not retrieve emails', 'error');
            tbody.innerHTML = '';
        } finally {
            showLoading(false);
        }
    }

    function renderTable(emails) {
        if (!emails || emails.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        const colors = ['#4a90d9', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50'];

        tbody.innerHTML = emails.map(email => {
            const fromDisplay = email.from_name || email.from_email;
            const initial = fromDisplay.charAt(0).toUpperCase();
            const color = colors[email.id % colors.length];
            const dateStr = email.email_date ? formatDate(email.email_date) : formatDate(email.created_at);

            return `
            <tr onclick="viewEmail(${email.id})" style="cursor: pointer;">
                <td>
                    <div class="user-cell">
                        <div class="user-cell-avatar" style="background: ${color}">${initial}</div>
                        <div class="user-cell-info">
                            <span class="user-cell-name">${escapeHtml(fromDisplay)}</span>
                            <span class="user-cell-sub">${escapeHtml(email.from_email)}</span>
                        </div>
                    </div>
                </td>
                <td class="email-subject-cell">${escapeHtml(email.subject || '(No Subject)')}</td>
                <td class="email-to-cell">${escapeHtml(email.to_email)}</td>
                <td>${dateStr}</td>
                <td class="actions-cell" style="justify-content: flex-end;">
                    <button class="action-icon" title="View" onclick="event.stopPropagation(); viewEmail(${email.id})">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                    <button class="action-icon action-danger" title="Delete" onclick="event.stopPropagation(); deleteEmail(${email.id})">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    function renderPagination() {
        const totalPages = Math.ceil(totalEmails / pageSize);
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }

        paginationDiv.innerHTML = `
            <button class="page-nav-btn" onclick="goToEmailPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="page-indicator">${currentPage} / ${totalPages}</span>
            <button class="page-nav-btn" onclick="goToEmailPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
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
            fetchEmails();
        }, 400);
    });

    // Page size change
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function () {
            pageSize = parseInt(this.value);
            currentPage = 1;
            fetchEmails();
        });
    }

    // ==================== View Email ====================

    window.viewEmail = async function (id) {
        try {
            const email = await apiRequest(`/api/emails/${id}`);
            document.getElementById('view-email-subject').textContent = email.subject || '(No Subject)';
            document.getElementById('view-email-from').textContent = `${email.from_name || ''} <${email.from_email}>`;
            document.getElementById('view-email-to').textContent = email.to_email;
            document.getElementById('view-email-date').textContent = email.email_date || email.created_at;
            document.getElementById('view-email-body').textContent = email.message || '';
            document.getElementById('view-email-modal').classList.add('active');
        } catch (error) {
            showToast(error.message || 'Could not load email', 'error');
        }
    };

    // ==================== Delete Email ====================

    window.deleteEmail = async function (id) {
        if (!confirm('Delete this email?')) return;

        try {
            await fetch(`${API_BASE_URL}/api/emails/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAccessToken()}` }
            }).then(res => {
                if (res.status === 204) return null;
                if (!res.ok) return res.json().then(d => { throw new Error(d.detail || 'Delete failed'); });
                return null;
            });
            showToast('Email deleted', 'success');
            fetchEmails();
        } catch (error) {
            showToast(error.message || 'Could not delete email', 'error');
        }
    };

    // ==================== Pagination ====================

    window.goToEmailPage = function (page) {
        const totalPages = Math.ceil(totalEmails / pageSize);
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        fetchEmails();
    };

    // ==================== Modal Close ====================

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.getElementById(this.dataset.close).classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) this.classList.remove('active');
        });
    });

    // ==================== Utility ====================

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== Init ====================

    fetchEmails();
})();
