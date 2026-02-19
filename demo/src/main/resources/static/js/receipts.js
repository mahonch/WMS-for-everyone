console.log("[RECEIPTS] init...");

debugAuthContext("RECEIPTS_PAGE").then(() => startPage());

let token = null;
let currentReceipt = null;
let receiptsCache = [];
let selectedSupplier = null;
let selectedWarehouse = null;

/* ==================== START ==================== */

function startPage() {
    token = localStorage.getItem("token");
    if (!token) return (window.location.href = "/index.html");

    document.getElementById("usernameLabel").textContent =
        localStorage.getItem("username") || "user";

    document.getElementById("logoutBtn").onclick = () => {
        localStorage.clear();
        window.location.href = "/index.html";
    };

    bindEvents();
    loadReceipts();
}

/* ==================== ALERTS ==================== */

const alerts = document.getElementById("alerts");

// Создаём контейнер для тостов если нет
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
    
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : type === "warning" ? "⚠️" : "ℹ️";
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ""}
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Автоудаление через 4 секунды
    setTimeout(() => {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function alertBox(type, text) {
    showNotification(type, type === "success" ? "Успех" : type === "error" ? "Ошибка" : "Уведомление", text);
}

/* ==================== HELPERS ==================== */

const fmtDate = (d) => d ? new Date(d).toLocaleString("ru-RU") : "—";
const fmtMoney = (n) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(n || 0);
const statusPill = (s) => {
    const cls = s === "COMMITTED" ? "pill-committed" : "pill-draft";
    const label = s === "COMMITTED" ? "✅ Проведён" : "📝 Черновик";
    return `<span class="pill ${cls}">${label}</span>`;
};

// Список единиц измерения
const UNITS = ["шт", "кг", "л", "м", "уп", "кор", "пачка", "бут", "бан", "коробка", "ящ", "набор"];

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
            const msg = json?.message || json?.error || ("Ошибка " + res.status);
            if (typeof Toast !== 'undefined') {
                Toast.error("API ошибка", msg);
            } else {
                alertBox("error", msg);
            }
            throw new Error(msg);
        }
        return json;
    } catch (e) {
        if (!e.message.includes("API")) {
            if (typeof Toast !== 'undefined') {
                Toast.error("Ошибка сети", e.message);
            } else {
                alertBox("error", e.message);
            }
        }
        throw e;
    }
}

/* ==================== LOAD RECEIPTS ==================== */

async function loadReceipts() {
    try {
        const page = await api("GET", "/api/receipts?page=0&size=400");
        receiptsCache = page.content || [];
        renderTable();
    } catch (e) {
        Toast.error("Ошибка", "Не удалось загрузить приёмки");
    }
}

function renderTable() {
    const tb = document.querySelector("#receiptsTable tbody");
    const q = (document.getElementById("filterInput").value || "").toLowerCase();
    tb.innerHTML = "";

    const filtered = receiptsCache.filter(r =>
        !q ||
        (r.number && r.number.toLowerCase().includes(q)) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
        tb.innerHTML = `<tr><td colspan="8" class="muted">Нет документов</td></tr>`;
        return;
    }

    for (const r of filtered) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${r.number}</strong></td>
            <td>${statusPill(r.status)}</td>
            <td>${r.supplierName || "—"}</td>
            <td>${r.warehouseName || "—"}</td>
            <td>${r.createdByName || "—"}</td>
            <td>${fmtDate(r.createdAt)}</td>
            <td class="right"><strong>${fmtMoney(r.totalSum)}</strong></td>
            <td><button class="btn btn-sm btn-secondary openBtn" data-id="${r.id}">Открыть</button></td>
        `;
        tb.appendChild(tr);
    }
}

/* ==================== EVENTS ==================== */

function bindEvents() {
    document.querySelector("#receiptsTable").addEventListener("click", async e => {
        const btn = e.target.closest(".openBtn");
        if (!btn) return;
        const r = await api("GET", `/api/receipts/${btn.dataset.id}`);
        showDetail(r);
    });

    document.getElementById("filterInput").addEventListener("input", renderTable);
    document.getElementById("btnCreate").onclick = createReceipt;
    document.getElementById("btnAddItem").onclick = addItemModal;
    document.getElementById("btnCommit").onclick = commitReceipt;
    document.getElementById("btnDeleteDraft").onclick = deleteDraft;
    document.getElementById("btnPrint").onclick = () => Toast.info("Инфо", "Печать будет реализована");
    document.getElementById("btnCloseDetail").onclick = hideDetail;

    document.querySelector("#itemsTable").addEventListener("click", deleteItemClick);
    document.getElementById("detailOverlay").onclick = e => {
        if (e.target.id === "detailOverlay") hideDetail();
    };

    // Кнопки создания в модалках выбора
    document.getElementById("btnCreateSupplier").onclick = createSupplierModal;
    document.getElementById("btnCreateWarehouse").onclick = createWarehouseModal;
    document.getElementById("btnCreateProduct").onclick = createProductModal;

    // Кнопки закрытия модалок выбора
    document.getElementById("btnCloseSupplierSelect").onclick = closeSupplierSelect;
    document.getElementById("btnCloseWarehouseSelect").onclick = closeWarehouseSelect;
    document.getElementById("btnCloseProductSelect").onclick = closeProductSelect;
    document.getElementById("btnCloseLocationSelect").onclick = closeLocationSelect;

    // Кнопки создания в модалках выбора
    document.getElementById("btnCreateLocation").onclick = createLocationModal;

    // Поиск в модалках выбора
    document.getElementById("supplierSearch").addEventListener("input", () => loadSuppliers());
    document.getElementById("warehouseSearch").addEventListener("input", () => loadWarehouses());
    document.getElementById("productSearch").addEventListener("input", () => loadProducts());
    document.getElementById("locationSearch").addEventListener("input", loadLocations);
    document.getElementById("locationWarehouseFilter").addEventListener("change", loadLocations);
    document.getElementById("locationTypeFilter").addEventListener("change", loadLocations);
}

/* ==================== CREATE RECEIPT ==================== */

function createReceipt() {
    const createdById = Number(localStorage.getItem("userId") || 1);
    const lastWh = localStorage.getItem("lastWarehouseId") || "";

    const modalHtml = `
        <div class="grid2">
            <div>
                <label>Поставщик</label>
                <div class="input-row">
                    <input id="cr_supplier" name="cr_supplier" class="input" readonly placeholder="Выберите поставщика">
                    <button class="btn btn-secondary" onclick="openSupplierSelect()">🔍</button>
                </div>
                <input type="hidden" id="cr_supplierId" name="cr_supplierId">
            </div>
            <div>
                <label>Склад *</label>
                <div class="input-row">
                    <input id="cr_warehouse" name="cr_warehouse" class="input" readonly placeholder="Выберите склад">
                    <button class="btn btn-secondary" onclick="openWarehouseSelect()">🔍</button>
                </div>
                <input type="hidden" id="cr_warehouseId" name="cr_warehouseId" value="${lastWh}">
            </div>
        </div>
        <label>Номер (опционально)</label>
        <input id="cr_number" name="cr_number" class="input" placeholder="Если пусто — сгенерируем">
    `;

    Modal.open(modalHtml, {
        width: "500px",
        title: "📥 Новая приёмка",
        onOk: async (data) => {
            console.log("[createReceipt] data:", data);
            const supplierId = data.cr_supplierId;
            const warehouseId = data.cr_warehouseId;
            const number = data.cr_number?.trim();

            if (!warehouseId) {
                alertBox("error", "Укажите склад");
                return;
            }

            const dto = {
                createdById,
                supplierId: supplierId ? Number(supplierId) : null,
                warehouseId: Number(warehouseId),
                number: number || null,
                items: []
            };

            const r = await api("POST", "/api/receipts", dto);
            localStorage.setItem("lastWarehouseId", dto.warehouseId);
            
            alertBox("success", `Создан черновик ${r.number}`);
            await loadReceipts(); // Обновляем список
        }
    });
}

/* ==================== DETAIL MODAL ==================== */

function showDetail(r) {
    currentReceipt = r;
    document.getElementById("detailOverlay").classList.remove("hidden");

    document.getElementById("d_id").textContent = r.id;
    document.getElementById("d_number").textContent = r.number;
    document.getElementById("d_status").innerHTML = statusPill(r.status);
    document.getElementById("d_supplier").textContent = r.supplierName || "—";
    document.getElementById("d_wh").textContent = r.warehouseName || "—";
    document.getElementById("d_createdBy").textContent = r.createdByName || "—";
    document.getElementById("d_date").textContent = fmtDate(r.createdAt);
    document.getElementById("d_committedBy").textContent = r.committedByName || "—";
    document.getElementById("d_committedAt").textContent = fmtDate(r.committedAt);
    document.getElementById("d_total").textContent = fmtMoney(r.totalSum);

    selectedSupplier = r.supplierId;
    selectedWarehouse = r.warehouseId;

    renderItems();

    const isDraft = r.status === "DRAFT";
    document.getElementById("btnAddItem").disabled = !isDraft;
    document.getElementById("btnCommit").disabled = !isDraft;
    document.getElementById("btnDeleteDraft").disabled = !isDraft;
}

function renderItems() {
    const tb = document.querySelector("#itemsTable tbody");
    tb.innerHTML = "";

    const items = currentReceipt.items || [];

    if (items.length === 0) {
        tb.innerHTML = `<tr><td colspan="7" class="muted">Нет позиций. Нажмите "Добавить позицию"</td></tr>`;
        return;
    }

    items.forEach((it, idx) => {
        const tr = document.createElement("tr");
        const sum = (it.qty * it.price) || 0;
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${it.productName || "Товар #" + it.productId}</strong></td>
            <td>${it.qty}</td>
            <td>${fmtMoney(it.price)}</td>
            <td><strong>${fmtMoney(sum)}</strong></td>
            <td>${it.locationName || "—"}</td>
            <td>
                ${currentReceipt.status === "DRAFT" ?
                    `<button class="btn btn-sm btn-danger delItemBtn" data-id="${it.id}">🗑️</button>` : ""}
            </td>
        `;
        tb.appendChild(tr);
    });
}

function hideDetail() {
    document.getElementById("detailOverlay").classList.add("hidden");
    currentReceipt = null;
}

/* ==================== ITEMS ==================== */

async function deleteItemClick(e) {
    const btn = e.target.closest(".delItemBtn");
    if (!btn) return;

    if (currentReceipt.status !== "DRAFT")
        return alertBox("error", "Удалять можно только черновик");

    if (!confirm("Удалить позицию?")) return;

    await api("DELETE", `/api/receipts/${currentReceipt.id}/items/${btn.dataset.id}`);
    const updated = await api("GET", `/api/receipts/${currentReceipt.id}`);
    showDetail(updated);
}

async function addItemModal() {
    if (!currentReceipt || currentReceipt.status !== "DRAFT")
        return alertBox("error", "Редактировать можно только черновик");

    const modalHtml = `
        <div>
            <label>Товар *</label>
            <div class="input-row">
                <input id="ai_product" name="ai_product" class="input" readonly placeholder="Выберите товар">
                <button class="btn btn-secondary" onclick="openProductSelect()">🔍</button>
            </div>
            <input type="hidden" id="ai_productId" name="ai_productId">
            <input type="hidden" id="ai_productPrice" name="ai_productPrice">
        </div>
        <div class="grid2">
            <div>
                <label>Кол-во *</label>
                <input id="ai_qty" name="ai_qty" type="number" min="1" class="input" value="1">
            </div>
            <div>
                <label>Цена (из карточки товара)</label>
                <input id="ai_price" name="ai_price" type="number" min="0" step="0.01" class="input" readonly style="background:#f0f0f0;">
            </div>
        </div>
        <div>
            <label>Локация (опционально)</label>
            <div class="input-row">
                <input id="ai_location" name="ai_location" class="input" readonly placeholder="Выберите локацию">
                <button class="btn btn-secondary" onclick="openLocationSelect()">🔍</button>
            </div>
            <input type="hidden" id="ai_locationId" name="ai_locationId">
        </div>
    `;

    Modal.open(modalHtml, {
        width: "500px",
        title: "➕ Добавить позицию",
        onOk: async (data) => {
            console.log("[addItem] data:", data);
            const productId = data.ai_productId;
            const qty = Number(data.ai_qty);
            const price = Number(data.ai_price);
            const locationId = data.ai_locationId;

            if (!productId) {
                alertBox("error", "Выберите товар");
                return;
            }
            if (!qty || qty <= 0) {
                alertBox("error", "Укажите корректное количество");
                return;
            }
            if (price < 0) {
                alertBox("error", "Цена не может быть отрицательной");
                return;
            }

            await api("POST", `/api/receipts/${currentReceipt.id}/items`, {
                productId: Number(productId),
                qty,
                price,
                locationId: locationId ? Number(locationId) : null
            });

            const updated = await api("GET", `/api/receipts/${currentReceipt.id}`);
            showDetail(updated);
            alertBox("success", "Позиция добавлена");
        }
    });
}

/* ==================== COMMIT ==================== */

async function commitReceipt() {
    if (!currentReceipt || currentReceipt.status !== "DRAFT")
        return alertBox("error", "Документ уже проведён");

    if (!currentReceipt.items || currentReceipt.items.length === 0)
        return alertBox("error", "Добавьте хотя бы одну позицию");

    // Проверяем что у всех позиций есть локации
    const itemsWithoutLocation = currentReceipt.items.filter(it => !it.locationId);
    if (itemsWithoutLocation.length > 0) {
        alertBox("error", `Укажите локацию для ${itemsWithoutLocation.length} поз.`);
        return;
    }

    if (!confirm("Провести приёмку?")) return;

    await api("POST", `/api/receipts/${currentReceipt.id}/commit`, {});

    alertBox("success", "Приёмка проведена");
    hideDetail();
    await loadReceipts(); // Обновляем список
}

/* ==================== DELETE DRAFT ==================== */

async function deleteDraft() {
    if (!currentReceipt || currentReceipt.status !== "DRAFT")
        return alertBox("error", "Удалять можно только черновик");

    if (!confirm("Удалить документ?")) return;

    await api("DELETE", `/api/receipts/${currentReceipt.id}`);

    alertBox("success", "Приёмка удалена");
    hideDetail();
    await loadReceipts(); // Обновляем список
}

/* ==================== SUPPLIER SELECT ==================== */

window.openSupplierSelect = async function openSupplierSelect() {
    console.log("[openSupplierSelect] opening...");
    const overlay = document.getElementById("supplierSelectOverlay");
    console.log("[openSupplierSelect] overlay:", overlay);
    
    if (!overlay) {
        Toast.error("Ошибка", "Модалка поставщика не найдена");
        return;
    }
    
    setModalZIndex(overlay);
    overlay.classList.remove("hidden");
    await loadSuppliers();
}

window.closeSupplierSelect = function closeSupplierSelect() {
    document.getElementById("supplierSelectOverlay").classList.add("hidden");
}

async function loadSuppliers() {
    const tb = document.querySelector("#supplierTable tbody");
    tb.innerHTML = `<tr><td colspan="6" class="muted">Загрузка...</td></tr>`;

    try {
        const search = document.getElementById("supplierSearch").value || "";
        const url = search
            ? `/api/suppliers/search?name=${encodeURIComponent(search)}&page=0&size=50`
            : `/api/suppliers?page=0&size=50`;

        const page = await api("GET", url);
        const list = page.content || [];

        tb.innerHTML = "";
        if (list.length === 0) {
            tb.innerHTML = `<tr><td colspan="6" class="muted">Нет поставщиков</td></tr>`;
            return;
        }

        list.forEach(s => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${s.id}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.inn || "—"}</td>
                <td>${s.phone || "—"}</td>
                <td>${s.email || "—"}</td>
                <td><button class="btn btn-sm btn-primary selectBtn" data-id="${s.id}" data-name="${s.name}">Выбрать</button></td>
            `;
            tb.appendChild(tr);
        });

        tb.querySelectorAll(".selectBtn").forEach(btn => {
            btn.onclick = () => {
                selectedSupplier = { id: btn.dataset.id, name: btn.dataset.name };

                const crInput = document.getElementById("cr_supplier");
                const crIdInput = document.getElementById("cr_supplierId");
                
                if (crInput && crIdInput) {
                    crInput.value = selectedSupplier.name;
                    crIdInput.value = selectedSupplier.id;
                }

                closeSupplierSelect();
            };
        });
    } catch (e) {
        tb.innerHTML = `<tr><td colspan="6" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

async function createSupplierModal() {
    const modalHtml = `
        <label>Название *</label>
        <input id="cs_name" name="cs_name" class="input" placeholder="ООО Ромашка">
        <label>ИНН</label>
        <input id="cs_inn" name="cs_inn" class="input" placeholder="1234567890">
        <label>Телефон</label>
        <input id="cs_phone" name="cs_phone" class="input" placeholder="+7 (999) 000-00-00">
        <label>Email</label>
        <input id="cs_email" name="cs_email" class="input" type="email" placeholder="info@example.com">
        <label>Адрес</label>
        <input id="cs_address" name="cs_address" class="input" placeholder="г. Москва, ул. Ленина 1">
    `;

    Modal.open(modalHtml, {
        width: "450px",
        title: "🚚 Новый поставщик",
        onOpen: () => {
            setTimeout(() => {
                const el = document.getElementById("cs_name");
                if (el) el.focus();
            }, 100);
        },
        onOk: async (data) => {
            console.log("[createSupplier] data:", data);
            const name = data.cs_name?.trim();

            if (!name) {
                alertBox("error", "Введите название");
                return;
            }

            await api("POST", "/api/suppliers", {
                name,
                inn: data.cs_inn?.trim() || null,
                phone: data.cs_phone?.trim() || null,
                email: data.cs_email?.trim() || null,
                address: data.cs_address?.trim() || null
            });

            alertBox("success", "Поставщик создан");
            await loadSuppliers(); // Обновляем список
        }
    });
}

/* ==================== WAREHOUSE SELECT ==================== */

window.openWarehouseSelect = async function openWarehouseSelect() {
    const overlay = document.getElementById("warehouseSelectOverlay");
    setModalZIndex(overlay);
    overlay.classList.remove("hidden");
    await loadWarehouses();
}

window.closeWarehouseSelect = function closeWarehouseSelect() {
    document.getElementById("warehouseSelectOverlay").classList.add("hidden");
}

async function loadWarehouses() {
    const tb = document.querySelector("#warehouseTable tbody");
    tb.innerHTML = `<tr><td colspan="6" class="muted">Загрузка...</td></tr>`;

    try {
        const search = document.getElementById("warehouseSearch").value || "";
        const url = search
            ? `/api/warehouses/search?name=${encodeURIComponent(search)}&page=0&size=50`
            : `/api/warehouses?page=0&size=50`;

        const page = await api("GET", url);
        const list = page.content || [];

        tb.innerHTML = "";
        if (list.length === 0) {
            tb.innerHTML = `<tr><td colspan="6" class="muted">Нет складов</td></tr>`;
            return;
        }

        list.forEach(w => {
            const tr = document.createElement("tr");
            const status = w.isActive ? "✅ Активен" : "❌ Неактивен";
            tr.innerHTML = `
                <td>${w.id}</td>
                <td><strong>${w.name}</strong></td>
                <td>${w.code || "—"}</td>
                <td>${w.address || "—"}</td>
                <td>${status}</td>
                <td><button class="btn btn-sm btn-primary selectBtn" data-id="${w.id}" data-name="${w.name}">Выбрать</button></td>
            `;
            tb.appendChild(tr);
        });

        tb.querySelectorAll(".selectBtn").forEach(btn => {
            btn.onclick = () => {
                selectedWarehouse = { id: btn.dataset.id, name: btn.dataset.name };

                const crInput = document.getElementById("cr_warehouse");
                if (crInput) {
                    crInput.value = selectedWarehouse.name;
                    document.getElementById("cr_warehouseId").value = selectedWarehouse.id;
                }

                closeWarehouseSelect();
            };
        });
    } catch (e) {
        tb.innerHTML = `<tr><td colspan="6" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

async function createWarehouseModal() {
    const modalHtml = `
        <label>Название *</label>
        <input id="cw_name" name="cw_name" class="input" placeholder="Основной склад">
        <label>Код</label>
        <input id="cw_code" name="cw_code" class="input" placeholder="WH01">
        <label>Адрес</label>
        <input id="cw_address" name="cw_address" class="input" placeholder="г. Москва, ул. Складская 1">
        <label>
            <input type="checkbox" id="cw_active" name="cw_active" checked> Активен
        </label>
    `;

    Modal.open(modalHtml, {
        width: "450px",
        title: "🏢 Новый склад",
        onOpen: () => {
            setTimeout(() => {
                const el = document.getElementById("cw_name");
                if (el) el.focus();
            }, 100);
        },
        onOk: async (data) => {
            console.log("[createWarehouse] data:", data);
            const name = data.cw_name?.trim();
            if (!name) {
                alertBox("error", "Введите название");
                return;
            }

            await api("POST", "/api/warehouses", {
                name,
                code: data.cw_code?.trim() || null,
                address: data.cw_address?.trim() || null,
                isActive: data.cw_active !== false
            });

            alertBox("success", "Склад создан");
            await loadWarehouses(); // Обновляем список
        }
    });
}

/* ==================== PRODUCT SELECT ==================== */

window.openProductSelect = async function openProductSelect() {
    const overlay = document.getElementById("productSelectOverlay");
    setModalZIndex(overlay);
    overlay.classList.remove("hidden");
    await loadProducts();
}

window.closeProductSelect = function closeProductSelect() {
    document.getElementById("productSelectOverlay").classList.add("hidden");
}

async function loadProducts() {
    const tb = document.querySelector("#productTable tbody");
    tb.innerHTML = `<tr><td colspan="7" class="muted">Загрузка...</td></tr>`;

    try {
        const search = document.getElementById("productSearch").value || "";
        const url = search
            ? `/api/products/search?name=${encodeURIComponent(search)}&page=0&size=50`
            : `/api/products?page=0&size=50`;

        const page = await api("GET", url);
        const list = page.content || [];

        tb.innerHTML = "";
        if (list.length === 0) {
            tb.innerHTML = `<tr><td colspan="7" class="muted">Нет товаров</td></tr>`;
            return;
        }

        list.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.id}</td>
                <td><code>${p.sku}</code></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.barcode || "—"}</td>
                <td>${p.categoryName || "—"}</td>
                <td>${fmtMoney(p.costPrice)}</td>
                <td><button class="btn btn-sm btn-primary selectBtn" data-id="${p.id}" data-name="${p.name}" data-price="${p.costPrice}">Выбрать</button></td>
            `;
            tb.appendChild(tr);
        });

        tb.querySelectorAll(".selectBtn").forEach(btn => {
            btn.onclick = () => {
                const product = { 
                    id: btn.dataset.id, 
                    name: btn.dataset.name,
                    price: parseFloat(btn.dataset.price) || 0
                };

                const aiInput = document.getElementById("ai_product");
                const aiPriceInput = document.getElementById("ai_price");
                const aiProductId = document.getElementById("ai_productId");
                
                if (aiInput && aiPriceInput && aiProductId) {
                    aiInput.value = product.name;
                    aiProductId.value = product.id;
                    aiPriceInput.value = product.price;
                }

                closeProductSelect();
            };
        });
    } catch (e) {
        tb.innerHTML = `<tr><td colspan="7" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

async function createProductModal() {
    // Загружаем категории
    let categoryOptions = '<option value="1">Основная</option>';
    try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/categories", {
            headers: { "Authorization": "Bearer " + token }
        });
        const categories = await res.json();
        if (categories.content) {
            categoryOptions = categories.content.map(c => 
                `<option value="${c.id}">${c.name}</option>`
            ).join('');
        }
    } catch (e) {
        console.error("[createProduct] categories error:", e);
    }

    // Единицы измерения
    const unitOptions = UNITS.map(u => `<option value="${u}">${u}</option>`).join('');

    const modalHtml = `
        <div class="grid2">
            <div>
                <label>SKU *</label>
                <input id="cp_sku" name="cp_sku" class="input" placeholder="ART-001">
            </div>
            <div>
                <label>Штрих-код</label>
                <input id="cp_barcode" name="cp_barcode" class="input" placeholder="Автогенерация если пусто">
            </div>
        </div>
        <label>Название *</label>
        <input id="cp_name" name="cp_name" class="input" placeholder="Товар">
        <div class="grid2">
            <div>
                <label>Категория *</label>
                <select id="cp_category" name="cp_category" class="input">${categoryOptions}</select>
            </div>
            <div>
                <label>Ед. изм. *</label>
                <select id="cp_unit" name="cp_unit" class="input">${unitOptions}</select>
            </div>
        </div>
        <div class="grid2">
            <div>
                <label>Цена</label>
                <input id="cp_price" name="cp_price" type="number" step="0.01" class="input" value="0">
            </div>
            <div>
                <label>Мин. остаток</label>
                <input id="cp_minStock" name="cp_minStock" type="number" class="input" value="0">
            </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:8px;">💡 Штрих-код будет сгенерирован автоматически если оставить поле пустым</p>
    `;

    Modal.open(modalHtml, {
        width: "500px",
        title: "📦 Новый товар",
        onOpen: () => {
            setTimeout(() => {
                const el = document.getElementById("cp_sku");
                if (el) el.focus();
            }, 100);
        },
        onOk: async (data) => {
            console.log("[createProduct] data:", data);
            const sku = data.cp_sku?.trim();
            const name = data.cp_name?.trim();

            if (!sku || !name) {
                alertBox("error", "Заполните SKU и название");
                return;
            }

            await api("POST", "/api/products", {
                sku,
                name,
                barcode: data.cp_barcode?.trim() || null,
                categoryId: Number(data.cp_category) || 1,
                unit: data.cp_unit || "шт",
                minStock: Number(data.cp_minStock) || 0,
                costPrice: Number(data.cp_price) || 0,
                isActive: true
            });

            alertBox("success", "Товар создан");
            await loadProducts(); // Обновляем список
        }
    });
}

/* ==================== LOCATION SELECT ==================== */

window.openLocationSelect = async function openLocationSelect() {
    const overlay = document.getElementById("locationSelectOverlay");
    setModalZIndex(overlay);
    overlay.classList.remove("hidden");
    
    // Загружаем склады для фильтра
    await loadWarehouseFilters();
    await loadLocations();
}

async function loadWarehouseFilters() {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/warehouses?page=0&size=100", {
            headers: { "Authorization": "Bearer " + token }
        });
        const warehouses = await res.json();
        const select = document.getElementById("locationWarehouseFilter");
        
        if (warehouses.content) {
            select.innerHTML = '<option value="">Все склады</option>' + 
                warehouses.content.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        }
    } catch (e) {
        console.error("[loadWarehouseFilters] error:", e);
    }
}

window.closeLocationSelect = function closeLocationSelect() {
    document.getElementById("locationSelectOverlay").classList.add("hidden");
}

async function createLocationModal() {
    // Загружаем склады
    let warehouseOptions = '<option value="">Выберите склад</option>';
    try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/warehouses?page=0&size=100", {
            headers: { "Authorization": "Bearer " + token }
        });
        const warehouses = await res.json();
        if (warehouses.content) {
            warehouseOptions += warehouses.content.map(w => 
                `<option value="${w.id}">${w.name}</option>`
            ).join('');
        }
    } catch (e) {
        console.error("[createLocation] warehouses error:", e);
    }

    const modalHtml = `
        <style>
            .loc-row { margin-bottom: 12px; }
            .loc-row label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 13px; color: #6b7280; }
            .loc-row input, .loc-row select { width: 100%; padding: 8px 12px; border: 1px solid #dfe3eb; border-radius: 8px; font-size: 14px; }
            .loc-path { background: #f0f4ff; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
            .loc-path-title { font-weight: 700; margin-bottom: 8px; color: #6c5ce7; }
        </style>
        
        <div class="loc-path">
            <div class="loc-path-title">📍 Путь к ячейке:</div>
            <div style="font-size: 13px; color: #666;">
                Выберите: Склад → Зона → Стеллаж → Полка → создайте Ячейку
            </div>
        </div>
        
        <div class="loc-row">
            <label>🏢 Склад *</label>
            <select id="cl_warehouse" class="input" onchange="loadLocationParents()">${warehouseOptions}</select>
        </div>
        
        <div class="loc-row">
            <label>📍 Зона (опционально)</label>
            <select id="cl_zone" class="input" onchange="loadLocationParents()">
                <option value="">Без зоны</option>
            </select>
        </div>
        
        <div class="loc-row">
            <label>📚 Стеллаж *</label>
            <select id="cl_rack" class="input" onchange="loadLocationParents()">
                <option value="">Сначала выберите склад</option>
            </select>
        </div>
        
        <div class="loc-row">
            <label>📋 Полка *</label>
            <select id="cl_shelf" class="input">
                <option value="">Сначала выберите стеллаж</option>
            </select>
        </div>
        
        <hr style="margin: 16px 0; border: none; border-top: 1px solid #dfe3eb;">
        
        <div class="loc-row">
            <label>📦 Код ячейки *</label>
            <input id="cl_code" class="input" placeholder="01">
            <small class="muted">Пример: 01, 02, A1</small>
        </div>
        
        <div class="loc-row">
            <label>📦 Название ячейки</label>
            <input id="cl_name" class="input" placeholder="Ячейка 01">
        </div>
    `;

    Modal.open(modalHtml, {
        width: "500px",
        title: "📦 Создать ячейку",
        onOpen: async () => {
            window.loadLocationParents = async function() {
                const warehouseId = document.getElementById('cl_warehouse').value;
                const zoneId = document.getElementById('cl_zone').value;
                const rackId = document.getElementById('cl_rack').value;
                
                // Загружаем зоны
                if (warehouseId) {
                    try {
                        const token = localStorage.getItem("token");
                        const res = await fetch(`/api/locations/search?type=ZONE&warehouseId=${warehouseId}&page=0&size=100`, {
                            headers: { "Authorization": "Bearer " + token }
                        });
                        const zones = await res.json();
                        const zoneSelect = document.getElementById('cl_zone');
                        zoneSelect.innerHTML = '<option value="">Без зоны</option>' + 
                            (zones.content || []).map(z => `<option value="${z.id}">${z.name}</option>`).join('');
                    } catch (e) {
                        console.error("[loadZones] error:", e);
                    }
                }
                
                // Загружаем стеллажи
                if (warehouseId) {
                    try {
                        const token = localStorage.getItem("token");
                        const url = `/api/locations/search?type=RACK&warehouseId=${warehouseId}${zoneId ? '&parentId=' + zoneId : ''}&page=0&size=100`;
                        const res = await fetch(url, {
                            headers: { "Authorization": "Bearer " + token }
                        });
                        const racks = await res.json();
                        const rackSelect = document.getElementById('cl_rack');
                        rackSelect.innerHTML = '<option value="">Выберите стеллаж</option>' + 
                            (racks.content || []).map(r => `<option value="${r.id}">${r.name}</option>`).join('');
                    } catch (e) {
                        console.error("[loadRacks] error:", e);
                    }
                }
                
                // Загружаем полки
                if (rackId) {
                    try {
                        const token = localStorage.getItem("token");
                        const res = await fetch(`/api/locations/search?type=SHELF&parentId=${rackId}&page=0&size=100`, {
                            headers: { "Authorization": "Bearer " + token }
                        });
                        const shelves = await res.json();
                        const shelfSelect = document.getElementById('cl_shelf');
                        shelfSelect.innerHTML = '<option value="">Выберите полку</option>' + 
                            (shelves.content || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                    } catch (e) {
                        console.error("[loadShelves] error:", e);
                    }
                }
            };
        },
        onOk: async (data) => {
            console.log("[createLocation] data:", data);
            
            if (!data.cl_warehouse) {
                alertBox("error", "Выберите склад");
                return;
            }
            if (!data.cl_rack) {
                alertBox("error", "Выберите стеллаж");
                return;
            }
            if (!data.cl_shelf) {
                alertBox("error", "Выберите полку");
                return;
            }
            if (!data.cl_code) {
                alertBox("error", "Введите код ячейки");
                return;
            }
            
            // Формируем полный код: Зона-Стеллаж-Полка-Ячейка
            const zoneCode = data.cl_zone ? await getLocationCode(data.cl_zone) : '';
            const rackCode = await getLocationCode(data.cl_rack);
            const shelfCode = await getLocationCode(data.cl_shelf);
            const fullCode = `${zoneCode ? zoneCode + '-' : ''}${rackCode}-${shelfCode}-${data.cl_code.trim()}`;
            
            const name = data.cl_name?.trim() || `Ячейка ${data.cl_code.trim()}`;

            await api("POST", "/api/locations", {
                warehouseId: Number(data.cl_warehouse),
                parentId: Number(data.cl_shelf),
                code: fullCode,
                name: name,
                type: "BIN"
            });

            alertBox("success", `Ячейка "${fullCode}" создана`);
            await loadLocations();
        }
    });
    
    // Загружаем начальные данные
    setTimeout(() => {
        if (window.loadLocationParents) window.loadLocationParents();
    }, 100);
}

// Вспомогательная функция для получения кода локации
async function getLocationCode(id) {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/locations/${id}`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const loc = await res.json();
        return loc.code;
    } catch (e) {
        return '';
    }
}

async function loadLocations() {
    const tb = document.querySelector("#locationTable tbody");
    tb.innerHTML = `<tr><td colspan="6" class="muted">Загрузка...</td></tr>`;

    try {
        const search = document.getElementById("locationSearch")?.value || "";
        const warehouseId = document.getElementById("locationWarehouseFilter")?.value || "";
        const type = document.getElementById("locationTypeFilter")?.value || "BIN"; // По умолчанию ячейки
        
        const url = `/api/locations/search?name=${encodeURIComponent(search)}${warehouseId ? '&warehouseId=' + warehouseId : ''}${type ? '&type=' + type : ''}&page=0&size=200`;
        
        const page = await api("GET", url);
        const list = page.content || [];

        tb.innerHTML = "";
        if (list.length === 0) {
            tb.innerHTML = `<tr><td colspan="6" class="muted">Нет локаций ${search || warehouseId || type ? 'по заданным фильтрам' : ''}</td></tr>`;
            return;
        }

        list.forEach(loc => {
            const tr = document.createElement("tr");
            const typeIcon = loc.type === "ZONE" ? "📍" : loc.type === "RACK" ? "📚" : loc.type === "SHELF" ? "📋" : "📦";
            tr.innerHTML = `
                <td>${loc.id}</td>
                <td><strong>${loc.code}</strong></td>
                <td>${loc.name}</td>
                <td>${loc.warehouseName || "—"}</td>
                <td>${typeIcon} ${loc.type || "BIN"}</td>
                <td><button class="btn btn-sm btn-primary selectBtn" data-id="${loc.id}" data-name="${loc.code}">Выбрать</button></td>
            `;
            tb.appendChild(tr);
        });

        tb.querySelectorAll(".selectBtn").forEach(btn => {
            btn.onclick = () => {
                const location = { id: btn.dataset.id, name: btn.dataset.name };

                const aiInput = document.getElementById("ai_location");
                const aiLocationId = document.getElementById("ai_locationId");
                const commitInput = document.getElementById("commit_location");
                const commitLocationId = document.getElementById("commit_locationId");
                
                if (aiInput && aiLocationId) {
                    aiInput.value = location.name;
                    aiLocationId.value = location.id;
                }
                
                if (commitInput && commitLocationId) {
                    commitInput.value = location.name;
                    commitLocationId.value = location.id;
                }

                closeLocationSelect();
            };
        });
    } catch (e) {
        tb.innerHTML = `<tr><td colspan="6" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}
