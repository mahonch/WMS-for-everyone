const fmtMoney = (n) => {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' ₽';
};

const activeTab = { current: 'receipts' };

async function loadProductPage() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    if (!productId) return;

    const token = localStorage.getItem('token') || '';
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

    // helpers
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    try {
        // product
        const pRes = await fetch(`/api/products/${productId}`, { headers });
        if (!pRes.ok) throw new Error('Не удалось загрузить товар');
        const p = await pRes.json();
        setText('crumbTitle', p.name);
        setText('headerTitle', p.name);
        setText('productName', p.name);
        setText('productSku', 'SKU ' + (p.sku || '—'));
        setText('productBarcode', p.barcode || '—');
        setText('productUnit', p.unit || '—');
        setText('productMin', (p.minStock ?? '—') + ' pcs');
        setText('productPrice', fmtMoney(p.costPrice));
        const catChip = document.getElementById('categoryChip');
        if (catChip) catChip.textContent = 'Категория: ' + (p.categoryName || '—');
        const status = document.getElementById('statusBadge');
        if (status) {
            status.className = 'badge ' + (p.isActive ? 'green' : 'gray');
            status.textContent = p.isActive ? 'Активен' : 'Неактивен';
        }

        // stocks
        const sRes = await fetch(`/api/stocks?productId=${productId}`, { headers });
        let stocks = [];
        if (sRes.ok) stocks = await sRes.json();
        const sList = document.getElementById('stocksList');
        if (sList) {
            if (!stocks.length) {
                sList.innerHTML = '<div class="muted">Остатков нет</div>';
            } else {
                sList.innerHTML = stocks.map(s => `
                    <div class="stock-item">
                        <div><strong>Склад:</strong> ${s.warehouseName || s.warehouseId || '—'}</div>
                        <div><strong>Локация:</strong> ${s.locationName
                            ? `<a class="clickable-link" href="/pages/location-detail.html?id=${s.locationId}">${s.locationName}</a>`
                            : (s.locationCode
                                ? `<a class="clickable-link" href="/pages/location-detail.html?id=${s.locationId}">${s.locationCode}</a>`
                                : (s.locationId || '—'))}</div>
                        <div><strong>Количество:</strong> ${s.qty || 0} ${p.unit || 'pcs'}</div>
                    </div>
                `).join('');
            }
        }

        // QR
        const qr = document.getElementById('qrImageProduct');
        if (qr) qr.src = `/api/qr/product/${productId}.png?size=240`;
        const namePrint = document.getElementById('productNamePrint');
        if (namePrint) namePrint.textContent = p.name || '';

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

        const relatedReceipts = receipts.filter(r => r.items?.some(it => it.productId == productId));
        const relatedIssues = issues.filter(i => i.items?.some(it => it.productId == productId));
        const relatedTransfers = transfers.filter(t => t.items?.some(it => it.productId == productId));

        const tabContent = document.getElementById('tabContent');
        const renderTable = (rows, columns, type) => {
            if (!rows.length) return '<div class="muted" style="padding:12px;">Нет данных</div>';
            const head = '<tr>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
            const body = rows.map((r, idx) => `
                <tr>
                    <td>${linkDoc(r, type, idx)}</td>
                    <td>${r.status || '—'}</td>
                    <td>${r.supplierName || r.reason || r.fromWarehouseName || '—'}</td>
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
                href = `/pages/issues.html#${row.id}`; // fallback, нет детальной
            } else if (type === 'transfers' && row.id) {
                href = `/pages/transfers.html#${row.id}`; // fallback
            }
            return `<a class="clickable-link" href="${href}">${num}</a>`;
        };

        const updateTab = () => {
            if (!tabContent) return;
            if (activeTab.current === 'receipts') {
                tabContent.innerHTML = renderTable(relatedReceipts, ['№', 'Статус', 'Поставщик', 'Дата'], 'receipts');
            } else if (activeTab.current === 'issues') {
                tabContent.innerHTML = renderTable(relatedIssues, ['№', 'Статус', 'Причина', 'Дата'], 'issues');
            } else {
                tabContent.innerHTML = renderTable(relatedTransfers, ['№', 'Статус', 'Откуда', 'Дата'], 'transfers');
            }
        };
        updateTab();

        document.querySelectorAll('.doc-tab').forEach(el => {
            el.onclick = () => {
                document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
                el.classList.add('active');
                activeTab.current = el.dataset.tab;
                updateTab();
            };
        });

        document.getElementById('btnBack').onclick = () => history.back();
        document.getElementById('btnPrint').onclick = () => window.print();

    } catch (e) {
        console.error(e);
    }
}

document.addEventListener('DOMContentLoaded', loadProductPage);
