console.log('[RECEIPTS] init...');

debugAuthContext("RECEIPTS_PAGE").then(() => startPage());

let token = null;
let receiptsCache = [];
let currentReceipt = null;
let warehousesCache = [];
let suppliersCache = [];
let categoriesCache = [];
let productsCache = [];

/* ==================== START ==================== */

function startPage() {
    token = localStorage.getItem("token");
    if (!token) return (window.location.href = "/index.html");

    document.getElementById("usernameLabel").textContent = localStorage.getItem("username") || "user";
    document.getElementById("logoutBtn").onclick = () => {
        localStorage.clear();
        window.location.href = "/index.html";
    };

    bindEvents();
    loadReceipts();
    loadWarehouses();
    loadSuppliers();
    loadCategories();
}

/* ==================== ALERTS ==================== */

const alerts = document.getElementById("alerts");
let toastContainer = document.getElementById("toastContainer");
if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "toast-container";
    if (document.body) {
        document.body.appendChild(toastContainer);
    }
}

function showNotification(type, title, message) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : "⚠️";
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ""}
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    if (toastContainer) {
        toastContainer.appendChild(toast);
    }
    setTimeout(() => {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 3000);
    }, 4000);
}

function alertBox(type, text) {
    showNotification(type, type === "success" ? "Успех" : type === "error" ? "Ошибка" : "Уведомление", text);
}

/* ==================== HELPERS ==================== */

const fmtDate = (d) => d ? new Date(d).toLocaleString("ru-RU") : "—";
const fmtMoney = (n) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0 }).format(n || 0);

const statusPill = (s) => {
    const cls = s === "COMMITTED" ? "pill-committed" : "pill-draft";
    return `<span class="pill ${cls}">${s === "COMMITTED" ? "✅ Проведён" : "📝 Черновик"}</span>`;
};

/* ==================== API ==================== */

async function api(method, url, body) {
    try {
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        let json = null;
        try { json = await res.json(); } catch {}

        if (!res.ok) {
            alertBox("error", json?.message || json?.error || ("Ошибка " + res.status));
            throw new Error(json?.message || res.status);
        }
        return json;
    } catch (e) {
        if (!e.message.includes("API")) alertBox("error", e.message);
        throw e;
    }
}

/* ==================== LOAD DATA ==================== */

async function loadReceipts() {
    const tb = document.querySelector("#receiptsTable tbody");
    tb.innerHTML = `<tr><td colspan="8" class="muted">Загрузка...</td></tr>`;

    try {
        console.log('[loadReceipts] Fetching receipts...');
        const page = await api("GET", "/api/receipts?page=0&size=200");
        console.log('[loadReceipts] Received:', page);
        receiptsCache = page.content || [];
        console.log('[loadReceipts] Cached:', receiptsCache.length, 'receipts');
        renderTable();
    } catch (e) {
        console.error('[loadReceipts] Error:', e);
        tb.innerHTML = `<tr><td colspan="8" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

function renderTable() {
    console.log('[renderTable] Rendering', receiptsCache.length, 'receipts');
    const tb = document.querySelector("#receiptsTable tbody");
    const q = (document.getElementById("filterInput").value || "").toLowerCase();
    tb.innerHTML = "";

    const filtered = receiptsCache.filter(r => {
        if (!q) return true;
        return (r.number && r.number.toLowerCase().includes(q)) ||
               (r.supplierName && r.supplierName.toLowerCase().includes(q));
    });

    console.log('[renderTable] Filtered to', filtered.length, 'receipts');

    if (filtered.length === 0) {
        tb.innerHTML = `<tr><td colspan="8" class="muted">${receiptsCache.length === 0 ? 'Нет приёмков' : 'Документы не найдены'}</td></tr>`;
        return;
    }

    for (const r of filtered) {
        console.log('[renderTable] Rendering receipt:', r);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${r.number}</strong></td>
            <td>${statusPill(r.status)}</td>
            <td>${r.supplierName || "—"}</td>
            <td>${r.warehouseName || "—"}</td>
            <td>${r.createdByName || "—"}</td>
            <td>${fmtDate(r.createdAt)}</td>
            <td class="right">${fmtMoney(r.totalSum)}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="ReceiptForm.open(${r.id})">👁</button></td>
        `;
        tb.appendChild(tr);
    }
    console.log('[renderTable] Done');
}

async function loadWarehouses() {
    try {
        const page = await api("GET", "/api/warehouses?page=0&size=100");
        warehousesCache = page.content || [];
        console.log('[loadWarehouses] Loaded:', warehousesCache.length, 'warehouses');
    } catch (e) {
        console.error('[loadWarehouses] error:', e);
    }
}

async function loadSuppliers() {
    try {
        const page = await api("GET", "/api/suppliers?page=0&size=100");
        suppliersCache = page.content || [];
        console.log('[loadSuppliers] Loaded:', suppliersCache.length, 'suppliers');
    } catch (e) {
        console.error('[loadSuppliers] error:', e);
    }
}

async function loadCategories() {
    try {
        const page = await api("GET", "/api/categories?page=0&size=100");
        categoriesCache = page.content || [];
        console.log('[loadCategories] Loaded:', categoriesCache.length, 'categories');
    } catch (e) {
        console.error('[loadCategories] error:', e);
    }
}

/* ==================== EVENTS ==================== */

function bindEvents() {
    const filterInput = document.getElementById("filterInput");
    const btnCreate = document.getElementById("btnCreate");
    const btnCloseDetail = document.getElementById("btnCloseDetail");
    
    if (filterInput) {
        filterInput.addEventListener("input", renderTable);
    }
    if (btnCreate) {
        btnCreate.onclick = () => ReceiptForm.open();
    }
    if (btnCloseDetail) {
        btnCloseDetail.onclick = ReceiptForm.close;
    }
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
            // Редактирование
            document.getElementById("formHeader").textContent = "Редактирование приёмки";
            document.getElementById("formTitle").textContent = "Приёмка";
            this.loadReceipt(receiptId);
        } else {
            // Создание нового черновика
            document.getElementById("formHeader").textContent = "Создание приёмки";
            document.getElementById("formTitle").textContent = "Новая приёмка";
            form.reset();
            document.getElementById("receiptId").value = "";
            document.getElementById("receiptStatus").textContent = "📝 Черновик";
            document.getElementById("receiptStatus").className = "pill pill-draft";
            document.getElementById("receiptDate").textContent = new Date().toLocaleString("ru-RU");
            document.getElementById("btnDeleteDraft").style.display = "none";
            document.getElementById("btnCommit").style.display = "none";
            document.getElementById("btnSave").style.display = "inline-block";
            this.items = [];
            this.renderItems();
        }
        
        modal.classList.remove("hidden");
    },

    close() {
        document.getElementById("receiptFormModal").classList.add("hidden");
    },

    async loadReceipt(id) {
        try {
            const receipt = await api("GET", `/api/receipts/${id}`);
            currentReceipt = receipt;
            
            document.getElementById("receiptId").value = receipt.id;
            document.getElementById("receiptSupplier").value = receipt.supplierName || "";
            document.getElementById("receiptSupplierId").value = receipt.supplierId || "";
            document.getElementById("receiptWarehouse").value = receipt.warehouseName || "";
            document.getElementById("receiptWarehouseId").value = receipt.warehouseId || "";
            document.getElementById("receiptStatus").textContent = receipt.status === "COMMITTED" ? "✅ Проведён" : "📝 Черновик";
            document.getElementById("receiptStatus").className = `pill ${receipt.status === "COMMITTED" ? "pill-committed" : "pill-draft"}`;
            document.getElementById("receiptDate").textContent = fmtDate(receipt.createdAt);
            
            // Загружаем позиции
            this.items = receipt.items || [];
            this.renderItems();
            
            // Показываем/скрываем кнопки в зависимости от статуса
            const isDraft = receipt.status === "DRAFT";
            document.getElementById("btnDeleteDraft").style.display = isDraft ? "inline-block" : "none";
            document.getElementById("btnCommit").style.display = isDraft ? "inline-block" : "none";
            document.getElementById("btnSave").style.display = isDraft ? "inline-block" : "none";
            
            // Блокируем поля если документ проведён
            const inputs = document.querySelectorAll("#receiptForm input, #receiptForm select, #receiptForm button");
            inputs.forEach(el => {
                if (el.id !== "btnCloseDetail") {
                    el.disabled = !isDraft;
                }
            });
            
        } catch (e) {
            alertBox("error", "Ошибка загрузки: " + e.message);
        }
    },

    selectSupplier() {
        SupplierSelector.open((supplier) => {
            document.getElementById("receiptSupplier").value = supplier.name;
            document.getElementById("receiptSupplierId").value = supplier.id;
        });
    },

    selectWarehouse() {
        WarehouseSelector.open((warehouse) => {
            document.getElementById("receiptWarehouse").value = warehouse.name;
            document.getElementById("receiptWarehouseId").value = warehouse.id;
        });
    },

    openProductSelector() {
        const warehouseId = document.getElementById("receiptWarehouseId").value;
        if (!warehouseId) {
            alertBox("error", "Сначала выберите склад");
            return;
        }
        ProductSelector.open((product) => {
            this.addProduct(product);
        }, warehouseId);
    },

    addProduct(product) {
        // Проверяем, есть ли уже такой товар
        const existing = this.items.find(i => i.productId === product.id);
        if (existing) {
            existing.qty += 1;
        } else {
            this.items.push({
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                qty: 1,
                price: product.costPrice || 0,
                locationId: null,
                locationCode: null
            });
        }
        this.renderItems();
    },

    renderItems() {
        const tbody = document.getElementById("receiptItemsBody");
        
        if (this.items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="muted" style="padding: 2rem; text-align: center;">Нет позиций</td></tr>';
            document.getElementById("receiptTotal").textContent = fmtMoney(0);
            return;
        }

        let total = 0;
        tbody.innerHTML = this.items.map((item, index) => {
            const sum = item.qty * item.price;
            total += sum;
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <strong>${item.productName}</strong><br>
                        <span class="muted" style="font-size: 12px;">${item.productSku}</span>
                    </td>
                    <td>
                        <input type="number" min="1" value="${item.qty}" 
                               onchange="ReceiptForm.updateItem(${index}, 'qty', this.value)"
                               class="input" style="width: 80px;">
                    </td>
                    <td>
                        <input type="number" min="0" step="0.01" value="${item.price}" 
                               onchange="ReceiptForm.updateItem(${index}, 'price', this.value)"
                               class="input" style="width: 100px;">
                    </td>
                    <td class="right">${fmtMoney(sum)}</td>
                    <td>
                        <span class="muted" style="font-size: 12px;">${item.locationCode || 'Не выбрана'}</span>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="ReceiptForm.selectLocation(${index})">🗺️</button>
                    </td>
                    <td>
                        <button type="button" class="btn btn-sm btn-danger" onclick="ReceiptForm.removeItem(${index})">✕</button>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById("receiptTotal").textContent = fmtMoney(total);
    },

    updateItem(index, field, value) {
        this.items[index][field] = field === 'qty' ? parseInt(value) || 1 : parseFloat(value) || 0;
        this.renderItems();
    },

    removeItem(index) {
        this.items.splice(index, 1);
        this.renderItems();
    },

    selectLocation(index) {
        this.currentLocationSelectorCallback = index;
        const warehouseId = document.getElementById("receiptWarehouseId").value;
        
        if (!warehouseId) {
            alertBox("error", "Сначала выберите склад");
            return;
        }
        
        // Используем LocationExplorer из location-explorer.js
        if (window.LocationExplorer) {
            LocationExplorer.open((location) => {
                if (this.currentLocationSelectorCallback !== null) {
                    this.items[this.currentLocationSelectorCallback].locationId = location.id;
                    this.items[this.currentLocationSelectorCallback].locationCode = location.code;
                    this.renderItems();
                }
            }, warehouseId);
        } else {
            alertBox("error", "LocationExplorer не загружен");
        }
    },

    async handleSubmit(event) {
        event.preventDefault();
        await this.save();
    },

    async save() {
        const receiptId = document.getElementById("receiptId").value;
        const supplierId = document.getElementById("receiptSupplierId").value;
        const warehouseId = document.getElementById("receiptWarehouseId").value;

        if (!supplierId) {
            alertBox("error", "Выберите поставщика");
            return;
        }
        if (!warehouseId) {
            alertBox("error", "Выберите склад");
            return;
        }
        if (this.items.length === 0) {
            alertBox("error", "Добавьте хотя бы одну позицию");
            return;
        }

        const data = {
            supplierId: parseInt(supplierId),
            warehouseId: parseInt(warehouseId),
            createdById: parseInt(localStorage.getItem("userId") || 1),
            items: this.items.map(item => ({
                productId: item.productId,
                qty: item.qty,
                price: item.price,
                locationId: item.locationId
            }))
        };

        try {
            if (receiptId) {
                // Обновление
                await api("PUT", `/api/receipts/${receiptId}`, data);
                alertBox("success", "Приёмка обновлена");
            } else {
                // Создание
                const created = await api("POST", "/api/receipts", data);
                alertBox("success", "Приёмка создана: " + created.number);
                currentReceipt = created;
                document.getElementById("receiptId").value = created.id;
                
                // Обновляем форму после создания
                this.loadReceipt(created.id);
                return; // Выходим, чтобы не закрывать форму
            }
            
            this.close();
            loadReceipts();
        } catch (e) {
            console.error('[ReceiptForm] Save error:', e);
        }
    },

    async delete() {
        const receiptId = document.getElementById("receiptId").value;
        if (!receiptId || !confirm("Удалить документ?")) return;

        try {
            await api("DELETE", `/api/receipts/${receiptId}`);
            alertBox("success", "Приёмка удалена");
            this.close();
            loadReceipts();
        } catch (e) {
            console.error('[ReceiptForm] Delete error:', e);
        }
    },

    async commit() {
        const receiptId = document.getElementById("receiptId").value;
        if (!receiptId) return;

        // Проверяем, что у всех позиций есть локация
        const missingLocation = this.items.some(i => !i.locationId);
        if (missingLocation) {
            alertBox("error", "Укажите локацию для всех позиций");
            return;
        }

        if (!confirm("Провести документ?")) return;

        try {
            await api("POST", `/api/receipts/${receiptId}/commit`, {});
            alertBox("success", "Приёмка проведена");
            this.close();
            loadReceipts();
        } catch (e) {
            console.error('[ReceiptForm] Commit error:', e);
        }
    }
};

/* ==================== SUPPLIER SELECTOR ==================== */

window.SupplierSelector = {
    callback: null,

    async open(callback) {
        this.callback = callback;
        
        // Загружаем поставщиков если ещё не загружены
        if (suppliersCache.length === 0) {
            await loadSuppliers();
        }
        
        this.render();
        document.getElementById("supplierSelectModal").classList.remove("hidden");
    },

    close() {
        document.getElementById("supplierSelectModal").classList.add("hidden");
    },

    render(filter = '') {
        const tbody = document.getElementById("suppliersBody");
        const q = filter.toLowerCase();
        
        const filtered = suppliersCache.filter(s => 
            !q || s.name.toLowerCase().includes(q) || (s.inn && s.inn.includes(q))
        );

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="muted" style="padding: 2rem; text-align: center;">Поставщиков нет</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(s => `
            <tr style="cursor: pointer;" onclick="SupplierSelector.select(${s.id}, '${s.name.replace(/'/g, "\\'")}')">
                <td><strong>${s.name}</strong></td>
                <td>${s.inn || '—'}</td>
                <td>${s.phone || '—'}</td>
            </tr>
        `).join('');
    },

    select(id, name) {
        if (this.callback) this.callback({ id, name });
        this.close();
    },

    search() {
        const query = document.getElementById("supplierSearch").value;
        this.render(query);
    }
};

/* ==================== WAREHOUSE SELECTOR ==================== */

window.WarehouseSelector = {
    callback: null,

    async open(callback) {
        this.callback = callback;
        
        // Загружаем склады если ещё не загружены
        if (warehousesCache.length === 0) {
            await loadWarehouses();
        }
        
        this.render();
        document.getElementById("warehouseSelectModal").classList.remove("hidden");
    },

    close() {
        document.getElementById("warehouseSelectModal").classList.add("hidden");
    },

    render() {
        const tbody = document.getElementById("warehousesBody");
        
        if (warehousesCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="muted" style="padding: 2rem; text-align: center;">Складов нет</td></tr>';
            return;
        }

        tbody.innerHTML = warehousesCache.map(w => `
            <tr style="cursor: pointer;" onclick="WarehouseSelector.select(${w.id}, '${w.name.replace(/'/g, "\\'")}')">
                <td><strong>${w.name}</strong></td>
                <td>${w.address || '—'}</td>
            </tr>
        `).join('');
    },

    select(id, name) {
        if (this.callback) this.callback({ id, name });
        this.close();
    }
};

/* ==================== PRODUCT SELECTOR ==================== */

window.ProductSelector = {
    callback: null,
    filteredProducts: [],
    selectedCategoryId: null,
    currentSort: 'name_asc',

    open(callback, warehouseId) {
        this.callback = callback;
        this.selectedCategoryId = null;
        this.currentSort = 'name_asc';
        document.getElementById("productSort").value = 'name_asc';
        this.loadProducts();
        this.renderCategoryTree();
        this.renderCategoryFilter();
        document.getElementById("productSelectModal").classList.remove("hidden");
    },

    close() {
        document.getElementById("productSelectModal").classList.add("hidden");
    },

    async loadProducts() {
        try {
            const page = await api("GET", "/api/products?page=0&size=1000");
            productsCache = page.content || [];
            this.filteredProducts = [...productsCache];
            this.renderProducts();
        } catch (e) {
            console.error('[ProductSelector] Load error:', e);
        }
    },

    renderCategoryFilter() {
        const select = document.getElementById("productCategoryFilter");
        select.innerHTML = '<option value="">Все категории</option>' +
            categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    },

    renderCategoryTree() {
        const container = document.getElementById("productCategoryTree");
        const roots = categoriesCache.filter(c => !c.parentId);
        
        let html = `
            <div class="category-item ${this.selectedCategoryId === null ? 'selected' : ''}" 
                 onclick="ProductSelector.selectCategory(null)">
                <span class="icon">📂</span>
                <span class="name">Все категории</span>
            </div>
        `;
        
        roots.forEach(root => {
            html += this.renderCategoryNode(root);
        });
        
        container.innerHTML = html;
    },

    renderCategoryNode(node, level = 0) {
        const children = categoriesCache.filter(c => c.parentId === node.id);
        const isSelected = this.selectedCategoryId === node.id;
        const indent = level * 16;

        let html = `
            <div class="category-item ${isSelected ? 'selected' : ''}" 
                 style="padding-left: ${indent + 8}px;"
                 onclick="ProductSelector.selectCategory(${node.id})">
                <span class="icon">${children.length > 0 ? '📁' : '📄'}</span>
                <span class="name">${node.name}</span>
            </div>
        `;

        children.forEach(child => {
            html += this.renderCategoryNode(child, level + 1);
        });

        return html;
    },

    selectCategory(categoryId) {
        this.selectedCategoryId = categoryId;
        
        // Обновляем селект
        document.getElementById("productCategoryFilter").value = categoryId || '';
        
        this.filter();
        this.renderCategoryTree();
    },

    filter() {
        const searchQuery = (document.getElementById("productSearch").value || "").toLowerCase();
        const categoryFilter = document.getElementById("productCategoryFilter").value;
        
        this.filteredProducts = productsCache.filter(p => {
            // Фильтр по категории
            if (categoryFilter && p.categoryId != categoryFilter) {
                return false;
            }
            
            // Поиск
            if (searchQuery) {
                const matchName = p.name.toLowerCase().includes(searchQuery);
                const matchSku = p.sku.toLowerCase().includes(searchQuery);
                if (!matchName && !matchSku) return false;
            }
            
            return true;
        });

        this.sort();
    },

    sort() {
        const sort = document.getElementById("productSort").value;
        this.currentSort = sort;
        
        this.filteredProducts.sort((a, b) => {
            switch(sort) {
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'price_asc': return (a.costPrice || 0) - (b.costPrice || 0);
                case 'price_desc': return (b.costPrice || 0) - (a.costPrice || 0);
                case 'created_desc': return (b.id || 0) - (a.id || 0);
                case 'created_asc': return (a.id || 0) - (b.id || 0);
                default: return 0;
            }
        });

        this.renderProducts();
    },

    renderProducts() {
        const tbody = document.getElementById("productsBody");
        document.getElementById("productCount").textContent = `${this.filteredProducts.length} товаров`;

        if (this.filteredProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="muted" style="padding: 2rem; text-align: center;">Нет товаров</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredProducts.map(p => `
            <tr>
                <td>
                    ${p.imageUrl 
                        ? `<img src="${p.imageUrl}" alt="" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">`
                        : '<div style="width: 40px; height: 40px; background: #f0f1f7; border-radius: 4px; display: flex; align-items: center; justify-content: center;">📦</div>'
                    }
                </td>
                <td><strong>${p.sku}</strong></td>
                <td>${p.name}</td>
                <td>${p.categoryName || '—'}</td>
                <td>${fmtMoney(p.costPrice)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="ProductSelector.select(${p.id}, '${p.name.replace(/'/g, "\\'")}', '${p.sku}', ${p.costPrice || 0})">
                        ➕
                    </button>
                </td>
            </tr>
        `).join('');
    },

    select(id, name, sku, price) {
        if (this.callback) {
            this.callback({ id, name, sku, costPrice: price });
        }
        this.close();
    },

    search() {
        this.filter();
    }
};

// Стили для дерева категорий
const categoryTreeStyles = document.createElement('style');
categoryTreeStyles.textContent = `
    .category-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
        margin: 2px 0;
    }

    .category-item:hover {
        background: #e9ecef;
    }

    .category-item.selected {
        background: #e3f2fd;
    }

    .category-item .icon {
        margin-right: 8px;
        font-size: 16px;
    }

    .category-item .name {
        flex: 1;
        font-size: 14px;
    }
`;
document.head.appendChild(categoryTreeStyles);
