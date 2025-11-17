import { Modal } from "./modal.js";

console.log("[LOCATIONS] init...");

/* ----------------------- AUTH ----------------------- */

debugAuthContext("LOCATIONS_PAGE").then(() => startPage());

let token = null;
let currentLoc = null;

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
    loadLocations();
}

/* ----------------------- ALERTS ----------------------- */

const alerts = document.getElementById("alerts");

function alertBox(type, text) {
    const div = document.createElement("div");
    div.className = `alert ${type}`;
    div.textContent = text;
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

/* ----------------------- API ----------------------- */

async function api(method, url, body) {
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
        throw new Error(msg);
    }
    return json;
}

/* ----------------------- LOAD LIST ----------------------- */

async function loadLocations() {
    const grid = document.getElementById("locGrid");
    grid.innerHTML = `<div class="muted" style="padding:1rem;">Загрузка...</div>`;

    const list = await api("GET", "/api/locations");

    grid.innerHTML = "";

    for (const loc of list) {
        const card = document.createElement("div");
        card.className = "location-card";

        card.innerHTML = `
            <div class="loc-title">${loc.code}</div>
            <div class="loc-sub">${loc.name}</div>

            <div><b>SKU:</b> ${loc.totalProducts ?? 0}</div>
            <div><b>Кол-во:</b> ${loc.totalQty ?? 0}</div>
            <div><b>Сумма:</b> ${loc.totalValue ?? 0} ₽</div>

            <div class="loc-actions">
                <button class="btn btn-secondary" data-info="${loc.id}">ℹ️</button>
                <button class="btn btn-secondary" data-edit="${loc.id}">✏️</button>
                <button class="btn btn-danger" data-del="${loc.id}">🗑️</button>
            </div>
        `;

        grid.appendChild(card);
    }
}

/* ----------------------- EVENTS ----------------------- */

function bindEvents() {

    document.getElementById("btnCreate").onclick = createLocation;

    document.getElementById("locGrid").onclick = e => {
        const btn = e.target;

        if (btn.dataset.info) return openInfo(btn.dataset.info);
        if (btn.dataset.edit) return editLocation(btn.dataset.edit);
        if (btn.dataset.del) return deleteLocation(btn.dataset.del);
    };

    document.getElementById("btnCloseDetail").onclick = hideDetail;
    document.getElementById("detailOverlay").onclick = e => {
        if (e.target.id === "detailOverlay") hideDetail();
    };
}

/* ----------------------- CREATE ----------------------- */

function createLocation() {
    Modal.open(`
        <label>Код</label>
        <input name="code">

        <label>Название</label>
        <input name="name">
    `, {
        width: "400px",
        onOk: async d => {
            if (!d.code || !d.name)
                return alertBox("error", "Заполните все поля");

            await api("POST", "/api/locations", d);
            alertBox("info", "Создан склад");
            loadLocations();
        }
    });
}

/* ----------------------- EDIT ----------------------- */

async function editLocation(id) {
    const loc = await api("GET", `/api/locations/${id}`);

    Modal.open(`
        <label>Код</label>
        <input name="code" value="${loc.code}">

        <label>Название</label>
        <input name="name" value="${loc.name}">
    `, {
        width: "400px",
        onOk: async d => {
            await api("PUT", `/api/locations/${id}`, d);
            alertBox("info", "Обновлено");
            loadLocations();
        }
    });
}

/* ----------------------- DELETE ----------------------- */

async function deleteLocation(id) {
    if (!confirm("Удалить склад?")) return;

    await api("DELETE", `/api/locations/${id}`);
    alertBox("info", "Удалено");
    loadLocations();
}

/* ----------------------- DETAIL MODAL ----------------------- */

async function openInfo(id) {
    const r = await api("GET", `/api/locations/${id}`);
    currentLoc = r;

    const ov = document.getElementById("detailOverlay");
    ov.classList.remove("hidden");

    document.getElementById("d_id").textContent = r.id;
    document.getElementById("d_code").textContent = r.code;
    document.getElementById("d_code2").textContent = r.code;
    document.getElementById("d_name").textContent = r.name;

    document.getElementById("d_sku").textContent = r.totalProducts ?? 0;
    document.getElementById("d_qty").textContent = r.totalQty ?? 0;
    document.getElementById("d_value").textContent = r.totalValue ?? 0;

    document.getElementById("btnReceipt").onclick =
        () => window.location.href = `/pages/receipts.html?to=${id}`;
    document.getElementById("btnIssue").onclick =
        () => window.location.href = `/pages/issues.html?from=${id}`;
    document.getElementById("btnTransferFrom").onclick =
        () => window.location.href = `/pages/transfers.html?from=${id}`;
    document.getElementById("btnTransferTo").onclick =
        () => window.location.href = `/pages/transfers.html?to=${id}`;
}

function hideDetail() {
    document.getElementById("detailOverlay").classList.add("hidden");
}
