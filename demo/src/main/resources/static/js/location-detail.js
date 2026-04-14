const fmtMoney = (n) => {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' ₽';
};

const activeTabLoc = { current: 'receipts' };

async function loadLocationPage() {
    const params = new URLSearchParams(window.location.search);
    const locId = params.get('id');
    if (!locId) return;
    const token = localStorage.getItem('token') || '';
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    try {
        // location
        const res = await fetch(`/api/locations/${locId}`, { headers });
        if (!res.ok) throw new Error('Не удалось загрузить ячейку');
        const loc = await res.json();

        setText('crumbTitle', loc.code || 'Ячейка');
        setText('headerTitle', loc.code || 'Ячейка');
        setText('locationCode', loc.code || '—');
        setText('locationName', loc.name || '—');
        setText('warehouseName', loc.warehouseName || '—');
        const badge = document.getElementById('typeBadge');
        if (badge) badge.textContent = loc.type || 'BIN';
        const locNamePrint = document.getElementById('locNamePrint');
        if (locNamePrint) locNamePrint.textContent = (loc.code || '') + (loc.name ? ' — ' + loc.name : '');
        const parentLink = document.getElementById('parentLink');
        if (parentLink) {
            if (loc.parentId) {
                parentLink.innerHTML = `<a class="clickable-link" href="/pages/location-detail.html?id=${loc.parentId}">${loc.parentName || ('#' + loc.parentId)}</a>`;
            } else {
                parentLink.textContent = '—';
            }
        }
        const qr = document.getElementById('qrImage');
        if (qr) qr.src = `/api/qr/loc/${locId}.png?size=240`;

        // stats
        const statsBox = document.getElementById('statsBox');
        if (statsBox) {
            statsBox.innerHTML = `
                <div class="info-label">Всего товаров</div><div class="info-value text-h6">${loc.totalProducts || 0}</div>
                <div class="info-label">Кол-во</div><div class="info-value text-h6">${loc.totalQty || 0}</div>
                <div class="info-label">Стоимость</div><div class="info-value text-h6 text-primary">${fmtMoney(loc.totalValue || 0)}</div>
            `;
        }

        // products in location (через stocks по locationId)
        const prodRes = await fetch(`/api/stocks?locationId=${locId}`, { headers });
        let products = [];
        if (prodRes.ok) {
            const stocks = await prodRes.json();
            products = stocks.map(s => ({
                id: s.productId,
                sku: s.productSku || s.productName,
                name: s.productName,
                quantity: s.qty || 0
            }));
        }
        const tbody = document.querySelector('#productsTable tbody');
        if (tbody) {
            if (!products.length) {
                tbody.innerHTML = `<tr><td colspan="4" class="muted" style="padding:12px;">Нет товаров</td></tr>`;
            } else {
                tbody.innerHTML = products.map(p => `
                    <tr>
                        <td>${p.sku || '—'}</td>
                        <td><a class="clickable-link" href="/pages/product-detail.html?id=${p.id}">${p.name}</a></td>
                        <td>${p.quantity || 0}</td>
                        <td></td>
                    </tr>
                `).join('');
            }
        }

        // related docs
        const loadDoc = async (url) => {
            const r = await fetch(url, { headers });
            if (!r.ok) return [];
            const data = await r.json();
            return data.content || [];
        };

        const receipts = await loadDoc('/api/receipts?page=0&size=100');
        const issues = await loadDoc('/api/issues?page=0&size=100');
        const transfers = await loadDoc('/api/transfers?page=0&size=100');

        const relatedReceipts = receipts.filter(r => r.items?.some(it => it.locationId == locId));
        const relatedIssues = issues.filter(i => i.items?.some(it => it.locationId == locId));
        const relatedTransfers = transfers.filter(t => t.items?.some(it => it.fromLocationId == locId || it.toLocationId == locId));

        const tabContent = document.getElementById('tabContent');
        const renderTable = (rows, columns, type) => {
            if (!rows.length) return '<div class="muted" style="padding:12px;">Нет данных</div>';
            const head = '<tr>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
            const body = rows.map((r, idx) => `
                <tr>
                    <td>${linkDoc(r, type, idx)}</td>
                    <td>${r.status || '—'}</td>
                    <td>${r.createdAt ? new Date(r.createdAt).toLocaleString('ru-RU') : '—'}</td>
                </tr>
            `).join('');
            return `<table>${head}${body}</table>`;
        };
        const linkDoc = (row, type, idx) => {
            const num = row.number || row.id || (idx + 1);
            let href = '#';
            if (type === 'receipts' && row.id) {
                href = `/pages/receipt-detail.html?id=${row.id}`;
            } else if (type === 'issues' && row.id) {
                href = `/pages/issues.html#${row.id}`;
            } else if (type === 'transfers' && row.id) {
                href = `/pages/transfers.html#${row.id}`;
            }
            return `<a class="clickable-link" href="${href}">${num}</a>`;
        };

        const updateTab = () => {
            if (!tabContent) return;
            if (activeTabLoc.current === 'receipts') {
                tabContent.innerHTML = renderTable(relatedReceipts, ['№', 'Статус', 'Дата'], 'receipts');
            } else if (activeTabLoc.current === 'issues') {
                tabContent.innerHTML = renderTable(relatedIssues, ['№', 'Статус', 'Дата'], 'issues');
            } else {
                tabContent.innerHTML = renderTable(relatedTransfers, ['№', 'Статус', 'Дата'], 'transfers');
            }
        };
        updateTab();

        document.querySelectorAll('.doc-tab').forEach(el => {
            el.onclick = () => {
                document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
                el.classList.add('active');
                activeTabLoc.current = el.dataset.tab;
                updateTab();
            };
        });

        document.getElementById('btnBack').onclick = () => history.back();
        document.getElementById('btnPrint').onclick = () => window.print();
    } catch (e) {
        console.error(e);
    }
}

document.addEventListener('DOMContentLoaded', loadLocationPage);
