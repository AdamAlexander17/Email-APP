/**
 * Logs Module Logic - Display activity logs
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
    let pageSize = 20;
    let searchFilter = '';
    let totalLogs = 0;

    // DOM Elements
    const tbody = document.getElementById('logs-tbody');
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    const paginationDiv = document.getElementById('pagination');
    const searchInput = document.getElementById('search-input');

    // ==================== Fetch & Render Logs ====================

    async function fetchLogs() {
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

            const data = await apiRequest(`/api/logs?${params.toString()}`);
            totalLogs = data.total;
            renderTable(data.logs);
            renderPagination();

            const countEl = document.getElementById('log-count');
            if (countEl) countEl.textContent = `${totalLogs} log${totalLogs !== 1 ? 's' : ''}`;
        } catch (error) {
            showToast(error.message || 'Could not retrieve logs', 'error');
            tbody.innerHTML = '';
        } finally {
            showLoading(false);
        }
    }

    function renderTable(logs) {
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        const colors = ['#4a90d9', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50'];

        tbody.innerHTML = logs.map(log => {
            const initial = log.user.charAt(0).toUpperCase();
            const color = colors[log.id % colors.length];
            const dateStr = formatDateTime(log.created_at);
            const actionClass = getActionClass(log.action);

            return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-cell-avatar" style="background: ${color}">${initial}</div>
                        <div class="user-cell-info">
                            <span class="user-cell-name">${escapeHtml(log.user)}</span>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge ${actionClass}">${escapeHtml(log.action)}</span></td>
                <td class="message-preview-cell">${escapeHtml(log.details || '—')}</td>
                <td>${escapeHtml(log.ip_address || '—')}</td>
                <td>${dateStr}</td>
            </tr>`;
        }).join('');
    }

    function getActionClass(action) {
        const lower = (action || '').toLowerCase();
        if (lower.includes('login')) return 'status-resolved';
        if (lower.includes('resolved') || lower.includes('comment')) return 'status-resolved';
        if (lower.includes('delete') || lower.includes('error')) return 'status-pending';
        return 'status-resolved';
    }

    // Format date with time - server stores Dubai time (UTC+4) as naive datetime
    // Parse the ISO string directly to avoid browser timezone conversion
    function formatDateTime(dateString) {
        if (!dateString) return '';
        const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
        if (!match) return dateString;
        const [, year, month, day, hours, mins] = match;
        return `${year}-${month}-${day} ${hours}:${mins}`;
    }

    function renderPagination() {
        const totalPages = Math.ceil(totalLogs / pageSize);
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }

        paginationDiv.innerHTML = `
            <button class="page-nav-btn" onclick="goToLogPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="page-indicator">${currentPage} / ${totalPages}</span>
            <button class="page-nav-btn" onclick="goToLogPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
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
            fetchLogs();
        }, 400);
    });

    // Page size change
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function () {
            pageSize = parseInt(this.value);
            currentPage = 1;
            fetchLogs();
        });
    }

    // ==================== Pagination ====================

    window.goToLogPage = function (page) {
        const totalPages = Math.ceil(totalLogs / pageSize);
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        fetchLogs();
    };

    // ==================== Utility ====================

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== Init ====================

    fetchLogs();
})();
