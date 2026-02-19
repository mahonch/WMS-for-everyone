console.log("[WAREHOUSES] init...");

debugAuthContext("WAREHOUSES_PAGE").then(() => startPage());

let token = null;
let warehousesCache = [];
let currentWarehouse = null;

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
    loadWarehouses();
}

/* ==================== ALERTS ==================== */

const alerts = document.getElementById("alerts");

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
const statusPill = (s) => {
    const cls = s ? "pill-committed" : "pill-draft";
    const label = s ? "✅ Активен" : "❌ Неактивен";
    return `<span class="pill ${cls}">${label}</span>`;
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
            const msg = json?.message || json?.error || ("Ошибка " + res.status);
            alertBox("error", msg);
            throw new Error(msg);
        }
        return json;
    } catch (e) {
        if (!e.message.includes("API")) {
            alertBox("error", e.message);
        }
        throw e;
    }
}

/* ==================== LOAD WAREHOUSES ==================== */

async function loadWarehouses() {
    const tb = document.querySelector("#warehousesTable tbody");
    tb.innerHTML = `<tr><td colspan="7" class="muted">Загрузка...</td></tr>`;

    try {
        const page = await api("GET", "/api/warehouses?page=0&size=200");
        warehousesCache = page.content || [];
        renderTable();
    } catch (e) {
        tb.innerHTML = `<tr><td colspan="7" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

async function renderTable() {
    const tb = document.querySelector("#warehousesTable tbody");
    const q = (document.getElementById("filterInput").value || "").toLowerCase();
    const status = document.getElementById("statusFilter").value;
    
    tb.innerHTML = "";

    const filtered = warehousesCache.filter(w => {
        const matchSearch = !q || 
            (w.name && w.name.toLowerCase().includes(q)) ||
            (w.code && w.code.toLowerCase().includes(q)) ||
            (w.address && w.address.toLowerCase().includes(q));
        
        const matchStatus = status === "" || 
            (status === "true" && w.isActive) ||
            (status === "false" && !w.isActive);
        
        return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
        tb.innerHTML = `<tr><td colspan="7" class="muted">Нет складов ${q || status ? 'по заданным фильтрам' : ''}</td></tr>`;
        return;
    }

    for (const w of filtered) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${w.id}</td>
            <td><strong>${w.name}</strong></td>
            <td>${w.code || "—"}</td>
            <td>${w.address || "—"}</td>
            <td>${statusPill(w.isActive)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openWarehouseDetail(${w.id})">👁 Просмотр</button>
            </td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="openEditWarehouse(${w.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWarehouse(${w.id})">🗑️</button>
            </td>
        `;
        tb.appendChild(tr);
    }
}

/* ==================== EVENTS ==================== */

function bindEvents() {
    document.getElementById("filterInput").addEventListener("input", renderTable);
    document.getElementById("statusFilter").addEventListener("change", renderTable);
    document.getElementById("btnCreate").onclick = openCreateWarehouse;
    document.getElementById("btnCloseModal").onclick = closeModal;
    document.getElementById("btnCloseDetail").onclick = closeDetail;
    document.getElementById("btnEditWarehouse").onclick = () => {
        if (currentWarehouse) openEditWarehouse(currentWarehouse.id);
    };
    document.getElementById("btnDeleteWarehouse").onclick = () => {
        if (currentWarehouse) deleteWarehouse(currentWarehouse.id);
    };
}

/* ==================== CREATE/EDIT WAREHOUSE ==================== */

async function openCreateWarehouse() {
    const modalBody = document.getElementById("modalBody");
    document.getElementById("modalTitle").textContent = "🏢 Новый склад";
    
    modalBody.innerHTML = `
        <div class="loc-row" style="margin-bottom: 12px;">
            <label>Название *</label>
            <input id="w_name" class="input" placeholder="Основной склад">
        </div>
        <div class="loc-row" style="margin-bottom: 12px;">
            <label>Код</label>
            <input id="w_code" class="input" placeholder="WH01">
        </div>
        <div class="loc-row" style="margin-bottom: 12px;">
            <label>Адрес</label>
            <input id="w_address" class="input" placeholder="г. Москва, ул. Складская 1">
        </div>
        <div class="loc-row" style="margin-bottom: 12px;">
            <label>
                <input type="checkbox" id="w_active" checked> Активен
            </label>
        </div>
        <div class="toolbar" style="justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
            <button class="btn btn-primary" onclick="saveWarehouse()">Сохранить</button>
        </div>
    `;
    
    document.getElementById("warehouseModalOverlay").classList.remove("hidden");
}

async function openEditWarehouse(id) {
    try {
        const w = await api("GET", `/api/warehouses/${id}`);
        currentWarehouse = w;
        
        const modalBody = document.getElementById("modalBody");
        document.getElementById("modalTitle").textContent = "✏️ Редактировать склад";
        
        modalBody.innerHTML = `
            <div class="loc-row" style="margin-bottom: 12px;">
                <label>Название *</label>
                <input id="w_name" class="input" value="${w.name || ''}">
            </div>
            <div class="loc-row" style="margin-bottom: 12px;">
                <label>Код</label>
                <input id="w_code" class="input" value="${w.code || ''}">
            </div>
            <div class="loc-row" style="margin-bottom: 12px;">
                <label>Адрес</label>
                <input id="w_address" class="input" value="${w.address || ''}">
            </div>
            <div class="loc-row" style="margin-bottom: 12px;">
                <label>
                    <input type="checkbox" id="w_active" ${w.isActive ? 'checked' : ''}> Активен
                </label>
            </div>
            <div class="toolbar" style="justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
                <button class="btn btn-primary" onclick="saveWarehouse(${w.id})">Сохранить</button>
            </div>
        `;
        
        document.getElementById("warehouseModalOverlay").classList.remove("hidden");
    } catch (e) {
        alertBox("error", "Не удалось загрузить склад");
    }
}

async function saveWarehouse(id) {
    const name = document.getElementById("w_name").value.trim();
    const code = document.getElementById("w_code").value.trim();
    const address = document.getElementById("w_address").value.trim();
    const isActive = document.getElementById("w_active").checked;
    
    if (!name) {
        alertBox("error", "Введите название");
        return;
    }
    
    try {
        if (id) {
            await api("PUT", `/api/warehouses/${id}`, {
                name,
                code: code || null,
                address: address || null,
                isActive
            });
            alertBox("success", "Склад обновлён");
        } else {
            await api("POST", "/api/warehouses", {
                name,
                code: code || null,
                address: address || null,
                isActive
            });
            alertBox("success", "Склад создан");
        }
        
        closeModal();
        await loadWarehouses();
    } catch (e) {
        // Ошибка уже показана
    }
}

function closeModal() {
    document.getElementById("warehouseModalOverlay").classList.add("hidden");
    currentWarehouse = null;
}

/* ==================== DETAIL ==================== */

async function openWarehouseDetail(id) {
    try {
        const w = await api("GET", `/api/warehouses/${id}`);
        currentWarehouse = w;
        
        document.getElementById("d_id").textContent = w.id;
        document.getElementById("d_name").textContent = w.name;
        document.getElementById("d_code").textContent = w.code || "—";
        document.getElementById("d_address").textContent = w.address || "—";
        document.getElementById("d_status").innerHTML = statusPill(w.isActive);
        
        document.getElementById("detailOverlay").classList.remove("hidden");
    } catch (e) {
        alertBox("error", "Не удалось загрузить склад");
    }
}

function closeDetail() {
    document.getElementById("detailOverlay").classList.add("hidden");
    currentWarehouse = null;
}

/* ==================== DELETE ==================== */

async function deleteWarehouse(id) {
    if (!confirm("Удалить склад? Все локации этого склада будут удалены!")) return;
    
    try {
        await api("DELETE", `/api/warehouses/${id}`);
        alertBox("success", "Склад удалён");
        
        if (document.getElementById("detailOverlay").classList.contains("modal-overlay") === false || 
            !document.getElementById("detailOverlay").classList.contains("hidden")) {
            closeDetail();
        }
        
        await loadWarehouses();
    } catch (e) {
        // Ошибка уже показана
    }
}

// Глобальные функции для HTML
window.openWarehouseDetail = function(id) {
    window.location.href = `/pages/warehouse-detail.html?id=${id}`;
};
window.openEditWarehouse = openEditWarehouse;
window.deleteWarehouse = deleteWarehouse;
