const token = localStorage.getItem("token");

async function api(url, method = "GET", body) {
    const res = await fetch(url, {
        method,
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        let msg = await res.text();
        throw new Error(msg);
    }
    return res.json();
}

async function loadLocations() {
    const list = await api("/api/locations");
    const tbody = document.getElementById("locTable");
    tbody.innerHTML = "";

    list.forEach(loc => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${loc.id}</td>
            <td>${loc.code}</td>
            <td>${loc.name}</td>
            <td>
                <button onclick="openInfo(${loc.id})">ℹ️</button>
                <button onclick="editLocation(${loc.id})">✏️</button>
                <button onclick="deleteLocation(${loc.id})">🗑️</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function createLocation() {
    const code = prompt("Введите код:");
    if (!code) return;

    const name = prompt("Введите название:");
    if (!name) return;

    await api("/api/locations", "POST", {code, name});
    loadLocations();
}

async function editLocation(id) {
    const loc = await api(`/api/locations/${id}`);

    const code = prompt("Новый код:", loc.code);
    if (!code) return;

    const name = prompt("Новое название:", loc.name);
    if (!name) return;

    await api(`/api/locations/${id}`, "PUT", {code, name});
    loadLocations();
}

async function deleteLocation(id) {
    if (!confirm("Удалить склад?")) return;

    await api(`/api/locations/${id}`, "DELETE");
    loadLocations();
}

// --------- МОДАЛКА ---------

const modal = document.getElementById("infoModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

document.getElementById("modalClose").onclick = () => {
    modal.classList.add("hidden");
};

let CURRENT_LOCATION = null;

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

    // Привязка действий
    document.getElementById("btnReceipt").onclick =
        () => window.location.href = `/pages/receipts.html?to=${id}`;

    document.getElementById("btnIssue").onclick =
        () => window.location.href = `/pages/issues.html?from=${id}`;

    document.getElementById("btnTransferFrom").onclick =
        () => window.location.href = `/pages/transfers.html?from=${id}`;

    document.getElementById("btnTransferTo").onclick =
        () => window.location.href = `/pages/transfers.html?to=${id}`;
}

document.getElementById("createBtn").onclick = createLocation;

loadLocations();
