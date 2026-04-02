console.log('[TRANSFERS] init...');

let token = null;
let transfersCache = [];

/* ==================== INIT ==================== */

document.addEventListener('DOMContentLoaded', function() {
    startPage();
});

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
    loadTransfers();
}

/* ==================== ALERTS ==================== */

const alerts = document.getElementById("alerts");
let toastContainer = document.getElementById("toastContainer");
if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "toast-container";
    if (document.body) document.body.appendChild(toastContainer);
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
    if (toastContainer) toastContainer.appendChild(toast);
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

const statusPill = (s) => {
    const cls = s === "COMMITTED" ? "pill-committed" : "pill-draft";
    return `<span class="pill ${cls}">${s === "COMMITTED" ? " Проведён" : " Черновик"}</span>`;
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

async function loadTransfers() {
    const tb = document.querySelector("#transfersTable tbody");
    tb.innerHTML = `<tr><td colspan="7" class="muted">Загрузка...</td></tr>`;

    try {
        const page = await api("GET", "/api/transfers?page=0&size=200");
        transfersCache = page.content || [];
        renderTable();
    } catch (e) {
        tb.innerHTML = `<tr><td colspan="7" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

function renderTable() {
    const tb = document.querySelector("#transfersTable tbody");
    const q = (document.getElementById("filterInput").value || "").toLowerCase();
    tb.innerHTML = "";

    const filtered = transfersCache.filter(t => {
        if (!q) return true;
        return t.number && t.number.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
        tb.innerHTML = `<tr><td colspan="7" class="muted">${transfersCache.length === 0 ? 'Нет перемещений' : 'Документы не найдены'}</td></tr>`;
        return;
    }

    for (const t of filtered) {
        const tr = document.createElement("tr");
        const itemsCount = t.items ? t.items.length : 0;
        tr.innerHTML = `
            <td><strong>${t.number}</strong></td>
            <td>${statusPill(t.status)}</td>
            <td>${t.fromWarehouseName || ''} <br><small class="muted">${t.fromLocationCode || '—'}</small></td>
            <td>${t.toWarehouseName || ''} <br><small class="muted">${t.toLocationCode || '—'}</small></td>
            <td>${fmtDate(t.createdAt)}</td>
            <td>${itemsCount}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="TransferForm.open(${t.id})"></button></td>
        `;
        tb.appendChild(tr);
    }
}

/* ==================== EVENTS ==================== */

function bindEvents() {
    const filterInput = document.getElementById("filterInput");
    const btnCreate = document.getElementById("btnCreate");
    
    if (filterInput) {
        filterInput.addEventListener("input", renderTable);
    }
    if (btnCreate) {
        btnCreate.onclick = () => TransferForm.open();
    }
}

/* ==================== PAGE FUNCTIONS ==================== */

window.TransfersPage = {
    refresh() {
        loadTransfers();
    }
};

// Helper functions for formatting
window.fmtDate = fmtDate;
window.alertBox = alertBox;
