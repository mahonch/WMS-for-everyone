console.log('[ISSUES] init...');

debugAuthContext('ISSUES_PAGE').then(() => startPage());

let token = null;
let currentIssue = null;

/* ------------ START PAGE ------------ */
function startPage() {
    token = localStorage.getItem('token');
    if (!token) return window.location.href = '/index.html';

    document.getElementById('usernameLabel').textContent =
        localStorage.getItem('username') || 'user';

    document.getElementById('logoutBtn').onclick = () => {
        localStorage.clear();
        window.location.href = '/index.html';
    };

    bindEvents();
    loadIssues();
}

/* ------------ ALERTS ------------ */
const alerts = document.getElementById('alerts');
function alertBox(type, text) {
    const el = document.createElement('div');
    el.className = `alert ${type}`;
    el.textContent = text;
    alerts.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

/* ------------ API WRAPPER ------------ */
async function api(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    let json = null;
    try { json = await res.json(); } catch {}

    if (!res.ok) {
        const msg = json?.message || json?.error || ('Ошибка ' + res.status);
        throw new Error(msg);
    }
    return json;
}

/* ------------ LOAD LIST ------------ */
async function loadIssues() {
    const page = await api('GET', '/api/issues?page=0&size=200');
    const tb = document.querySelector('#issuesTable tbody');
    tb.innerHTML = '';

    for (const d of page.content) {

        // отображаем USERNAME
        const createdByLabel =
            window.authUsersCache?.[d.createdBy] ??
            d.createdBy;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.id}</td>
            <td>${d.number}</td>
            <td>${d.status}</td>
            <td>${createdByLabel}</td>
            <td>${d.reason ?? ''}</td>
            <td>${d.createdAt ?? ''}</td>
            <td><button class="btn btn-secondary openBtn" data-id="${d.id}">Открыть</button></td>
        `;
        tb.appendChild(tr);
    }
}

/* ------------ EVENTS ------------ */
function bindEvents() {

    // открыть документ
    document.querySelector('#issuesTable').addEventListener('click', async e => {
        const btn = e.target.closest('.openBtn');
        if (!btn) return;
        const id = btn.dataset.id;
        const d = await api('GET', `/api/issues/${id}`);
        showDetail(d);
    });

    // создать документ
    document.getElementById('btnCreate').onclick = async () => {
        const createdById = Number(localStorage.getItem('userId') || 1);
        const reason = prompt('Причина списания?') || null;

        const dto = { createdById, reason, items: [] };
        const d = await api('POST', '/api/issues', dto);
        alertBox('success', 'Создан черновик ' + d.number);
        await loadIssues();
    };

    document.getElementById('btnCloseDetail').onclick =
        () => document.getElementById('detailPanel').style.display = 'none';

    document.getElementById('btnDeleteDraft').onclick = deleteDraft;
    document.getElementById('btnAddItem').onclick = addItem;
    document.getElementById('btnCommit').onclick = commitIssue;

    // удаление позиции
    document.querySelector('#itemsTable').addEventListener('click', async e => {
        const btn = e.target.closest('.delItemBtn');
        if (!btn) return;

        if (currentIssue.status !== 'DRAFT')
            return alertBox('error', 'Можно удалить только DRAFT');

        if (!confirm('Удалить позицию?')) return;

        await api('DELETE',
            `/api/issues/${currentIssue.id}/items/${btn.dataset.id}`);

        const d = await api('GET', `/api/issues/${currentIssue.id}`);
        showDetail(d);
    });
}

/* ------------ SHOW DETAIL ------------ */
function showDetail(d) {
    currentIssue = d;

    document.getElementById('detailPanel').style.display = 'block';
    document.getElementById('d_id').textContent = d.id;
    document.getElementById('d_number').textContent = d.number;
    document.getElementById('d_status').textContent = d.status;

    document.getElementById('d_reason').textContent = d.reason ?? '-';

    document.getElementById('d_createdBy').textContent =
        window.authUsersCache?.[d.createdBy] ?? d.createdBy;

    document.getElementById('d_date').textContent = d.createdAt ?? '-';

    const tb = document.querySelector('#itemsTable tbody');
    tb.innerHTML = '';

    for (const it of d.items) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${it.id}</td>
            <td>${it.productId}</td>
            <td>${it.batchId ?? ''}</td>
            <td>${it.qty}</td>
            <td>
                <button class="btn btn-danger delItemBtn" data-id="${it.id}">
                    Удалить
                </button>
            </td>
        `;
        tb.appendChild(tr);
    }
}

/* ------------ ACTIONS ------------ */

async function deleteDraft() {
    if (currentIssue.status !== 'DRAFT')
        return alertBox('error', 'Удалять можно только DRAFT');

    if (!confirm('Удалить документ?')) return;

    await api('DELETE', `/api/issues/${currentIssue.id}`);
    alertBox('success', 'Удалено');

    document.getElementById('detailPanel').style.display = 'none';
    await loadIssues();
}
async function loadBatchesForProduct(productId) {
    return await api('GET', `/api/batches/by-product/${productId}`);
}

async function addItem() {
    if (!currentIssue) return;

    const productId = prompt('ID товара?');
    if (!productId) return;

    const batches = await loadBatchesForProduct(productId);

    if (batches.length === 0) {
        alert('Нет доступных партий для товара');
        return;
    }

    // Формируем список партий
    let s = "Выберите ID партии:\n\n";
    for (const b of batches) {
        s += `ID ${b.id} — Доступно: ${b.availableQty}, Цена: ${b.buyPrice}, Локация: ${b.location?.name ?? ''}\n`;
    }

    const batchId = prompt(s);
    if (!batchId) return;

    const qty = prompt('Количество?');
    if (!qty) return;

    await api('POST', `/api/issues/${currentIssue.id}/items`, {
        productId: Number(productId),
        batchId: Number(batchId),
        qty: Number(qty)
    });

    const updated = await api('GET', `/api/issues/${currentIssue.id}`);
    showDetail(updated);
}


async function commitIssue() {
    if (currentIssue.status !== 'DRAFT')
        return alertBox('error', 'Уже проведён');

    const fromLocationId = prompt('ID локации списания?');
    if (!fromLocationId) return;

    await api(
        'POST',
        `/api/issues/${currentIssue.id}/commit`,
        { fromLocationId: Number(fromLocationId) }
    );

    alertBox('success', 'Проведено');
    document.getElementById('detailPanel').style.display = 'none';
    await loadIssues();
}
