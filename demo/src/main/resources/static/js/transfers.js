// --------------------------------------
// AUTH
// --------------------------------------
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/index.html';
}

debugAuthContext('TRANSFERS');

document.getElementById('usernameLabel').textContent =
    localStorage.getItem('username') || 'пользователь';

document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    window.location.href = '/index.html';
};

// --------------------------------------
// ALERTS
// --------------------------------------
const alerts = document.getElementById('alerts');
function pushAlert(type, text) {
    const el = document.createElement('div');
    el.className = 'alert ' + type;
    el.textContent = text;
    alerts.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// --------------------------------------
// FETCH WRAPPER
// --------------------------------------
async function api(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    try { data = await res.json(); } catch {}

    if (!res.ok) {
        throw new Error(data?.message || data?.error || ('Ошибка ' + res.status));
    }
    return data;
}

// GET without body
async function apiGet(url) {
    return api("GET", url);
}

// --------------------------------------
// GLOBAL STATE
// --------------------------------------
let transferId = null;

// --------------------------------------
// LOAD LOCATIONS
// --------------------------------------
async function loadLocations() {
    const locs = await apiGet('/api/locations?size=999');

    const fromSel = document.getElementById('fromLocation');
    const toSel = document.getElementById('toLocation');

    fromSel.innerHTML = '';
    toSel.innerHTML = '';

    locs.content.forEach(l => {
        fromSel.innerHTML += `<option value="${l.id}">${l.code}</option>`;
        toSel.innerHTML += `<option value="${l.id}">${l.code}</option>`;
    });
}

// --------------------------------------
// LOAD PRODUCTS AND BATCHES
// --------------------------------------
async function loadProducts() {
    const list = await apiGet('/api/products?size=9999');

    const sel = document.getElementById('prodSelect');
    sel.innerHTML = '';
    list.content.forEach(p => {
        sel.innerHTML += `<option value="${p.id}">${p.name} (${p.sku})</option>`;
    });

    sel.onchange = loadBatches;
    await loadBatches();
}

async function loadBatches() {
    const prodId = document.getElementById('prodSelect').value;
    const fromLoc = document.getElementById('fromLocation').value;

    // API поиска партий по товару + локации
    const batches = await apiGet(`/api/stock/batches/${prodId}/${fromLoc}`);

    const sel = document.getElementById('batchSelect');
    sel.innerHTML = '';

    batches.forEach(b => {
        sel.innerHTML += `<option value="${b.id}">Партия #${b.id}, остаток: ${b.qty}</option>`;
    });
}

// --------------------------------------
// CREATE TRANSFER
// --------------------------------------
document.getElementById('btnCreate').onclick = async () => {
    try {
        const res = await api("POST", "/api/transfers", {
            fromLocationId: Number(document.getElementById('fromLocation').value),
            toLocationId: Number(document.getElementById('toLocation').value),
            createdById: Number(localStorage.getItem('userid'))
        });

        transferId = res.id;

        document.getElementById('docNumber').textContent = res.number;
        document.getElementById('docStatus').textContent = res.status;

        document.getElementById('btnCommit').classList.remove('hidden');
        pushAlert('success', 'Черновик создан!');
    } catch (e) {
        pushAlert('error', e.message);
    }
};

// --------------------------------------
// ADD ITEM
// --------------------------------------
document.getElementById('btnAddItem').onclick = async () => {

    if (!transferId) {
        pushAlert('error', 'Сначала создайте документ!');
        return;
    }

    const prodId = Number(document.getElementById('prodSelect').value);
    const batchId = Number(document.getElementById('batchSelect').value);
    const qty = Number(document.getElementById('qtyInput').value);

    try {
        await api("POST", `/api/transfers/${transferId}/items`, {
            productId: prodId,
            batchId: batchId,
            qty: qty
        });

        pushAlert('success', 'Строка добавлена');
        await loadItems();
    } catch (e) {
        pushAlert('error', e.message);
    }
};

// --------------------------------------
// LOAD ITEMS
// --------------------------------------
async function loadItems() {
    if (!transferId) return;

    const doc = await apiGet(`/api/transfers/${transferId}`);

    const tbody = document.getElementById('itemsBody');
    tbody.innerHTML = '';

    doc.items.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td>${i.productId}</td>
                <td>${i.batchId ?? '—'}</td>
                <td>${i.available ?? '—'}</td>
                <td>${i.qty}</td>
                <td></td>
            </tr>
        `;
    });
}

// --------------------------------------
// COMMIT
// --------------------------------------
document.getElementById('btnCommit').onclick = async () => {
    if (!transferId) return;

    try {
        await api("POST", `/api/transfers/${transferId}/commit`);
        pushAlert('success', 'Документ проведён');
        document.getElementById('docStatus').textContent = 'COMMITTED';
    } catch (e) {
        pushAlert('error', e.message);
    }
};

// --------------------------------------
// INIT PAGE
// --------------------------------------
(async function start() {
    await loadLocations();
    await loadProducts();
})();
