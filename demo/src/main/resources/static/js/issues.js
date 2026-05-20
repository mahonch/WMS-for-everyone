console.log("[ISSUES] init...");

let issuesCache = [];
let currentIssue = null;
let warehousesCache = [];

// Для перемещения
let transferProducts = new Map();

/* ==================== INIT ==================== */

// Запускаем страницу при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    startPage();
});

/* ==================== START ==================== */

function startPage() {
    token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    document.getElementById("usernameLabel").textContent = localStorage.getItem("username") || "user";
    document.getElementById("logoutBtn").onclick = () => {
        localStorage.clear();
        window.location.href = "/index.html";
    };

    // Инициализируем алерты
    initAlerts();

    // Проверяем параметры URL для автоматического открытия модального окна
    const urlParams = new URLSearchParams(window.location.search);
    const fromLocation = urlParams.get('fromLocation');
    const warehouse = urlParams.get('warehouse');

    bindEvents();
    loadIssues();
    loadUserProfile();
}

/* ==================== ALERTS ==================== */

let alerts = null;
let toastContainer = null;

function initAlerts() {
    alerts = document.getElementById("alerts");
    toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toastContainer";
        toastContainer.className = "toast-container";
        document.body.appendChild(toastContainer);
    }
}

function showNotification(type, title, message) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "" : type === "error" ? "" : "";
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ""}
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    toastContainer.appendChild(toast);
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
    return `<span class="pill ${cls}">${s === "COMMITTED" ? " Проведён" : " Черновик"}</span>`;
};

const reasonLabels = {
    "DAMAGE": " Утиль",
    "SALE": " Продажа",
    "TRANSFER_OUT": " Перемещение"
};

/* ==================== API ==================== */

async function api(method, url, body) {
    try {
        // Получаем токен через AuthService (он обновит если нужно)
        const token = await AuthService.getToken();
        
        if (!token) {
            alertBox("error", "Сессия истекла. Пожалуйста, войдите снова.");
            window.location.href = "/index.html";
            throw new Error("No token");
        }
        
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

async function loadIssues() {
    const tb = document.querySelector("#issuesTable tbody");
    tb.innerHTML = `<tr><td colspan="7" class="muted">Загрузка...</td></tr>`;

    try {
        const page = await api("GET", "/api/issues?page=0&size=200");
        issuesCache = page.content || [];
        renderTable();
    } catch (e) {
        tb.innerHTML = `<tr><td colspan="7" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

function renderTable() {
    const tb = document.querySelector("#issuesTable tbody");
    const q = (document.getElementById("filterInput").value || "").toLowerCase();
    tb.innerHTML = "";

    const filtered = issuesCache.filter(i => !q || (i.number && i.number.toLowerCase().includes(q)));

    if (filtered.length === 0) {
        tb.innerHTML = `<tr><td colspan="7" class="muted">Нет документов</td></tr>`;
        return;
    }

    for (const i of filtered) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${i.number}</strong></td>
            <td>${statusPill(i.status)}</td>
            <td>${reasonLabels[i.reasonCode] || "—"}</td>
            <td>—</td><td>—</td>
            <td>${fmtDate(i.createdAt)}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="openIssueDetail(${i.id})"></button></td>
        `;
        tb.appendChild(tr);
    }
}

async function loadWarehouses() {
    try {
        const page = await api("GET", "/api/warehouses?page=0&size=100");
        warehousesCache = page.content || [];

        console.log('[loadWarehouses] loaded:', warehousesCache.length);

        const userWarehouseId = localStorage.getItem('userWarehouseId');
        const userWarehouseName = localStorage.getItem('userWarehouseName');
        
        const options = '<option value="">Выберите склад</option>' +
            warehousesCache.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

        const transferWh = document.getElementById("transfer_fromWarehouse");
        const damageWh = document.getElementById("damage_warehouse");
        const saleWh = document.getElementById("sale_warehouse");

        if (transferWh) {
            transferWh.innerHTML = options;
            if (userWarehouseId) {
                transferWh.value = userWarehouseId;
                transferWh.disabled = true;
                transferWh.style.backgroundColor = '#e9ecef';
            }
        }
        if (damageWh) {
            damageWh.innerHTML = options;
            if (userWarehouseId) {
                damageWh.value = userWarehouseId;
                damageWh.disabled = true;
                damageWh.style.backgroundColor = '#e9ecef';
                // Триггерим событие change для загрузки локаций
                damageWh.dispatchEvent(new Event('change'));
            }
        }
        if (saleWh) {
            saleWh.innerHTML = options;
            if (userWarehouseId) {
                saleWh.value = userWarehouseId;
                saleWh.disabled = true;
                saleWh.style.backgroundColor = '#e9ecef';
                // Триггерим событие change для загрузки локаций
                saleWh.dispatchEvent(new Event('change'));
            }
        }

        console.log('[loadWarehouses] dropdowns updated, user warehouse:', userWarehouseId);

        return true;
    } catch (e) {
        console.error("[loadWarehouses] error:", e);
        return false;
    }
}

async function loadUserProfile() {
    try {
        const profile = await api("GET", "/api/profile");
        if (profile && profile.warehouseId) {
            // Сохраняем склад пользователя в localStorage
            localStorage.setItem('userWarehouseId', profile.warehouseId);
            localStorage.setItem('userWarehouseName', profile.warehouseName || '');
            console.log('[loadUserProfile] User warehouse:', profile.warehouseName);
        }
    } catch (e) {
        console.error('[loadUserProfile] error:', e);
    }
}

/* ==================== EVENTS ==================== */

function bindEvents() {
    document.getElementById("filterInput").addEventListener("input", renderTable);
    document.getElementById("btnCreate").onclick = window.openTypeSelect;
    document.getElementById("btnCloseDetail").onclick = window.closeDetail;
    document.getElementById("btnCommit").onclick = commitIssue;
    document.getElementById("btnDeleteDraft").onclick = deleteDraft;
}

/* ==================== TYPE SELECT ==================== */

window.openTypeSelect = function() {
    document.getElementById("typeSelectOverlay").classList.remove("hidden");
}

window.closeTypeSelect = function() {
    document.getElementById("typeSelectOverlay").classList.add("hidden");
}

window.selectIssueType = function(type) {
    closeTypeSelect();
    
    if (type === "TRANSFER_OUT") {
        openTransfer();
    } else if (type === "DAMAGE") {
        openDamage();
    } else if (type === "SALE") {
        openSale();
    }
}

/* ==================== TRANSFER ==================== */

window.openTransfer = function() {
    transferProducts.clear();
    document.getElementById("transfer_productsBody").innerHTML = 
        '<tr><td colspan="4" class="muted" style="padding: 2rem; text-align: center;">Выберите склад и локацию</td></tr>';
    
    // Проверяем что DOM элементы существуют
    const fromWh = document.getElementById("transfer_fromWarehouse");
    const toWh = document.getElementById("transfer_toWarehouse");
    
    if (!fromWh || !toWh) {
        console.error('[openTransfer] Warehouse selects not found!');
        return;
    }
    
    // Загружаем склады если ещё не загружены
    if (warehousesCache.length === 0) {
        loadWarehouses().then(() => {
            updateTransferWarehouseSelects();
        });
    } else {
        // Заполняем оба склада
        updateTransferWarehouseSelects();
    }
    
    document.getElementById("transferOverlay").classList.remove("hidden");
}

window.closeTransfer = function() {
    document.getElementById("transferOverlay").classList.add("hidden");
}

function updateTransferWarehouseSelects() {
    const userWarehouseId = localStorage.getItem('userWarehouseId');
    const userWarehouseName = localStorage.getItem('userWarehouseName');
    
    const options = '<option value="">Выберите склад</option>' +
        warehousesCache.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

    const fromWh = document.getElementById("transfer_fromWarehouse");
    const toWh = document.getElementById("transfer_toWarehouse");

    if (fromWh) {
        fromWh.innerHTML = options;
        // Автоматически устанавливаем склад "ОТКУДА" из профиля пользователя
        if (userWarehouseId) {
            fromWh.value = userWarehouseId;
            // Блокируем изменение (только для чтения)
            fromWh.disabled = true;
            fromWh.style.backgroundColor = '#e9ecef';
            fromWh.title = 'Склад берётся из вашего профиля';
        }
        console.log('[updateTransferWarehouseSelects] fromWarehouse updated:', warehousesCache.length, 'user warehouse:', userWarehouseId);
    }
    if (toWh) {
        toWh.innerHTML = options;
        console.log('[updateTransferWarehouseSelects] toWarehouse updated:', warehousesCache.length);
    }
}

window.onTransferFromWarehouseChange = function() {
    document.getElementById("transfer_fromLocation").value = "";
    document.getElementById("transfer_fromLocationId").value = "";
    document.getElementById("transfer_productsBody").innerHTML = 
        '<tr><td colspan="4" class="muted" style="padding: 2rem; text-align: center;">Выберите локацию</td></tr>';
    transferProducts.clear();
    updateTransferSummary();
}

window.onTransferToWarehouseChange = function() {
    document.getElementById("transfer_toLocation").value = "";
    document.getElementById("transfer_toLocationId").value = "";
}

window.openTransferLocationExplorer = function(type) {
    const warehouseId = type === 'from'
        ? document.getElementById("transfer_fromWarehouse").value
        : document.getElementById("transfer_toWarehouse").value;

    if (!warehouseId) {
        alertBox("error", "Сначала выберите склад");
        return;
    }

    LocationExplorer.open((location) => {
        if (type === 'from') {
            document.getElementById("transfer_fromLocation").value = `${location.code} — ${location.name}`;
            document.getElementById("transfer_fromLocationId").value = location.id;
            loadTransferProducts(location.id);
        } else {
            document.getElementById("transfer_toLocation").value = `${location.code} — ${location.name}`;
            document.getElementById("transfer_toLocationId").value = location.id;
        }
    }, warehouseId);
}

async function loadTransferProducts(locationId) {
    const tbody = document.getElementById("transfer_productsBody");
    tbody.innerHTML = '<tr><td colspan="4" class="muted" style="padding: 2rem; text-align: center;">Загрузка...</td></tr>';
    
    try {
        const stocks = await api("GET", `/api/stocks?locationId=${locationId}`);
        const availableStocks = stocks.filter(s => s.qty > 0);
        
        if (availableStocks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="muted" style="padding: 2rem; text-align: center;"> Нет товаров</td></tr>';
            return;
        }
        
        tbody.innerHTML = "";
        availableStocks.forEach(s => {
            const selected = transferProducts.get(s.productId);
            const qty = selected ? selected.qty : 0;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <strong>${s.productName || "Товар #" + s.productId}</strong><br>
                    <span class="muted" style="font-size: 12px;">SKU: ${s.sku || "—"}</span>
                </td>
                <td>${s.qty} шт.</td>
                <td>
                    <input type="number" min="0" max="${s.qty}" value="${qty}" 
                           onchange="setTransferQty(${s.productId}, this.value, '${s.productName || "Товар"}', ${s.qty})"
                           class="input" style="width: 80px; text-align: center;">
                </td>
                <td>${s.qty - qty} шт.</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

window.setTransferQty = function(productId, qty, productName, maxQty) {
    qty = parseInt(qty) || 0;
    if (qty > 0) {
        transferProducts.set(productId, { qty, name: productName, maxQty });
    } else {
        transferProducts.delete(productId);
    }
    updateTransferSummary();
}

function updateTransferSummary() {
    const count = Array.from(transferProducts.values()).reduce((sum, p) => sum + p.qty, 0);
    document.getElementById("transfer_selectedCount").textContent = count;
}

window.createTransfer = async function() {
    const fromWarehouseId = document.getElementById("transfer_fromWarehouse").value;
    const toWarehouseId = document.getElementById("transfer_toWarehouse").value;
    const fromLocationId = document.getElementById("transfer_fromLocationId").value;
    const toLocationId = document.getElementById("transfer_toLocationId").value;
    
    // Валидация
    if (!fromWarehouseId) { alertBox("error", "Выберите склад отправления"); return; }
    if (!toWarehouseId) { alertBox("error", "Выберите склад назначения"); return; }
    if (fromWarehouseId === toWarehouseId) { alertBox("error", "Склады должны быть разными"); return; }
    if (!fromLocationId) { alertBox("error", "Выберите локацию отправления"); return; }
    if (!toLocationId) { alertBox("error", "Выберите локацию назначения"); return; }
    if (transferProducts.size === 0) { alertBox("error", "Добавьте товары"); return; }
    
    const items = Array.from(transferProducts.entries()).map(([productId, data]) => ({
        productId,
        qty: data.qty,
        locationId: Number(locationId)
    }));
    
    try {
        // Создаём ТОЛЬКО черновик списания
        // Приёмка будет создана автоматически при проведении
        const issue = await api("POST", "/api/issues", {
            createdById: Number(localStorage.getItem("userId") || 1),
            reason: `Перемещение в склад ${toWarehouseId}`,
            reasonCode: "TRANSFER_OUT",
            items: items,
            // Сохраняем информацию о складе назначения для автоматического создания приёмки
            targetWarehouseId: toWarehouseId,
            targetLocationId: toLocationId
        });
        
        alertBox("success", `Черновик перемещения ${issue.number} создан. Проведите его для создания приёмки.`);
        closeTransfer();
        await loadIssues();
    } catch (e) {
        console.error("[createTransfer] error:", e);
    }
}

/* ==================== DAMAGE ==================== */

window.openDamage = function() {
    transferProducts.clear();
    document.getElementById("damage_productsBody").innerHTML =
        '<tr><td colspan="4" class="muted" style="padding: 2rem; text-align: center;">Выберите локацию</td></tr>';

    if (warehousesCache.length === 0) {
        loadWarehouses();
    }

    document.getElementById("damageOverlay").classList.remove("hidden");
}

// Открытие утиля с предустановленной локацией (из LocationView)
window.openDamageWithLocation = function(locationId, warehouseId) {
    // Находим склад в кэше
    const warehouse = warehousesCache.find(w => w.id == warehouseId);
    if (!warehouse) {
        console.error('Warehouse not found:', warehouseId);
        return;
    }
    
    // Устанавливаем склад
    document.getElementById("damage_warehouse").value = warehouseId;
    
    // Загружаем товары из локации
    loadDamageProducts(locationId);
    
    // Открываем модальное окно
    document.getElementById("damageOverlay").classList.remove("hidden");
}

window.closeDamage = function() {
    document.getElementById("damageOverlay").classList.add("hidden");
}

window.onDamageWarehouseChange = function() {
    // Не сбрасываем локацию если она уже установлена (пришли из LocationView)
    const currentLocationId = document.getElementById("damage_locationId").value;
    if (currentLocationId) {
        // Просто перезагружаем товары для нового склада
        loadDamageProducts(currentLocationId);
        return;
    }
    
    document.getElementById("damage_location").value = "";
    document.getElementById("damage_locationId").value = "";
    document.getElementById("damage_productsBody").innerHTML =
        '<tr><td colspan="4" class="muted" style="padding: 2rem; text-align: center;">Выберите локацию</td></tr>';
    transferProducts.clear();
    updateDamageSummary();
}

// Открытие Location Explorer для утиля с передачей warehouseId
window.openDamageLocationExplorer = function() {
    const warehouseId = document.getElementById("damage_warehouse").value;
    
    if (!warehouseId) {
        alertBox("error", "Сначала выберите склад");
        return;
    }
    
    LocationExplorer.open((location) => {
        document.getElementById("damage_location").value = `${location.code} — ${location.name}`;
        document.getElementById("damage_locationId").value = location.id;
        loadDamageProducts(location.id);
    }, warehouseId);
}

async function loadDamageProducts(locationId) {
    const tbody = document.getElementById("damage_productsBody");
    tbody.innerHTML = '<tr><td colspan="4" class="muted" style="padding: 2rem; text-align: center;">Загрузка...</td></tr>';
    
    try {
        const stocks = await api("GET", `/api/stocks?locationId=${locationId}`);
        const availableStocks = stocks.filter(s => s.qty > 0);
        
        if (availableStocks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="muted" style="padding: 2rem; text-align: center;"> Нет товаров</td></tr>';
            return;
        }
        
        tbody.innerHTML = "";
        availableStocks.forEach(s => {
            const selected = transferProducts.get(s.productId);
            const qty = selected ? selected.qty : 0;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <strong>${s.productName || "Товар #" + s.productId}</strong><br>
                    <span class="muted" style="font-size: 12px;">SKU: ${s.sku || "—"}</span>
                </td>
                <td>${s.qty} шт.</td>
                <td>
                    <input type="number" min="0" max="${s.qty}" value="${qty}" 
                           onchange="setDamageQty(${s.productId}, this.value, '${s.productName || "Товар"}', ${s.qty})"
                           class="input" style="width: 80px; text-align: center;">
                </td>
                <td>
                    <select class="input" style="width: 100px;" onchange="setDamageReason(${s.productId}, this.value)">
                        <option value="Брак">Брак</option>
                        <option value="Истёк">Истёк</option>
                        <option value="Бой">Бой</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

window.setDamageQty = function(productId, qty, productName, maxQty) {
    qty = parseInt(qty) || 0;
    if (qty > 0) {
        transferProducts.set(productId, { qty, name: productName, maxQty, reason: "Брак" });
    } else {
        transferProducts.delete(productId);
    }
    updateDamageSummary();
}

window.setDamageReason = function(productId, reason) {
    const p = transferProducts.get(productId);
    if (p) {
        p.reason = reason;
        transferProducts.set(productId, p);
    }
}

function updateDamageSummary() {
    const count = Array.from(transferProducts.values()).reduce((sum, p) => sum + p.qty, 0);
    document.getElementById("damage_selectedCount").textContent = count;
}

window.createDamage = async function() {
    const warehouseId = document.getElementById("damage_warehouse").value;
    const locationId = document.getElementById("damage_locationId").value;
    const reason = document.getElementById("damage_reason").value;
    
    if (!warehouseId) { alertBox("error", "Выберите склад"); return; }
    if (!locationId) { alertBox("error", "Выберите локацию"); return; }
    if (transferProducts.size === 0) { alertBox("error", "Добавьте товары"); return; }
    
    const items = Array.from(transferProducts.entries()).map(([productId, data]) => ({
        productId,
        qty: data.qty
    }));
    
    try {
        const issue = await api("POST", "/api/issues", {
            createdById: Number(localStorage.getItem("userId") || 1),
            reason: reason,
            reasonCode: "DAMAGE",
            items: items
        });
        
        alertBox("success", `Списание ${issue.number} создано`);
        closeDamage();
        await loadIssues();
    } catch (e) {
        console.error("[createDamage] error:", e);
    }
}

/* ==================== SALE ==================== */

window.openSale = function() {
    transferProducts.clear();
    document.getElementById("sale_productsBody").innerHTML = 
        '<tr><td colspan="5" class="muted" style="padding: 2rem; text-align: center;">Выберите локацию</td></tr>';
    
    if (warehousesCache.length === 0) {
        loadWarehouses();
    }
    
    document.getElementById("saleOverlay").classList.remove("hidden");
}

window.closeSale = function() {
    document.getElementById("saleOverlay").classList.add("hidden");
}

window.onSaleWarehouseChange = function() {
    document.getElementById("sale_location").value = "";
    document.getElementById("sale_locationId").value = "";
    document.getElementById("sale_productsBody").innerHTML =
        '<tr><td colspan="5" class="muted" style="padding: 2rem; text-align: center;">Выберите локацию</td></tr>';
    transferProducts.clear();
    updateSaleSummary();
}

// Открытие Location Explorer для продажи с передачей warehouseId
window.openSaleLocationExplorer = function() {
    const warehouseId = document.getElementById("sale_warehouse").value;
    
    if (!warehouseId) {
        alertBox("error", "Сначала выберите склад");
        return;
    }
    
    LocationExplorer.open((location) => {
        document.getElementById("sale_location").value = `${location.code} — ${location.name}`;
        document.getElementById("sale_locationId").value = location.id;
        loadSaleProducts(location.id);
    }, warehouseId);
}

async function loadSaleProducts(locationId) {
    const tbody = document.getElementById("sale_productsBody");
    tbody.innerHTML = '<tr><td colspan="5" class="muted" style="padding: 2rem; text-align: center;">Загрузка...</td></tr>';
    
    try {
        const stocks = await api("GET", `/api/stocks?locationId=${locationId}`);
        const availableStocks = stocks.filter(s => s.qty > 0);
        
        if (availableStocks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="muted" style="padding: 2rem; text-align: center;"> Нет товаров</td></tr>';
            return;
        }
        
        tbody.innerHTML = "";
        availableStocks.forEach(s => {
            const selected = transferProducts.get(s.productId);
            const qty = selected ? selected.qty : 0;
            const price = s.costPrice || 0;
            const sum = qty * price;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <strong>${s.productName || "Товар #" + s.productId}</strong><br>
                    <span class="muted" style="font-size: 12px;">SKU: ${s.sku || "—"}</span>
                </td>
                <td>${s.qty} шт.</td>
                <td>
                    <input type="number" min="0" max="${s.qty}" value="${qty}" 
                           onchange="setSaleQty(${s.productId}, this.value, '${s.productName || "Товар"}', ${s.qty}, ${price})"
                           class="input" style="width: 80px; text-align: center;">
                </td>
                <td>${fmtMoney(price)}</td>
                <td><strong>${fmtMoney(sum)}</strong></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

window.setSaleQty = function(productId, qty, productName, maxQty, price) {
    qty = parseInt(qty) || 0;
    if (qty > 0) {
        transferProducts.set(productId, { qty, name: productName, maxQty, price });
    } else {
        transferProducts.delete(productId);
    }
    updateSaleSummary();
}

function updateSaleSummary() {
    const count = Array.from(transferProducts.values()).reduce((sum, p) => sum + p.qty, 0);
    const total = Array.from(transferProducts.values()).reduce((sum, p) => sum + (p.qty * (p.price || 0)), 0);
    
    document.getElementById("sale_selectedCount").textContent = count;
    document.getElementById("sale_totalSum").textContent = fmtMoney(total);
}

window.createSale = async function() {
    const warehouseId = document.getElementById("sale_warehouse").value;
    const locationId = document.getElementById("sale_locationId").value;
    
    if (!warehouseId) { alertBox("error", "Выберите склад"); return; }
    if (!locationId) { alertBox("error", "Выберите локацию"); return; }
    if (transferProducts.size === 0) { alertBox("error", "Добавьте товары"); return; }
    
    const items = Array.from(transferProducts.entries()).map(([productId, data]) => ({
        productId,
        qty: data.qty
    }));
    
    try {
        const issue = await api("POST", "/api/issues", {
            createdById: Number(localStorage.getItem("userId") || 1),
            reason: "Продажа",
            reasonCode: "SALE",
            items: items
        });

        await api("POST", "/api/issues/" + issue.id + "/commit", {
            fromLocationId: Number(locationId),
            reasonCode: "SALE"
        });
        
        alertBox("success", `Продажа ${issue.number} проведена. Задача сборки создана.`);
        closeSale();
        await loadIssues();
    } catch (e) {
        console.error("[createSale] error:", e);
    }
}

/* ==================== DETAIL ==================== */

window.openIssueDetail = async function(id) {
    try {
        console.log('[openIssueDetail] Loading issue:', id);
        const issue = await api("GET", `/api/issues/${id}`);
        console.log('[openIssueDetail] Issue loaded:', issue);
        currentIssue = issue;

        document.getElementById("d_number").textContent = issue.number;
        document.getElementById("d_id").textContent = issue.id;
        document.getElementById("d_status").innerHTML = statusPill(issue.status);
        document.getElementById("d_number").textContent = issue.number;
        document.getElementById("d_id").textContent = issue.id;
        document.getElementById("d_status").innerHTML = statusPill(issue.status);
        document.getElementById("d_reasonCode").textContent = reasonLabels[issue.reasonCode] || "-";
        document.getElementById("d_date").textContent = fmtDate(issue.createdAt);
        document.getElementById("d_targetWh").textContent = issue.targetWarehouseName || "-";
        document.getElementById("d_targetLoc").textContent = issue.targetLocationCode || "-";
        document.getElementById("d_reason").textContent = issue.reason || "-";
        document.getElementById("d_comment").textContent = issue.comment || "-"; const tb = document.querySelector("#detailItemsTable tbody");
        tb.innerHTML = "";

        if (issue.items && issue.items.length > 0) {
            issue.items.forEach(item => {
                const tr = document.createElement("tr");
                const sum = (item.qty * (item.costPrice || 0));
                tr.innerHTML = `
                    <td>Товар #${item.productId}</td>
                    <td>${item.qty}</td>
                    <td>${fmtMoney(item.costPrice || 0)}</td>
                    <td><strong>${fmtMoney(sum)}</strong></td>
                `;
                tb.appendChild(tr);
            });
        } else {
            tb.innerHTML = '<tr><td colspan="4" class="muted">Нет позиций</td></tr>';
        }

        const isDraft = issue.status === "DRAFT";
        document.getElementById("btnDeleteDraft").style.display = isDraft ? "" : "none";
        document.getElementById("btnCommit").style.display = isDraft ? "" : "none";

        document.getElementById("detailOverlay").classList.remove("hidden");

    } catch (e) {
        console.error('[openIssueDetail] Error:', e);
        alertBox("error", "Не удалось загрузить документ: " + e.message);
    }
}

window.closeDetail = function() {
    document.getElementById("detailOverlay").classList.add("hidden");
    currentIssue = null;
}

async function deleteDraft() {
    if (!currentIssue || currentIssue.status !== "DRAFT") {
        alertBox("error", "Удалять можно только черновик");
        return;
    }
    if (!confirm("Удалить документ?")) return;
    
    try {
        await api("DELETE", `/api/issues/${currentIssue.id}`);
        alertBox("success", "Списание удалено");
        closeDetail();
        await loadIssues();
    } catch (e) {
        console.error("[deleteDraft] error:", e);
    }
}

async function commitIssue() {
    if (!currentIssue || currentIssue.status !== "DRAFT") { 
        alertBox("error", "Документ уже проведён"); 
        return; 
    }
    
    if (currentIssue.reasonCode === "TRANSFER_OUT") {
        const toWh = currentIssue.targetWarehouseId; 
        const toLoc = currentIssue.targetLocationId;
        
        if (!toWh || !toLoc) { 
            alertBox("error", "Не указан склад/локация назначения"); 
            return; 
        }
        
        // Находим локацию источника из первой позиции
        const item = currentIssue.items[0];
        const stocks = await api("GET", "/api/stocks?productId=" + item.productId);
        const stock = stocks.find(s => s.qty > 0); 
        const fromLoc = stock ? stock.locationId : null;
        
        if (!fromLoc) { 
            alertBox("error", "Локация источника не найдена"); 
            return; 
        }
        
        // Проводим списание - приёмка будет создана автоматически
        await api("POST", "/api/issues/" + currentIssue.id + "/commit", {
            fromLocationId: fromLoc, 
            targetWarehouseId: toWh, 
            targetLocationId: toLoc, 
            reasonCode: "TRANSFER_OUT"
        });
        
        alertBox("success", "Перемещение проведено: " + currentIssue.number + ". Создана приёмка.");
        closeDetail(); 
        loadIssues();
        
    } else {
        // Обычное списание (утиль/продажа)
        const item = currentIssue.items[0]; 
        const stocks = await api("GET", "/api/stocks?productId=" + item.productId);
        const stock = stocks.find(s => s.qty > 0); 
        const fromLoc = stock ? stock.locationId : null;
        
        if (!fromLoc) { 
            alertBox("error", "Локация не найдена"); 
            return; 
        }
        
        await api("POST", "/api/issues/" + currentIssue.id + "/commit", {
            fromLocationId: fromLoc, 
            reasonCode: currentIssue.reasonCode
        });
        
        alertBox("success", "Списание проведено");
        closeDetail();
        loadIssues();
    }
}
