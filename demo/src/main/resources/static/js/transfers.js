console.log('[TRANSFERS] init...');

let token = null;
let transfersCache = [];

document.addEventListener('DOMContentLoaded', startPage);

function startPage() {
    token = localStorage.getItem("token");
    if (!token) return (window.location.href = "/index.html");

    document.getElementById("usernameLabel").textContent = localStorage.getItem("username") || "user";
    document.getElementById("logoutBtn").onclick = () => {
        localStorage.clear();
        window.location.href = "/index.html";
    };

    document.getElementById("filterInput").addEventListener("input", renderTable);
    document.getElementById("btnCreate").onclick = () => TransferForm.open();
    loadTransfers();
}

function showNotification(type, text) {
    const alerts = document.getElementById("alerts");
    if (!alerts) return;
    const div = document.createElement("div");
    div.textContent = text;
    div.style.cssText = 'padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; font-size: 14px;';
    if (type === 'success') { div.style.background = '#d4edda'; div.style.color = '#155724'; }
    if (type === 'error') { div.style.background = '#f8d7da'; div.style.color = '#721c24'; }
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

const fmtDate = (d) => d ? new Date(d).toLocaleString("ru-RU") : "—";

const statusPill = (s) => {
    const cls = s === "COMMITTED" ? "pill-committed" : "pill-draft";
    return `<span class="pill ${cls}">${s === "COMMITTED" ? "Проведён" : "Черновик"}</span>`;
};

async function api(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    let json = null;
    try { json = await res.json(); } catch {}
    if (!res.ok) {
        const msg = json?.message || json?.error || ("Ошибка " + res.status);
        showNotification("error", msg);
        throw new Error(msg);
    }
    return json;
}

async function loadTransfers() {
    const tb = document.querySelector("#transfersTable tbody");
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#999;">Загрузка...</td></tr>`;
    try {
        const list = await api("GET", "/api/transfers");
        transfersCache = Array.isArray(list) ? list : [];
        renderTable();
    } catch (e) {
        tb.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Ошибка: ${e.message}</td></tr>`;
    }
}

function renderTable() {
    const tb = document.querySelector("#transfersTable tbody");
    const q = (document.getElementById("filterInput").value || "").toLowerCase();
    tb.innerHTML = "";

    const filtered = transfersCache.filter(t => !q || (t.number || '').toLowerCase().includes(q));

    if (filtered.length === 0) {
        tb.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#999;">${transfersCache.length === 0 ? 'Нет перемещений' : 'Не найдено'}</td></tr>`;
        return;
    }

    for (const t of filtered) {
        const tr = document.createElement("tr");
        tr.style.cursor = 'pointer';
        tr.onclick = () => TransferForm.open(t.id);
        const itemsCount = t.items ? t.items.length : 0;
        tr.innerHTML = `
            <td><strong>${t.number || '#' + t.id}</strong></td>
            <td>${statusPill(t.status)}</td>
            <td>${t.fromWarehouseName || '—'}<br><small style="color:#999;">${t.fromLocationCode || '—'}</small></td>
            <td>${t.toWarehouseName || '—'}<br><small style="color:#999;">${t.toLocationCode || '—'}</small></td>
            <td>${fmtDate(t.createdAt)}</td>
            <td>${itemsCount}</td>
            <td></td>
        `;
        tb.appendChild(tr);
    }
}

// Expose for inline scripts
window.TransfersPage = { refresh: loadTransfers };
window.fmtDate = fmtDate;
window.alertBox = showNotification;
