/* ----------------- AUTH BOOTSTRAP ----------------- */

console.log('[RECEIPTS] init...');

debugAuthContext('RECEIPTS_PAGE').then(() => {
    console.log('[RECEIPTS] Auth OK, starting page…');
    startPage();
});

let token = null;
let currentReceipt = null;


/* ----------------- START PAGE ----------------- */

function startPage() {
    token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('usernameLabel').textContent =
        localStorage.getItem('username') || 'user';

    document.getElementById('logoutBtn').onclick = () => {
        localStorage.clear();
        window.location.href = '/index.html';
    };

    bindEvents();
    loadReceipts();
}


/* ---------------- ALERTS ---------------- */

const alerts = document.getElementById('alerts');

function alertBox(type, text) {
    const div = document.createElement('div');
    div.className = `alert ${type}`;
    div.textContent = text;
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}


/* ---------------- API WRAPPER ---------------- */

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


/* ---------------- LOAD LIST ---------------- */

async function loadReceipts() {
    const page = await api('GET', '/api/receipts?page=0&size=200');

    const tb = document.querySelector('#receiptsTable tbody');
    tb.innerHTML = '';

    for (const r of page.content) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.id}</td>
            <td>${r.number}</td>
            <td>${r.status}</td>
            <td>${r.supplierId ?? ''}</td>
            <td>${r.createdBy ?? ''}</td>
            <td>${r.createdAt ?? ''}</td>
            <td>${r.totalSum}</td>
            <td><button class="btn btn-secondary openBtn" data-id="${r.id}">Открыть</button></td>
        `;
        tb.appendChild(tr);
    }
}


/* ---------------- BIND EVENTS ---------------- */

function bindEvents() {

    // OPEN receipt
    document.querySelector('#receiptsTable').addEventListener('click', async e => {
        const btn = e.target.closest('.openBtn');
        if (!btn) return;

        const id = btn.dataset.id;
        const r = await api('GET', `/api/receipts/${id}`);
        showDetail(r);
    });

    // CREATE draft
    document.getElementById('btnCreate').onclick = async () => {
        const createdById = Number(localStorage.getItem('userId') || 1);

        const dto = {
            createdById,
            supplierId: null,
            items: []
        };

        const r = await api('POST', '/api/receipts', dto);
        alertBox('success', 'Создан черновик № ' + r.number);
        await loadReceipts();
    };

    // CLOSE detail
    document.getElementById('btnCloseDetail').onclick = () => {
        document.getElementById('detailPanel').style.display = 'none';
    };

    // DELETE draft
    document.getElementById('btnDeleteDraft').onclick = deleteDraft;
    document.getElementById('btnAddItem').onclick = addItem;
    document.getElementById('btnCommit').onclick = commitReceipt;

    // DELETE item
    document.querySelector('#itemsTable').addEventListener('click', async e => {
        const btn = e.target.closest('.delItemBtn');
        if (!btn) return;

        if (currentReceipt.status !== 'DRAFT')
            return alertBox('error', 'Удалять можно только DRAFT');

        if (!confirm('Удалить позицию?')) return;

        await api(
            'DELETE',
            `/api/receipts/${currentReceipt.id}/items/${btn.dataset.id}`
        );

        const r = await api('GET', `/api/receipts/${currentReceipt.id}`);
        showDetail(r);
    });
}


/* ---------------- SHOW DETAIL ---------------- */

function showDetail(r) {
    currentReceipt = r;

    document.getElementById('detailPanel').style.display = 'block';

    document.getElementById('d_id').textContent = r.id;
    document.getElementById('d_number').textContent = r.number;
    document.getElementById('d_status').textContent = r.status;
    document.getElementById('d_supplier').textContent = r.supplierId ?? '-';
    document.getElementById('d_createdBy').textContent =
        r.createdByName ?? ('ID ' + r.createdBy);
    document.getElementById('d_date').textContent = r.createdAt ?? '-';
    document.getElementById('d_total').textContent = r.totalSum;

    const tb = document.querySelector('#itemsTable tbody');
    tb.innerHTML = '';

    for (const it of r.items) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${it.id}</td>
            <td>${it.productId}</td>
            <td>${it.qty}</td>
            <td>${it.price}</td>
            <td>${it.batchId ?? ''}</td>
            <td>
                <button class="btn btn-danger delItemBtn" data-id="${it.id}">Удалить</button>
            </td>
        `;
        tb.appendChild(tr);
    }
}


/* ---------------- ACTIONS ---------------- */

async function deleteDraft() {
    if (!currentReceipt) return;
    if (currentReceipt.status !== 'DRAFT')
        return alertBox('error', 'Удалять можно только DRAFT');

    if (!confirm('Удалить документ?')) return;

    await api('DELETE', `/api/receipts/${currentReceipt.id}`);
    alertBox('success', 'Удалено');

    document.getElementById('detailPanel').style.display = 'none';
    await loadReceipts();
}

async function addItem() {
    if (!currentReceipt) return;
    if (currentReceipt.status !== 'DRAFT')
        return alertBox('error', 'Редактировать можно только DRAFT');

    const productId = prompt('ID товара?');
    const qty = prompt('Кол-во?');
    const price = prompt('Цена?');

    if (!productId || !qty || !price) return;

    await api(
        'POST',
        `/api/receipts/${currentReceipt.id}/items`,
        { productId: Number(productId), qty: Number(qty), price: Number(price) }
    );

    const r = await api('GET', `/api/receipts/${currentReceipt.id}`);
    showDetail(r);
}

async function commitReceipt() {
    if (!currentReceipt) return;
    if (currentReceipt.status !== 'DRAFT')
        return alertBox('error', 'Уже проведён');

    const locId = prompt('ID локации?');
    if (!locId) return;

    await api(
        'POST',
        `/api/receipts/${currentReceipt.id}/commit`,
        { toLocationId: Number(locId) }
    );

    alertBox('success', 'Проведено');
    document.getElementById('detailPanel').style.display = 'none';
    await loadReceipts();
}
