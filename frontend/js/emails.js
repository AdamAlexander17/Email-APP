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

    // ==================== State ====================

    let currentPage = 1;
    let pageSize = 10;
    let searchFilter = '';
    let totalEmails = 0;

    let sortBy = 'created_at';
    let sortDir = 'desc';

    // NEW: Status and Brand filters
    let statusFilter = 'Pending';
    let brandFilter = 'All';

    // ==================== DOM Elements ====================

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
        const allFetchedEmails = [];
        let page = 1;
        const fetchSize = 100;

        while (true) {

            const params = new URLSearchParams({
                page: page,
                size: fetchSize,
                sort_by: sortBy,
                sort_dir: sortDir
            });

            const data = await apiRequest(
                `/api/emails?${params.toString()}`
            );

            const emails = data.emails || [];

            allFetchedEmails.push(...emails);

            // If this page contains fewer than 100,
            // we have reached the last page.
            if (emails.length < fetchSize) {
                break;
            }

            page++;
        }

        allEmails = allFetchedEmails;

        applyFilters();

    } catch (error) {

        showToast(
            error.message || 'Could not retrieve emails',
            'error'
        );

        tbody.innerHTML = '';

    } finally {

        showLoading(false);
    }
}


// filter
function applyFilters() {
    filteredEmails = allEmails.filter(email => {

        // Status
        const statusMatch =
            statusFilter === 'All' ||
            (email.status || 'Pending') === statusFilter;

        // Brand from to_email
        const emailBrand = extractBrand(email.to_email);

        const brandMatch =
            brandFilter === 'All' ||
            emailBrand.toLowerCase() === brandFilter.toLowerCase();

        // Search
        const searchText = searchFilter.trim().toLowerCase();

        const searchMatch =
            !searchText ||
            (email.from_email || '').toLowerCase().includes(searchText) ||
            (email.from_name || '').toLowerCase().includes(searchText) ||
            (email.to_email || '').toLowerCase().includes(searchText) ||
            (email.subject || '').toLowerCase().includes(searchText) ||
            (email.message || '').toLowerCase().includes(searchText);

        return statusMatch && brandMatch && searchMatch;
    });

    totalEmails = filteredEmails.length;

    currentPage = 1;

    renderCurrentPage();
}


function renderCurrentPage() {

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const pageEmails = filteredEmails.slice(
        startIndex,
        endIndex
    );

    renderTable(pageEmails);

    renderPagination();

    const countEl = document.getElementById('email-count');

    if (countEl) {
        countEl.textContent =
            `${totalEmails} email${totalEmails !== 1 ? 's' : ''}`;
    }
}
    // ==================== Render Table ====================

    function renderTable(emails) {

        if (!emails || emails.length === 0) {

            tbody.innerHTML = '';
            emptyState.style.display = 'flex';

            return;
        }

        emptyState.style.display = 'none';

        const colors = [
            '#4a90d9',
            '#27ae60',
            '#e74c3c',
            '#f39c12',
            '#9b59b6',
            '#1abc9c',
            '#e67e22',
            '#2c3e50'
        ];

        tbody.innerHTML = emails.map(email => {

            const fromDisplay =
                email.from_name || email.from_email;

            const initial =
                fromDisplay.charAt(0).toUpperCase();

            const color =
                colors[email.id % colors.length];

            const dateStr =
                email.email_date
                    ? formatDateTime(email.email_date)
                    : formatDateTime(email.created_at);

            // Use backend brand field
            const brandName =
                email.brand || extractBrand(email.to_email);

            const messagePreview =
                email.message
                    ? email.message.substring(0, 50) +
                      (email.message.length > 50 ? '...' : '')
                    : '';

            const attachmentHtml = email.attachment
                ? `<a href="javascript:void(0)"
                    class="attachment-link"
                    onclick="event.stopPropagation(); viewAttachment(atob('${btoa(email.attachment)}'))">
                        <i class="fa-solid fa-paperclip"></i>
                        ${countAttachments(email.attachment)}
                        file${countAttachments(email.attachment) > 1 ? 's' : ''}
                   </a>`
                : '<span class="no-attachment">—</span>';

            const statusClass =
                (email.status || 'Pending') === 'Resolved'
                    ? 'status-resolved'
                    : 'status-pending';

            const statusText =
                email.status || 'Pending';

            const commentPreview =
                email.comment
                    ? email.comment.substring(0, 30) +
                      (email.comment.length > 30 ? '...' : '')
                    : '—';

            const resolutionTime =
                calcResolutionTime(email);

            return `
                <tr onclick="viewEmail(${email.id})" style="cursor: pointer;">

                    <td>
                        <div class="user-cell">

                            <div class="user-cell-avatar"
                                 style="background: ${color}">
                                ${initial}
                            </div>

                            <div class="user-cell-info">

                                <span class="user-cell-name">
                                    ${escapeHtml(fromDisplay)}
                                </span>

                                <span class="user-cell-sub">
                                    ${escapeHtml(email.from_email)}
                                </span>

                            </div>

                        </div>
                    </td>

                    <td class="email-subject-cell">
                        ${escapeHtml(email.subject || '(No Subject)')}
                    </td>

                    <td>
                        <span class="brand-badge">
                            ${escapeHtml(brandName)}
                        </span>
                    </td>

                    <td class="message-preview-cell">
                        ${escapeHtml(messagePreview)}
                    </td>

                    <td>
                        ${attachmentHtml}
                    </td>

                    <td class="comment-cell">
                        ${escapeHtml(commentPreview)}
                    </td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${statusText}
                        </span>
                    </td>

                    <td class="resolution-cell">
                        ${resolutionTime}
                    </td>

                    <td>
                        ${dateStr}
                    </td>

                    <td class="actions-cell">

                        <button
                            class="action-icon"
                            title="Comment"
                            onclick="event.stopPropagation(); openCommentModal(
                                ${email.id},
                                '${escapeAttr(email.comment || '')}',
                                '${escapeAttr(email.status || 'Pending')}'
                            )">

                            <i class="fa-regular fa-message"></i>

                        </button>

                        <button
                            class="action-icon"
                            title="View"
                            onclick="event.stopPropagation(); viewEmail(${email.id})">

                            <i class="fa-regular fa-eye"></i>

                        </button>

                        <button
                            class="action-icon action-danger"
                            title="Delete"
                            onclick="event.stopPropagation(); deleteEmail(${email.id})">

                            <i class="fa-regular fa-trash-can"></i>

                        </button>

                    </td>

                </tr>
            `;

        }).join('');
    }

    // ==================== Extract Brand ====================

    function extractBrand(email) {
        if (!email) return '';

        const match = email.match(/@([^.]+)/);

        if (!match) return '';

        const domain = match[1].toLowerCase();

        const brandMap = {
            tradekaro: 'TradeKaro',
            tradebazaar: 'TradeBazaar',
            bazaarfx: 'BazaarFX'
        };

        return brandMap[domain] || domain;
    }

    // ==================== Format Date ====================

    function formatDateTime(dateString) {

        if (!dateString) return '';

        // Example:
        // 2026-08-21T09:45:00

        const match = dateString.match(
            /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
        );

        if (!match) return dateString;

        const [, year, month, day, hours, mins] = match;

        return `${year}-${month}-${day} ${hours}:${mins}`;
    }

    // ==================== Pagination ====================

function renderPagination() {

    const totalPages = Math.ceil(
        filteredEmails.length / pageSize
    );

    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    paginationDiv.innerHTML = `
        <button
            class="page-nav-btn"
            onclick="goToEmailPage(${currentPage - 1})"
            ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i>
        </button>

        <span class="page-indicator">
            Page ${currentPage} of ${totalPages}
        </span>

        <button
            class="page-nav-btn"
            onclick="goToEmailPage(${currentPage + 1})"
            ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;
}

    function showLoading(show) {

        loadingOverlay.style.display =
            show ? 'flex' : 'none';
    }

    // ==================== Search ====================

    let searchTimeout;

    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            searchFilter =
                searchInput.value.trim();

            currentPage = 1;

            applyFilters();
        }, 300);
    });

    // ==================== Page Size ====================

    const pageSizeSelect =
        document.getElementById('page-size-select');

    if (pageSizeSelect) {

        pageSizeSelect.addEventListener('change', function () {
            pageSize = parseInt(this.value);

            currentPage = 1;

            renderCurrentPage();
        });
    }

// ==================== Status Filter ====================

const statusFilterSelect = document.getElementById('status-filter');

if (statusFilterSelect) {

    statusFilterSelect.addEventListener('change', function () {
        statusFilter = this.value;
        currentPage = 1;
        applyFilters();
    });

}
// ==================== Brand Filter ====================

const brandFilterSelect = document.getElementById('brand-filter');

if (brandFilterSelect) {

        brandFilterSelect.addEventListener('change', function () {
            brandFilter = this.value;
            currentPage = 1;
            applyFilters();
        });

}
    // ==================== View Email ====================

    window.viewEmail = async function (id) {

        try {

            const email =
                await apiRequest(`/api/emails/${id}`);

            document.getElementById('view-email-subject').textContent =
                email.subject || '(No Subject)';

            document.getElementById('view-email-from').textContent =
                `${email.from_name || ''} <${email.from_email}>`;

            document.getElementById('view-email-to').textContent =
                email.to_email;

            document.getElementById('view-email-date').textContent =
                email.email_date || email.created_at;

            document.getElementById('view-email-body').textContent =
                email.message || '';

            document.getElementById('view-email-modal')
                .classList.add('active');

        } catch (error) {

            showToast(
                error.message || 'Could not load email',
                'error'
            );
        }
    };

    // ==================== Delete Email ====================

    window.deleteEmail = async function (id) {

        if (!confirm('Delete this email?')) return;

        try {

            await fetch(
                `${API_BASE_URL}/api/emails/${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization':
                            `Bearer ${getAccessToken()}`
                    }
                }
            ).then(res => {

                if (res.status === 204) return null;

                if (!res.ok) {
                    return res.json().then(d => {
                        throw new Error(
                            d.detail || 'Delete failed'
                        );
                    });
                }

                return null;
            });

            showToast(
                'Email deleted',
                'success'
            );

            fetchEmails();

        } catch (error) {

            showToast(
                error.message || 'Could not delete email',
                'error'
            );
        }
    };

    // ==================== Pagination Navigation ====================

        window.goToEmailPage = function (page) {

            const totalPages = Math.ceil(
                filteredEmails.length / pageSize
            );

            if (page < 1 || page > totalPages) {
                return;
            }

            currentPage = page;

            renderCurrentPage();
        };

    // ==================== Modal Close ====================

    document.querySelectorAll('[data-close]')
        .forEach(btn => {

            btn.addEventListener('click', function () {

                document
                    .getElementById(this.dataset.close)
                    .classList.remove('active');

            });
        });

    document.querySelectorAll('.modal-overlay')
        .forEach(overlay => {

            overlay.addEventListener('click', function (e) {

                if (e.target === this) {
                    this.classList.remove('active');
                }

            });
        });

    // ==================== Comment ====================

    window.openCommentModal = function (
        id,
        existingComment,
        existingStatus
    ) {

        document.getElementById('comment-email-id').value =
            id;

        document.getElementById('comment-text').value =
            existingComment || '';

        document.getElementById('comment-status').value =
            existingStatus || 'Resolved';

        document.getElementById('comment-modal')
            .classList.add('active');
    };

    document
        .getElementById('comment-submit-btn')
        .addEventListener('click', async function () {

            const emailId =
                document.getElementById('comment-email-id').value;

            const comment =
                document.getElementById('comment-text').value.trim();

            const status =
                document.getElementById('comment-status').value;

            if (!comment) {

                document.getElementById('comment-error')
                    .textContent = 'Comment is required';

                document.getElementById('comment-error')
                    .classList.add('visible');

                return;
            }

            document.getElementById('comment-error')
                .textContent = '';

            document.getElementById('comment-error')
                .classList.remove('visible');

            setLoading(this, true);

            try {

                await apiRequest(
                    `/api/emails/${emailId}/comment`,
                    {
                        method: 'PUT',
                        body: JSON.stringify({
                            comment,
                            status
                        })
                    }
                );

                showToast(
                    'Comment saved',
                    'success'
                );

                document.getElementById('comment-modal')
                    .classList.remove('active');

                // Reload current filter.
                // If status was changed from Pending to Resolved,
                // the email will disappear from Pending view.
                fetchEmails();

            } catch (error) {

                showToast(
                    error.message || 'Could not save comment',
                    'error'
                );

            } finally {

                setLoading(this, false);

            }
        });

    // ==================== View Attachment ====================

    window.viewAttachment = function (attachmentData) {

        const modal =
            document.getElementById('attachment-modal');

        const content =
            document.getElementById('attachment-content');

        let urls = [];

        try {

            const parsed =
                JSON.parse(attachmentData);

            if (Array.isArray(parsed)) {

                urls = parsed.map(item =>
                    typeof item === 'string'
                        ? item
                        : item.url ||
                          item.file_url ||
                          item.File_Url ||
                          ''
                );

            } else if (typeof parsed === 'object') {

                urls = [
                    parsed.url ||
                    parsed.file_url ||
                    parsed.File_Url ||
                    attachmentData
                ];
            }

        } catch (e) {

            urls = attachmentData
                .split(/[,\n]+/)
                .map(u => u.trim())
                .filter(u => u.length > 0);
        }

        if (urls.length === 0) {

            content.innerHTML =
                '<p style="text-align:center; padding:2rem; color:var(--color-text-secondary);">No attachments found</p>';

            modal.classList.add('active');

            return;
        }

        let html =
            '<div class="attachment-grid">';

        urls.forEach((url, index) => {

            const lower =
                url.toLowerCase();

            if (
                /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/.test(lower)
            ) {

                html += `
                    <div class="attachment-item">

                        <img
                            src="${url}"
                            alt="Attachment ${index + 1}"
                            class="attachment-image">

                        <div class="attachment-item-footer">

                            <span class="attachment-label">
                                <i class="fa-regular fa-image"></i>
                                Image ${index + 1}
                            </span>

                            <a
                                href="${url}"
                                download
                                class="attachment-download">

                                <i class="fa-solid fa-download"></i>

                            </a>

                        </div>

                    </div>
                `;

            } else if (
                /\.(pdf)(\?|$)/.test(lower)
            ) {

                html += `
                    <div class="attachment-item attachment-item-full">

                        <iframe
                            src="${url}"
                            class="attachment-pdf">
                        </iframe>

                        <div class="attachment-item-footer">

                            <span class="attachment-label">
                                <i class="fa-regular fa-file-pdf"></i>
                                PDF ${index + 1}
                            </span>

                            <a
                                href="${url}"
                                download
                                class="attachment-download">

                                <i class="fa-solid fa-download"></i>

                            </a>

                        </div>

                    </div>
                `;

            } else {

                const filename =
                    url.split('/').pop().split('?')[0] ||
                    `File ${index + 1}`;

                html += `
                    <div class="attachment-item attachment-item-file">

                        <div class="attachment-file-icon">
                            <i class="fa-solid fa-file"></i>
                        </div>

                        <span class="attachment-filename">
                            ${filename}
                        </span>

                        <a
                            href="${url}"
                            download
                            class="btn btn-sm btn-primary">

                            <i class="fa-solid fa-download"></i>
                            Download

                        </a>

                    </div>
                `;
            }

        });

        html += '</div>';

        content.innerHTML = html;

        modal.classList.add('active');
    };

    // ==================== Utility ====================

    function escapeHtml(str) {

        const div =
            document.createElement('div');

        div.textContent = str;

        return div.innerHTML;
    }

    // ==================== Resolution Time ====================

    function calcResolutionTime(email) {

        if (!email.resolved_at || !email.created_at) {
            return '—';
        }

        const receivedStr =
            email.email_date || email.created_at;

        const resolvedStr =
            email.resolved_at;

        const received =
            new Date(receivedStr + 'Z');

        const resolved =
            new Date(resolvedStr + 'Z');

        if (
            isNaN(received.getTime()) ||
            isNaN(resolved.getTime())
        ) {
            return '—';
        }

        const diffMs =
            resolved.getTime() -
            received.getTime();

        if (diffMs < 0) return '—';

        const diffMins =
            Math.floor(diffMs / 60000);

        const diffHours =
            Math.floor(diffMins / 60);

        const diffDays =
            Math.floor(diffHours / 24);

        if (diffDays > 0) {

            const remainHours =
                diffHours % 24;

            return `${diffDays}d ${remainHours}h`;

        } else if (diffHours > 0) {

            const remainMins =
                diffMins % 60;

            return `${diffHours}h ${remainMins}m`;

        } else {

            return `${diffMins}m`;
        }
    }

    // ==================== Count Attachments ====================

    function countAttachments(attachmentData) {

        if (!attachmentData) return 0;

        try {

            const parsed =
                JSON.parse(attachmentData);

            if (Array.isArray(parsed)) {
                return parsed.length;
            }

        } catch (e) {}

        const urls =
            attachmentData
                .split(/[,\n]+/)
                .filter(u => u.trim().length > 0);

        return urls.length || 1;
    }

    // ==================== Escape Attribute ====================

    function escapeAttr(str) {

        return str
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/\n/g, ' ');
    }

    // ==================== Sorting ====================

    window.sortEmails = function (column) {

        if (sortBy === column) {

            sortDir =
                sortDir === 'asc'
                    ? 'desc'
                    : 'asc';

        } else {

            sortBy = column;
            sortDir = 'asc';
        }

        currentPage = 1;

        fetchEmails();

        updateSortIndicators();
    };

    function updateSortIndicators() {

        document
            .querySelectorAll('.data-table th[data-sort]')
            .forEach(th => {

                const col =
                    th.dataset.sort;

                const icon =
                    th.querySelector('.sort-icon');

                if (!icon) return;

                if (col === sortBy) {

                    icon.className =
                        sortDir === 'asc'
                            ? 'fa-solid fa-sort-up sort-icon active'
                            : 'fa-solid fa-sort-down sort-icon active';

                } else {

                    icon.className =
                        'fa-solid fa-sort sort-icon';
                }

            });
    }

    // ==================== Init ====================

    fetchEmails();

})();