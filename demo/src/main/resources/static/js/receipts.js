console.log('[RECEIPTS] init...');

/* ==================== STATE ==================== */
let receiptsCache = [];
let currentReceipt = null;
let suppliersCache = [];
let categoriesCache = [];
let productsCache = [];
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let totalElements = 0;
let searchQuery = '';

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', function() { startPage(); });

function startPage() {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/index.html"; return; }
    document.getElementById("usernameLabel").textContent = localStorage.getItem("username") || "user";
    document.getElementById("logoutBtn").onclick = () => { localStorage.clear(); window.location.href = "/index.html"; };
    bindEvents();
    loadReceipts(1);
    loadUserProfile();
    loadSuppliers();
    loadCategories();
}

/* ==================== ALERTS ==================== */
let toastContainer = document.getElementById("toastContainer");
if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
}

function showNotification(type, title, message) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon"></span><div class="toast-content"><div class="toast-title">${title}</div>${message ? `<div class="toast-message">${message}</div>` : ""}</div><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.classList.add("hiding"); setTimeout(() => toast.remove(), 3000); }, 4000);
}

function alertBox(type, text) {
    showNotification(type, type === "success" ? "Успех" : type === "error" ? "Ошибка" : "Уведомление", text);
}

/* ==================== HELPERS ==================== */
const fmtDate = (d) => d ? new Date(d).toLocaleString("ru-RU") : "—";
const fmtMoney = (n) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0 }).format(n || 0);
const statusPill = (s) => `<span class="pill ${s === 'COMMITTED' ? 'pill-committed' : 'pill-draft'}">${s === 'COMMITTED' ? ' Подписана' : ' Черновик'}</span>`;

/* ==================== API ==================== */
async function api(method, url, body) {
    try {
        const token = await AuthService.getToken();
        if (!token) { alertBox("error", "Сессия истекла"); window.location.href = "/index.html"; throw new Error("No token"); }
        const res = await fetch(url, { method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
        let json = null; try { json = await res.json(); } catch {}
        if (!res.ok) { alertBox("error", json?.message || json?.error || ("Ошибка " + res.status)); throw new Error(json?.message || res.status); }
        return json;
    } catch (e) { if (!e.message.includes("API")) alertBox("error", e.message); throw e; }
}

/* ==================== LOAD RECEIPTS ==================== */
async function loadReceipts(page = 1) {
    currentPage = page;
    const tb = document.getElementById("receiptsBody");
    tb.innerHTML = `<tr><td colspan="7" class="muted">Загрузка...</td></tr>`;
    try {
        const pageData = await api("GET", `/api/receipts?page=${page - 1}&size=${pageSize}`);
        receiptsCache = pageData.content || [];
        totalElements = pageData.totalElements || 0;
        totalPages = pageData.totalPages || 0;
        renderTable();
        renderPagination();
    } catch (e) { tb.innerHTML = `<tr><td colspan="7" class="error">Ошибка: ${e.message}</td></tr>`; }
}

function renderTable() {
    const tb = document.getElementById("receiptsBody");
    const q = searchQuery.toLowerCase();
    tb.innerHTML = "";
    const filtered = receiptsCache.filter(r => !q || (r.number && r.number.toLowerCase().includes(q)) || (r.supplierName && r.supplierName.toLowerCase().includes(q)));
    if (filtered.length === 0) { tb.innerHTML = `<tr><td colspan="7" class="muted">${receiptsCache.length === 0 ? 'Нет приёмков' : 'Не найдено'}</td></tr>`; return; }
    for (const r of filtered) {
        const tr = document.createElement("tr");
        tr.className = "clickable-row";
        tr.onclick = () => { window.location.href = `/pages/receipt-detail.html?id=${r.id}`; };
        tr.innerHTML = `
            <td><strong>${r.number}</strong></td>
            <td>${statusPill(r.status)}</td>
            <td>${r.supplierName || "—"}</td>
            <td>${r.warehouseName || "—"}</td>
            <td>${r.createdByName || "—"}</td>
            <td>${fmtDate(r.createdAt)}</td>
            <td class="right">${fmtMoney(r.totalSum)}</td>`;
        tb.appendChild(tr);
    }
}

function renderPagination() {
    const div = document.getElementById("pagination");
    if (totalPages <= 1) { div.innerHTML = ''; return; }
    let html = `<button ${currentPage <= 1 ? 'disabled' : ''} onclick="loadReceipts(${currentPage - 1})">← Назад</button>`;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);
    if (start > 1) html += `<button onclick="loadReceipts(1)">1</button>`;
    if (start > 2) html += `<span class="page-info">...</span>`;
    for (let i = start; i <= end; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="loadReceipts(${i})">${i}</button>`;
    }
    if (end < totalPages - 1) html += `<span class="page-info">...</span>`;
    if (end < totalPages) html += `<button onclick="loadReceipts(${totalPages})">${totalPages}</button>`;
    html += `<button ${currentPage >= totalPages ? 'disabled' : ''} onclick="loadReceipts(${currentPage + 1})">Далее →</button>`;
    html += `<span class="page-info">${totalElements} записей</span>`;
    div.innerHTML = html;
}

async function loadUserProfile() {
    try {
        const profile = await api("GET", "/api/profile");
        if (profile && profile.warehouseId) {
            localStorage.setItem('userWarehouseId', profile.warehouseId);
            localStorage.setItem('userWarehouseName', profile.warehouseName || '');
        }
    } catch (e) { console.error('[loadUserProfile]', e); }
}

async function loadSuppliers() {
    try {
        const page = await api("GET", "/api/suppliers?page=0&size=100");
        suppliersCache = page.content || [];
    } catch (e) { console.error('[loadSuppliers]', e); }
}

async function loadCategories() {
    try {
        const page = await api("GET", "/api/categories?page=0&size=100");
        categoriesCache = page.content || [];
    } catch (e) { console.error('[loadCategories]', e); }
}

/* ==================== EVENTS ==================== */
function bindEvents() {
    const filterInput = document.getElementById("filterInput");
    const btnCreate = document.getElementById("btnCreate");
    if (filterInput) {
        let t; filterInput.addEventListener("input", function() {
            clearTimeout(t); searchQuery = this.value;
            t = setTimeout(() => loadReceipts(1), 300);
        });
    }
    if (btnCreate) btnCreate.onclick = createReceipt;
}

/* ==================== CREATE RECEIPT ==================== */
async function createReceipt() {
    try {
        const created = await api("POST", "/api/receipts", { items: [] });
        if (!created || !created.id) { alertBox("error", "Сервер вернул пустой ответ"); return; }
        alertBox("success", "Приёмка создана: " + created.number);
        window.location.href = `/pages/receipt-detail.html?id=${created.id}`;
    } catch (e) { console.error('[createReceipt]', e); }
}

/* ==================== RECEIPT FORM ==================== */
window.ReceiptForm = {
    items: [],
    currentLocationSelectorCallback: null,

    open(receiptId = null) {
        this.items = [];
        this.currentLocationSelectorCallback = null;
        const modal = document.getElementById("receiptFormModal");
        const form = document.getElementById("receiptForm");
        if (receiptId) {
            document.getElementById("formHeader").textContent = "Редактирование приёмки";
            document.getElementById("formTitle").textContent = "Приёмка";
            this.loadReceipt(receiptId);
        } else {
            document.getElementById("formHeader").textContent = "Создание приёмки";
            document.getElementById("formTitle").textContent = "Новая приёмка";
            form.reset();
            document.getElementById("receiptId").value = "";
            document.getElementById("receiptStatus").textContent = " Черновик";
            document.getElementById("receiptStatus").className = "pill pill-draft";
            document.getElementById("receiptDate").textContent = new Date().toLocaleString("ru-RU");
            document.getElementById("btnDeleteDraft").style.display = "none";
            document.getElementById("btnCommit").style.display = "none";
            document.getElementById("btnSave").style.display = "inline-block";
            this.items = []; this.renderItems();
            const uwh = localStorage.getItem('userWarehouseId');
            const uwhN = localStorage.getItem('userWarehouseName');
            if (uwh) {
                document.getElementById("receiptWarehouseId").value = uwh;
                document.getElementById("receiptWarehouse").value = uwhN || "Склад #" + uwh;
            } else {
                document.getElementById("receiptWarehouse").value = "Склад не назначен";
                document.getElementById("receiptWarehouse").style.backgroundColor = "#fff3cd";
            }
        }
        modal.classList.remove("hidden");
    },

    close() { document.getElementById("receiptFormModal").classList.add("hidden"); },

    async loadReceipt(id) {
        try {
            const receipt = await api("GET", `/api/receipts/${id}`);
            currentReceipt = receipt;
            document.getElementById("receiptId").value = receipt.id;
            document.getElementById("receiptSupplier").value = receipt.supplierName || "";
            document.getElementById("receiptSupplierId").value = receipt.supplierId || "";
            document.getElementById("receiptWarehouse").value = receipt.warehouseName || "";
            document.getElementById("receiptWarehouseId").value = receipt.warehouseId || "";
            document.getElementById("receiptStatus").textContent = receipt.status === "COMMITTED" ? " Проведён" : " Черновик";
            document.getElementById("receiptStatus").className = `pill ${receipt.status === "COMMITTED" ? "pill-committed" : "pill-draft"}`;
            document.getElementById("receiptDate").textContent = fmtDate(receipt.createdAt);
            this.items = receipt.items || [];
            this.renderItems();
            const isDraft = receipt.status === "DRAFT";
            document.getElementById("btnDeleteDraft").style.display = isDraft ? "inline-block" : "none";
            document.getElementById("btnCommit").style.display = isDraft ? "inline-block" : "none";
            document.getElementById("btnSave").style.display = isDraft ? "inline-block" : "none";
        } catch (e) { alertBox("error", "Ошибка загрузки: " + e.message); }
    },

    selectSupplier() { SupplierSelector.open((s) => { document.getElementById("receiptSupplier").value = s.name; document.getElementById("receiptSupplierId").value = s.id; }); },

    openProductSelector() {
        const warehouseId = document.getElementById("receiptWarehouseId").value;
        if (!warehouseId) { alertBox("error", "Склад не назначен"); return; }
        ProductSelector.open((p) => { this.addProduct(p); }, warehouseId);
    },

    addProduct(product) {
        const existing = this.items.find(i => i.productId === product.id);
        if (existing) { existing.qty += 1; }
        else { this.items.push({ productId: product.id, productName: product.name, productSku: product.sku, qty: 1, price: product.costPrice || 0, locationId: null, locationCode: null }); }
        this.renderItems();
    },

    renderItems() {
        const tbody = document.getElementById("receiptItemsBody");
        if (this.items.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="muted" style="padding:2rem;text-align:center;">Нет позиций</td></tr>'; document.getElementById("receiptTotal").textContent = fmtMoney(0); return; }
        let total = 0;
        tbody.innerHTML = this.items.map((item, i) => {
            const sum = item.qty * item.price; total += sum;
            return `<tr><td>${i + 1}</td><td><strong>${item.productName}</strong><br><span class="muted" style="font-size:12px;">${item.productSku}</span></td><td><input type="number" min="1" value="${item.qty}" onchange="ReceiptForm.updateItem(${i},'qty',this.value)" class="input" style="width:80px;"></td><td><input type="number" min="0" step="0.01" value="${item.price}" onchange="ReceiptForm.updateItem(${i},'price',this.value)" class="input" style="width:100px;"></td><td class="right">${fmtMoney(sum)}</td><td><span class="muted" style="font-size:12px;">${item.locationCode || 'Не выбрана'}</span> <button type="button" class="btn btn-sm btn-secondary" onclick="ReceiptForm.selectLocation(${i})"></button></td><td><button type="button" class="btn btn-sm btn-danger" onclick="ReceiptForm.removeItem(${i})"></button></td></tr>`;
        }).join('');
        document.getElementById("receiptTotal").textContent = fmtMoney(total);
    },

    updateItem(i, f, v) { this.items[i][f] = f === 'qty' ? parseInt(v) || 1 : parseFloat(v) || 0; this.renderItems(); },
    removeItem(i) { this.items.splice(i, 1); this.renderItems(); },

    selectLocation(i) {
        this.currentLocationSelectorCallback = i;
        const warehouseId = document.getElementById("receiptWarehouseId").value;
        if (!warehouseId) { alertBox("error", "Сначала выберите склад"); return; }
        if (window.LocationExplorer) {
            LocationExplorer.open((loc) => {
                if (this.currentLocationSelectorCallback !== null) {
                    this.items[this.currentLocationSelectorCallback].locationId = loc.id;
                    this.items[this.currentLocationSelectorCallback].locationCode = loc.code;
                    this.renderItems();
                }
            }, warehouseId);
        }
    },

    async handleSubmit(e) { e.preventDefault(); await this.save(); },

    async save() {
        const receiptId = document.getElementById("receiptId").value;
        const supplierId = document.getElementById("receiptSupplierId").value;
        const warehouseId = document.getElementById("receiptWarehouseId").value;
        if (!supplierId) { alertBox("error", "Выберите поставщика"); return; }
        if (!warehouseId) { alertBox("error", "Склад не назначен"); return; }
        if (this.items.length === 0) { alertBox("error", "Добавьте хотя бы одну позицию"); return; }
        const data = { supplierId: parseInt(supplierId), warehouseId: parseInt(warehouseId), items: this.items.map(it => ({ productId: it.productId, qty: it.qty, price: it.price, locationId: it.locationId })) };
        try {
            if (receiptId) {
                await api("PUT", `/api/receipts/${receiptId}`, data);
                alertBox("success", "Приёмка обновлена");
            } else {
                const created = await api("POST", "/api/receipts", data);
                alertBox("success", "Приёмка создана: " + created.number);
                currentReceipt = created;
                document.getElementById("receiptId").value = created.id;
                this.loadReceipt(created.id);
                return;
            }
            this.close(); loadReceipts(1);
        } catch (e) { console.error('[ReceiptForm.save]', e); }
    },

    async delete() {
        const id = document.getElementById("receiptId").value;
        if (!id || !confirm("Удалить документ?")) return;
        try { await api("DELETE", `/api/receipts/${id}`); alertBox("success", "Приёмка удалена"); this.close(); loadReceipts(1); } catch (e) { console.error('[ReceiptForm.delete]', e); }
    },

    async commit() {
        const id = document.getElementById("receiptId").value;
        if (!id) return;
        if (this.items.some(i => !i.locationId)) { alertBox("error", "Укажите локацию для всех позиций"); return; }
        if (!confirm("Провести документ?")) return;
        try { await api("POST", `/api/receipts/${id}/commit`, {}); alertBox("success", "Приёмка проведена"); this.close(); loadReceipts(1); } catch (e) { console.error('[ReceiptForm.commit]', e); }
    }
};

/* ==================== SUPPLIER SELECTOR ==================== */
window.SupplierSelector = {
    callback: null,
    async open(cb) { this.callback = cb; if (suppliersCache.length === 0) await loadSuppliers(); this.render(); document.getElementById("supplierSelectModal").classList.remove("hidden"); },
    close() { document.getElementById("supplierSelectModal").classList.add("hidden"); },
    render() {
        const tb = document.getElementById("suppliersBody");
        const q = (document.getElementById("supplierSearch").value || "").toLowerCase();
        const f = suppliersCache.filter(s => !q || s.name.toLowerCase().includes(q) || (s.inn && s.inn.includes(q)));
        if (f.length === 0) { tb.innerHTML = '<tr><td colspan="3" class="muted" style="padding:2rem;text-align:center;">Нет поставщиков</td></tr>'; return; }
        tb.innerHTML = f.map(s => `<tr style="cursor:pointer;" onclick="SupplierSelector.select(${s.id},'${s.name.replace(/'/g,"\\'")}')"><td><strong>${s.name}</strong></td><td>${s.inn||'—'}</td><td>${s.phone||'—'}</td></tr>`).join('');
    },
    select(id, name) { if (this.callback) this.callback({id,name}); this.close(); },
    search() { this.render(); }
};

/* ==================== PRODUCT SELECTOR ==================== */
window.ProductSelector = {
    callback: null, filteredProducts: [], selectedCategoryId: null, currentSort: 'name_asc',
    open(cb, warehouseId) { this.callback = cb; this.selectedCategoryId = null; this.currentSort = 'name_asc'; document.getElementById("productSort").value = 'name_asc'; this.loadProducts(); this.renderCategoryTree(); this.renderCategoryFilter(); document.getElementById("productSelectModal").classList.remove("hidden"); },
    close() { document.getElementById("productSelectModal").classList.add("hidden"); },
    async loadProducts() { try { const p = await api("GET","/api/products?page=0&size=1000"); productsCache = p.content||[]; this.filteredProducts = [...productsCache]; this.renderProducts(); } catch(e){console.error(e)} },
    renderCategoryFilter() { const s = document.getElementById("productCategoryFilter"); s.innerHTML = '<option value="">Все категории</option>' + categoriesCache.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); },
    renderCategoryTree() {
        const c = document.getElementById("productCategoryTree");
        const roots = categoriesCache.filter(x=>!x.parentId);
        let h = `<div class="category-item ${this.selectedCategoryId===null?'selected':''}" onclick="ProductSelector.selectCategory(null)"><span class="icon"></span><span class="name">Все категории</span></div>`;
        roots.forEach(r => { h += this.renderNode(r); });
        c.innerHTML = h;
    },
    renderNode(node, lvl=0) {
        const ch = categoriesCache.filter(x=>x.parentId===node.id);
        const sel = this.selectedCategoryId===node.id;
        let h = `<div class="category-item ${sel?'selected':''}" style="padding-left:${lvl*16+8}px;" onclick="ProductSelector.selectCategory(${node.id})"><span class="icon">${ch.length?'':''} </span><span class="name">${node.name}</span></div>`;
        ch.forEach(c => { h += this.renderNode(c,lvl+1); });
        return h;
    },
    selectCategory(id) { this.selectedCategoryId = id; document.getElementById("productCategoryFilter").value = id||''; this.filter(); this.renderCategoryTree(); },
    filter() {
        const q = (document.getElementById("productSearch").value||"").toLowerCase();
        const cf = document.getElementById("productCategoryFilter").value;
        this.filteredProducts = productsCache.filter(p => {
            if (cf && p.categoryId != cf) return false;
            if (q && !p.name.toLowerCase().includes(q) && !(p.sku&&p.sku.toLowerCase().includes(q))) return false;
            return true;
        });
        this.sort();
    },
    sort() {
        const s = document.getElementById("productSort").value; this.currentSort = s;
        this.filteredProducts.sort((a,b) => { switch(s){case'name_asc':return a.name.localeCompare(b.name);case'name_desc':return b.name.localeCompare(a.name);case'price_asc':return(a.costPrice||0)-(b.costPrice||0);case'price_desc':return(b.costPrice||0)-(a.costPrice||0);case'created_desc':return(b.id||0)-(a.id||0);case'created_asc':return(a.id||0)-(b.id||0);default:return 0;} });
        this.renderProducts();
    },
    renderProducts() {
        const tb = document.getElementById("productsBody");
        document.getElementById("productCount").textContent = `${this.filteredProducts.length} товаров`;
        if (this.filteredProducts.length === 0) { tb.innerHTML = '<tr><td colspan="6" class="muted" style="padding:2rem;text-align:center;">Нет товаров</td></tr>'; return; }
        tb.innerHTML = this.filteredProducts.map(p => `<tr><td>${p.imageUrl?`<img src="${p.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">`:'<div style="width:40px;height:40px;background:#f0f1f7;border-radius:4px;"></div>'}</td><td><strong>${p.sku}</strong></td><td>${p.name}</td><td>${p.categoryName||'—'}</td><td>${fmtMoney(p.costPrice)}</td><td><button class="btn btn-sm btn-primary" onclick="ProductSelector.select(${p.id},'${p.name.replace(/'/g,"\\'")}','${p.sku}',${p.costPrice||0})"></button></td></tr>`).join('');
    },
    select(id, name, sku, price) { if(this.callback) this.callback({id,name,sku,costPrice:price}); this.close(); },
    search() { this.filter(); }
};

/* ==================== CATEGORY STYLES ==================== */
const catStyles = document.createElement('style');
catStyles.textContent = `.category-item{display:flex;align-items:center;padding:8px 12px;cursor:pointer;border-radius:4px;transition:background .2s;margin:2px 0}.category-item:hover{background:#e9ecef}.category-item.selected{background:#e3f2fd}.category-item .icon{margin-right:8px;font-size:16px}.category-item .name{flex:1;font-size:14px}`;
document.head.appendChild(catStyles);
