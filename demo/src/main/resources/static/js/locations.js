/* =======================
   LOCATIONS PAGE
   ======================= */

console.log("[LOCATIONS] init...");

/* ---------- AUTH ---------- */

debugAuthContext("LOCATIONS_PAGE").then(() => startPage());

let token = null;

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

/* ---------- API ---------- */

async function api(url, method = "GET", body) {
    const res = await fetch(url, {
        method,
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });

    let txt = await res.text();
    if (!res.ok) throw new Error(txt);

    try { return JSON.parse(txt); }
    catch { return txt; }
}

/* ---------- LOAD LIST ---------- */

async function loadLocations() {
    const tbody = document.getElementById("locTable");
    tbody.innerHTML = `<tr><td colspan="4" class="muted">Загрузка...</td></tr>`;

    const list = await api("/api/locations");

    tbody.innerHTML = "";

    list.forEach(loc => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${loc.id}</td>
            <td>${loc.code}</td>
            <td>${loc.name}</td>
            <td>
                <button class="btn btn-secondary" onclick="openInfo(${loc.id})">ℹ️</button>
                <button class="btn btn-secondary" onclick="editLocation(${loc.id})">✏️</button>
                <button class="btn btn-danger" onclick="deleteLocation(${loc.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/* ---------- CREATE LOCATION ---------- */

async function createLocation() {
    const code = prompt("Введите код:");
    if (!code) return;

    const name = prompt("Введите название:");
    if (!name) return;

    await api("/api/locations", "POST", { code, name });
    loadLocations();
}

/* ---------- EDIT LOCATION ---------- */

async function editLocation(id) {
    const loc = await api(`/api/locations/${id}`);

    const code = prompt("Новый код:", loc.code);
    if (!code) return;

    const name = prompt("Новое название:", loc.name);
    if (!name) return;

    await api(`/api/locations/${id}`, "PUT", { code, name });
    loadLocations();
}

/* ---------- DELETE LOCATION ---------- */

async function deleteLocation(id) {
    if (!confirm("Удалить склад?")) return;

    await api(`/api/locations/${id}`, "DELETE");
    loadLocations();
}

/* ===================================================
   МОДАЛКА ИНФО
   =================================================== */

const modal = document.getElementById("infoModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
document.getElementById("modalClose").onclick = () => modal.classList.add("hidden");

let CURRENT_LOCATION = null;

/* ---------- OPEN INFO MODAL ---------- */

async function openInfo(id) {
    CURRENT_LOCATION = id;
    modal.classList.remove("hidden");
    modalBody.innerHTML = "Загрузка...";

    const loc = await api(`/api/locations/${id}`);

    modalTitle.textContent = `Склад: ${loc.code} — ${loc.name}`;

    modalBody.innerHTML = `
        <p><b>Код:</b> ${loc.code}</p>
        <p><b>Название:</b> ${loc.name}</p>
        <hr>
        <p><b>SKU:</b> ${loc.totalProducts}</p>
        <p><b>Количество единиц:</b> ${loc.totalQty}</p>
        <p><b>Сумма:</b> ${loc.totalValue} ₽</p>
    `;

    document.getElementById("btnReceipt").onclick =
        () => window.location.href = `/pages/receipts.html?to=${id}`;

    document.getElementById("btnIssue").onclick =
        () => window.location.href = `/pages/issues.html?from=${id}`;

    document.getElementById("btnTransferFrom").onclick =
        () => window.location.href = `/pages/transfers.html?from=${id}`;

    document.getElementById("btnTransferTo").onclick =
        () => window.location.href = `/pages/transfers.html?to=${id}`;
}

/* ---------- EVENTS ---------- */

function bindEvents() {
    document.getElementById("createBtn").onclick = createLocation;
}

// глобально экспортируем (нужно для кнопок)
window.openInfo = openInfo;
window.editLocation = editLocation;
window.deleteLocation = deleteLocation;
