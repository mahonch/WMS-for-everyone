console.log('[RECEIPT-DETAIL] script loaded v3');

var receipt = null;
var suppliersCache = [];
var categoriesCache = [];
var productsCache = [];

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[RECEIPT-DETAIL] DOMContentLoaded');
    try {
        startPage();
    } catch(e) {
        console.error('[RECEIPT-DETAIL] TOP ERROR:', e);
        showError('Ошибка: ' + e.message);
    }
});

async function startPage() {
    console.log('[RECEIPT-DETAIL] startPage()');
    var token = localStorage.getItem('token');
    if (!token) { window.location.href = '/index.html'; return; }

    var ul = document.getElementById('usernameLabel');
    if (ul) ul.textContent = localStorage.getItem('username') || 'user';
    var lb = document.getElementById('logoutBtn');
    if (lb) lb.onclick = function() { localStorage.clear(); window.location.href = '/index.html'; };

    var id = new URLSearchParams(window.location.search).get('id');
    console.log('[RECEIPT-DETAIL] id =', id);
    if (!id || id === 'undefined' || id === 'null') { showError('ID не указан'); return; }

    // API call
    try {
        console.log('[RECEIPT-DETAIL] fetching /api/receipts/' + id);
        receipt = await api('GET', '/api/receipts/' + id);
        console.log('[RECEIPT-DETAIL] receipt loaded, id=', receipt ? receipt.id : 'null');
    } catch(e) {
        console.error('[RECEIPT-DETAIL] fetch error:', e);
        showError('Ошибка загрузки: ' + e.message);
        return;
    }

    if (!receipt || !receipt.id) { showError('Документ не найден'); return; }

    // Render
    console.log('[RECEIPT-DETAIL] calling renderAll()');
    try {
        renderAll();
        console.log('[RECEIPT-DETAIL] renderAll() completed');
    } catch(e) {
        console.error('[RECEIPT-DETAIL] renderAll() threw:', e, e.stack);
        showError('Ошибка отображения: ' + e.message);
    }

    // Load ref data in background
    loadSuppliers();
    loadCategories();
}

/* ==================== API ==================== */
async function api(method, url, body) {
    var token = await AuthService.getToken();
    if (!token) { window.location.href = '/index.html'; throw new Error('No token'); }
    var opts = { method: method, headers: { 'Authorization': 'Bearer ' + token } };
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    var res = await fetch(url, opts);
    if (!res.ok) {
        var j = null; try { j = await res.json(); } catch(ex) {}
        throw new Error((j && j.message) || 'Ошибка ' + res.status);
    }
    if (res.status === 204) return null;
    var text = await res.text();
    return text ? JSON.parse(text) : null;
}

function showNotification(type, msg) {
    var tc = document.getElementById('toastContainer');
    if (!tc) { tc = document.createElement('div'); tc.id = 'toastContainer'; tc.className = 'toast-container'; document.body.appendChild(tc); }
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<span class="toast-icon"></span><div class="toast-content"><div class="toast-title">' + (type === 'success' ? 'Успех' : 'Ошибка') + '</div><div class="toast-message">' + msg + '</div></div><button class="toast-close" onclick="this.parentElement.remove()">×</button>';
    tc.appendChild(t);
    setTimeout(function() { t.classList.add('hiding'); setTimeout(function() { t.remove(); }, 3000); }, 4000);
}

function showError(msg) {
    console.error('[RECEIPT-DETAIL] showError:', msg);
    var el = document.getElementById('errorBlock');
    if (el) { el.style.display = 'block'; var t = document.getElementById('errorText'); if (t) t.textContent = msg; }
    // Also make content visible so error shows
    var rc = document.getElementById('receiptContent');
    if (rc) rc.style.display = 'block';
}

/* ==================== HELPERS ==================== */
function fmtDate(d) {
    if (!d) return '—';
    var dt = new Date(d);
    return ('0'+dt.getDate()).slice(-2)+'.'+('0'+(dt.getMonth()+1)).slice(-2)+'.'+dt.getFullYear()+' '+('0'+dt.getHours()).slice(-2)+':'+('0'+dt.getMinutes()).slice(-2);
}

function fmtMoney(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('ru-RU', { style:'currency', currency:'BYN', minimumFractionDigits:0 }).format(n);
}

function calcTotal() {
    if (!receipt || !receipt.items) return 0;
    var s = 0;
    for (var i = 0; i < receipt.items.length; i++) s += receipt.items[i].qty * receipt.items[i].price;
    return s;
}

function esc(s) {
    if (!s) return '';
    var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}

function renderAll() {
    console.log('[RECEIPT-DETAIL] renderAll START, status=' + receipt.status);
    var isDraft = receipt.status === 'DRAFT';

    var bc = document.getElementById('breadcrumbCurrent');
    console.log('1 bc=' + (bc ? 'found' : 'MISSING'));
    if (bc) bc.textContent = receipt.number || '';

    var ht = document.getElementById('headerTitle');
    console.log('2 ht=' + (ht ? 'found' : 'MISSING'));
    if (ht) ht.textContent = 'Приёмка ' + (receipt.number || '');

    var ab = document.getElementById('actionButtons');
    console.log('3 ab=' + (ab ? 'found' : 'MISSING'));
    if (ab) {
        if (isDraft) {
            ab.innerHTML = '<button class="btn btn-success" onclick="doCommit()"> Подписать</button> <button class="btn btn-danger" onclick="doDelete()"> Удалить</button> <button class="btn btn-secondary" onclick="window.print()"> Распечатать</button> <a href="/pages/receipts.html" class="btn btn-secondary">← Назад</a>';
        } else {
            ab.innerHTML = '<button class="btn btn-secondary" onclick="window.print()"> Распечатать</button> <a href="/pages/receipts.html" class="btn btn-secondary">← Назад</a>';
        }
    }

    var ic = document.getElementById('infoCards');
    console.log('4 ic=' + (ic ? 'found' : 'MISSING'));
    if (ic) {
        ic.innerHTML = '<div class="info-box"><div class="label">Номер</div><div class="value big">' + esc(receipt.number) + '</div></div>'
            + '<div class="info-box"><div class="label">Поставщик</div><div class="value">' + esc(receipt.supplierName || '—') + '</div></div>'
            + '<div class="info-box"><div class="label">Склад</div><div class="value">' + esc(receipt.warehouseName || '—') + '</div></div>'
            + '<div class="info-box"><div class="label">Статус</div><div><span class="status-pill ' + (isDraft ? 'status-draft' : 'status-committed') + '">' + (isDraft ? ' Черновик' : ' Подписана') + '</span></div></div>'
            + '<div class="info-box"><div class="label">Сумма</div><div class="value big">' + fmtMoney(calcTotal()) + '</div></div>';
        console.log('4 ic innerHTML length=' + ic.innerHTML.length);
    }

    var itd = document.getElementById('itemsToolbar');
    console.log('5 itd=' + (itd ? 'found' : 'MISSING'));
    if (itd) itd.innerHTML = isDraft ? '<button class="btn btn-primary" onclick="openProductSelector()"> Добавить товар</button>' : '';

    console.log('6 calling renderItems');
    renderItems();
    console.log('6 renderItems done');

    var ag = document.getElementById('auditGrid');
    console.log('7 ag=' + (ag ? 'found' : 'MISSING'));
    if (ag) {
        var h = '<div class="audit-item"><div class="label">Дата создания</div><div class="value">' + fmtDate(receipt.createdAt) + '</div></div>'
            + '<div class="audit-item"><div class="label">Создал</div><div class="value">' + esc(receipt.createdByName || '—') + '</div></div>';
        if (receipt.committedAt) {
            h += '<div class="audit-item"><div class="label">Дата подписания</div><div class="value">' + fmtDate(receipt.committedAt) + '</div></div>'
               + '<div class="audit-item"><div class="label">Подписал</div><div class="value">' + esc(receipt.committedByName || '—') + '</div></div>';
        }
        ag.innerHTML = h;
        console.log('7 ag innerHTML set');
    }

    var rc = document.getElementById('receiptContent');
    console.log('8 rc=' + (rc ? 'found' : 'MISSING'));
    if (rc) rc.style.display = 'block';

    console.log('[RECEIPT-DETAIL] renderAll END');
}

function renderItems() {
    var tb = document.getElementById('itemsBody');
    var ft = document.getElementById('itemsFoot');
    console.log('[RECEIPT-DETAIL] renderItems: itemsBody=', tb, 'itemsFoot=', ft);
    if (!tb) { console.error('[RECEIPT-DETAIL] itemsBody not found!'); return; }

    var isDraft = receipt.status === 'DRAFT';
    var items = receipt.items || [];
    console.log('[RECEIPT-DETAIL] renderItems: count=', items.length, 'isDraft=', isDraft);

    var title = document.getElementById('itemsTitle');
    if (title) title.textContent = 'Позиции (' + items.length + ')';

    if (items.length === 0) {
        var cc = isDraft ? 8 : 7;
        tb.innerHTML = '<tr><td colspan="' + cc + '" class="muted" style="padding:2rem;text-align:center;">Нет позиций.' + (isDraft ? ' Нажмите "Добавить товар"' : '') + '</td></tr>';
        if (ft) ft.innerHTML = '';
        return;
    }

    var html = '';
    var total = 0;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var sum = item.qty * item.price;
        total += sum;

        var prodLink = item.productId ? '<a class="clickable" href="/pages/product-detail.html?id=' + item.productId + '">' + esc(item.productName) + '</a>' : esc(item.productName || '—');
        var locHtml = item.locationId
            ? '<a class="clickable" href="/pages/location-detail.html?id=' + item.locationId + '">' + esc(item.locationName || 'Яч.' + item.locationId) + '</a>'
            : '<span class="muted">Не указана</span>';

        html += '<tr>';
        html += '<td>' + (i+1) + '</td>';
        html += '<td>' + prodLink + '</td>';
        html += '<td><span class="muted">' + esc(item.productSku || '—') + '</span></td>';

        if (isDraft) {
            html += '<td class="right"><input type="number" min="1" class="edit-input" value="' + item.qty + '" onchange="updateItem(' + item.id + ',\'qty\',this.value)"></td>';
            html += '<td class="right"><input type="number" min="0" step="0.01" class="edit-input" value="' + item.price + '" onchange="updateItem(' + item.id + ',\'price\',this.value)"></td>';
        } else {
            html += '<td class="right"><strong>' + item.qty + '</strong></td>';
            html += '<td class="right">' + fmtMoney(item.price) + '</td>';
        }

        html += '<td class="right"><strong>' + fmtMoney(sum) + '</strong></td>';
        html += '<td>' + locHtml + '</td>';

        if (isDraft) {
            html += '<td><button class="btn btn-sm btn-secondary" onclick="doSelectLocation(' + item.id + ')" title="Выбрать локацию">Указать</button> ';
            html += '<button class="btn btn-sm btn-danger" onclick="doRemoveItem(' + item.id + ')" title="Удалить позицию">Удалить</button></td>';
        }
        html += '</tr>';
    }
    tb.innerHTML = html;
    console.log('[RECEIPT-DETAIL] itemsBody innerHTML set, length=', html.length);

    if (ft) {
        ft.innerHTML = '<tr><td colspan="' + (isDraft ? 5 : 5) + '" class="right" style="font-weight:700;">Итого:</td>'
            + '<td class="right" style="font-weight:700;color:var(--primary);font-size:18px;">' + fmtMoney(total) + '</td>'
            + '<td></td>' + (isDraft ? '<td></td>' : '') + '</tr>';
    }
}

/* ==================== ACTIONS ==================== */
window.updateItem = function(itemId, field, value) {
    if (receipt.status !== 'DRAFT') return;
    var item = null;
    for (var i = 0; i < receipt.items.length; i++) { if (receipt.items[i].id === itemId) { item = receipt.items[i]; break; } }
    if (!item) return;
    item[field] = field === 'qty' ? (parseInt(value) || 1) : (parseFloat(value) || 0);
    api('PUT', '/api/receipts/' + receipt.id + '/items/' + itemId, {
        productId: item.productId, qty: item.qty, price: item.price, locationId: item.locationId
    }).then(function() {
        return api('GET', '/api/receipts/' + receipt.id);
    }).then(function(r) {
        receipt = r; renderItems(); updateTotalDisplay();
        showNotification('success', 'Позиция обновлена');
    }).catch(function(e) { showNotification('error', e.message); renderItems(); });
};

window.doRemoveItem = function(itemId) {
    if (!confirm('Удалить позицию?')) return;
    api('DELETE', '/api/receipts/' + receipt.id + '/items/' + itemId).then(function() {
        return api('GET', '/api/receipts/' + receipt.id);
    }).then(function(r) {
        receipt = r; renderItems(); updateTotalDisplay();
        showNotification('success', 'Позиция удалена');
    }).catch(function(e) { showNotification('error', e.message); });
};

window.doCommit = function() {
    if (!receipt.items || !receipt.items.length) { showNotification('error', 'Добавьте позицию'); return; }
    var missing = false;
    for (var i = 0; i < receipt.items.length; i++) { if (!receipt.items[i].locationId) { missing = true; break; } }
    if (missing) { showNotification('error', 'Укажите локацию для всех позиций'); return; }
    if (!confirm('Подписать документ?')) return;
    api('POST', '/api/receipts/' + receipt.id + '/commit').then(function() {
        return api('GET', '/api/receipts/' + receipt.id);
    }).then(function(r) { receipt = r; renderAll(); showNotification('success', 'Подписан'); })
    .catch(function(e) { showNotification('error', e.message); });
};

window.doDelete = function() {
    if (!confirm('Удалить документ?')) return;
    api('DELETE', '/api/receipts/' + receipt.id).then(function() {
        showNotification('success', 'Удалён');
        setTimeout(function() { window.location.href = '/pages/receipts.html'; }, 1000);
    }).catch(function(e) { showNotification('error', e.message); });
};

window.doSelectLocation = function(itemId) {
    window._locItemId = itemId;
    if (!window.LocationExplorer) { showNotification('error', 'LocationExplorer не загружен'); return; }
    if (!receipt.warehouseId) { showNotification('error', 'Склад не назначен'); return; }
    LocationExplorer.open(function(loc) {
        if (window._locItemId) updateLoc(window._locItemId, loc.id);
    }, receipt.warehouseId);
};

function updateLoc(itemId, locationId) {
    var item = null;
    for (var i = 0; i < receipt.items.length; i++) { if (receipt.items[i].id === itemId) { item = receipt.items[i]; break; } }
    if (!item) return;
    api('PUT', '/api/receipts/' + receipt.id + '/items/' + itemId, {
        productId: item.productId, qty: item.qty, price: item.price, locationId: locationId
    }).then(function() {
        return api('GET', '/api/receipts/' + receipt.id);
    }).then(function(r) { receipt = r; renderItems(); showNotification('success', 'Локация обновлена'); })
    .catch(function(e) { showNotification('error', e.message); });
}

function updateTotalDisplay() {
    var cards = document.getElementById('infoCards');
    if (!cards) return;
    var boxes = cards.querySelectorAll('.info-box');
    if (boxes.length >= 5) boxes[4].querySelector('.value').textContent = fmtMoney(calcTotal());
}

/* ==================== REF DATA ==================== */
async function loadSuppliers() { try { var p = await api('GET','/api/suppliers?page=0&size=200'); suppliersCache = p.content||[]; } catch(e){} }
async function loadCategories() { try { var p = await api('GET','/api/categories?page=0&size=200'); categoriesCache = p.content||[]; } catch(e){} }

/* ==================== PRODUCT SELECTOR ==================== */
window.openProductSelector = function() {
    if (!receipt || receipt.status !== 'DRAFT') return;
    ProductSelector.open(function(p) { addItem(p); });
};

function addItem(product) {
    api('POST', '/api/receipts/' + receipt.id + '/items', { productId: product.id, qty: 1, price: product.costPrice||0 })
    .then(function() { return api('GET','/api/receipts/'+receipt.id); })
    .then(function(r) { receipt = r; renderItems(); updateTotalDisplay(); showNotification('success','Товар добавлен'); })
    .catch(function(e) { showNotification('error', e.message); });
}

window.ProductSelector = {
    callback: null, filtered: [], selCat: null,
    open: function(cb) {
        this.callback = cb; this.selCat = null;
        document.getElementById('productSort').value = 'name_asc';
        this.load(); this.renderCatTree(); this.renderCatFilter();
        document.getElementById('productSelectModal').classList.remove('hidden');
    },
    close: function() { document.getElementById('productSelectModal').classList.add('hidden'); },
    load: function() {
        var self = this;
        api('GET','/api/products?page=0&size=2000').then(function(p) {
            productsCache = p.content||[]; self.filtered = productsCache.slice(); self.render();
        }).catch(function(e){console.error(e);});
    },
    renderCatFilter: function() {
        var s = document.getElementById('productCategoryFilter');
        if (!s) return;
        s.innerHTML = '<option value="">Все категории</option>';
        for (var i = 0; i < categoriesCache.length; i++) s.innerHTML += '<option value="'+categoriesCache[i].id+'">'+categoriesCache[i].name+'</option>';
    },
    renderCatTree: function() {
        var c = document.getElementById('productCategoryTree');
        if (!c) return;
        var roots = categoriesCache.filter(function(x){return !x.parentId;});
        var h = '<div class="category-item '+(this.selCat===null?'selected':'')+'" onclick="ProductSelector.selCatFn(null)"><span class="name">Все категории</span></div>';
        for (var i=0;i<roots.length;i++) h += this.renderNode(roots[i]);
        c.innerHTML = h;
    },
    renderNode: function(n, lvl) {
        lvl = lvl||0;
        var ch = categoriesCache.filter(function(x){return x.parentId===n.id;});
        var sel = this.selCat===n.id;
        var s = '<div class="category-item '+(sel?'selected':'')+'" style="padding-left:'+(lvl*16+8)+'px;" onclick="ProductSelector.selCatFn('+n.id+')"><span class="name">'+n.name+'</span></div>';
        for (var i=0;i<ch.length;i++) s += this.renderNode(ch[i],lvl+1);
        return s;
    },
    selCatFn: function(id) {
        this.selCat = id;
        var f = document.getElementById('productCategoryFilter');
        if (f) f.value = id||'';
        this.filter(); this.renderCatTree();
    },
    filter: function() {
        var q = (document.getElementById('productSearch').value||'').toLowerCase();
        var cf = document.getElementById('productCategoryFilter').value;
        var self = this;
        this.filtered = productsCache.filter(function(p) {
            if (cf && p.categoryId != cf) return false;
            if (q && p.name.toLowerCase().indexOf(q)<0 && (!p.sku||p.sku.toLowerCase().indexOf(q)<0)) return false;
            return true;
        });
        this.sort(); this.render();
    },
    sort: function() {
        var s = document.getElementById('productSort').value;
        this.filtered.sort(function(a,b) {
            switch(s){
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'price_asc': return (a.costPrice||0)-(b.costPrice||0);
                case 'price_desc': return (b.costPrice||0)-(a.costPrice||0);
                case 'created_desc': return (b.id||0)-(a.id||0);
                case 'created_asc': return (a.id||0)-(b.id||0);
                default: return 0;
            }
        });
    },
    render: function() {
        var tb = document.getElementById('productsBody');
        var pc = document.getElementById('productCount');
        if (pc) pc.textContent = this.filtered.length + ' товаров';
        if (!tb) return;
        if (!this.filtered.length) { tb.innerHTML = '<tr><td colspan="6" class="muted" style="padding:2rem;text-align:center;">Нет товаров</td></tr>'; return; }
        var html = '';
        for (var i=0;i<this.filtered.length;i++) {
            var p = this.filtered[i];
            var img = p.imageUrl ? '<img src="'+p.imageUrl+'" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">' : '<div style="width:40px;height:40px;background:#f0f1f7;border-radius:4px;"></div>';
            html += '<tr><td>'+img+'</td><td><strong>'+p.sku+'</strong></td><td>'+p.name+'</td><td>'+(p.categoryName||'—')+'</td><td>'+fmtMoney(p.costPrice)+'</td><td><button class="btn btn-sm btn-primary" onclick="ProductSelector.add('+p.id+')"></button></td></tr>';
        }
        tb.innerHTML = html;
    },
    add: function(id) {
        var p = null;
        for (var i=0;i<productsCache.length;i++) { if (productsCache[i].id===id) { p = productsCache[i]; break; } }
        if (p && this.callback) this.callback(p);
        this.close();
    }
};

/* Category styles */
var _cs = document.createElement('style');
_cs.textContent = '.category-item{display:flex;align-items:center;padding:8px 12px;cursor:pointer;border-radius:4px;transition:background .2s;margin:2px 0}.category-item:hover{background:#e9ecef}.category-item.selected{background:#e3f2fd}.category-item .name{flex:1;font-size:14px}';
document.head.appendChild(_cs);
