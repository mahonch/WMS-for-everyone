import { Modal } from "./modal.js";

console.log("[TRANSFERS] init...");

let token = null;
let currentTransfer = null;
let locations = [];

/* ----------------------- INIT ----------------------- */

debugAuthContext("TRANSFERS_PAGE").then(() => startPage());

async function startPage() {
    token = localStorage.getItem("token");
    if (!token) return (window.location.href = "/index.html");

    document.getElementById("usernameLabel").textContent =
        localStorage.getItem("username") || "user";

    document.getElementById("logoutBtn").onclick = () => {
        localStorage.clear();
        window.location.href = "/index.html";
    };

    await loadLocations();
    bindEvents();
    loadTransfers();
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

/* ----------------------- API WRAPPER ----------------------- */

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

/* ----------------------- LOAD LOCATIONS ----------------------- */

async function loadLocations() {
    let list = await api("GET", "/api/locations");

    locations = list.content ?? list;
}

/* ----------------------- LOAD LIST ----------------------- */

async function loadTransfers() {
    let list = await api("GET", "/api/transfers");

    const arr = list.content ?? list;
    const tb = document.querySelector("#transfersTable tbody");
    tb.innerHTML = "";

    for (const t of arr) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${t.id}</td>
            <td>${t.number}</td>
            <td>${t.status}</td>
            <td>${t.fromLocation}</td>
            <td>${t.toLocation}</td>
            <td>${t.createdBy ?? "-"}</td>
            <td>${t.createdAt ?? "-"}</td>
            <td><button class="btn btn-secondary openBtn" data-id="${t.id}">Открыть</button></td>
        `;
        tb.appendChild(tr);
    }
}

/* ----------------------- BIND EVENTS ----------------------- */

function bindEvents() {

    document.getElementById("btnCreate").onclick = openCreateModal;

    document.querySelector("#transfersTable").addEventListener("click", async e => {
        const btn = e.target.closest(".openBtn");
        if (!btn) return;

        const t = await api("GET", `/api/transfers/${btn.dataset.id}`);
        showDetail(t);
    });

    document.getElementById("btnAddItem").onclick = openAddItemModal;
    document.getElementById("btnCommit").onclick = commitTransfer;
    document.getElementById("btnDeleteDraft").onclick = deleteDraft;
    document.getElementById("btnCloseDetail").onclick = hideDetail;

    document.getElementById("detailOverlay").onclick = e => {
        if (e.target.id === "detailOverlay") hideDetail();
    };

    document.querySelector("#itemsTable").addEventListener("click", deleteItemClick);
}

/* ----------------------- CREATE TRANSFER ----------------------- */

function openCreateModal() {

    let locOptions = locations
        .map(l => `<option value="${l.id}">${l.code}</option>`)
        .join("");

    Modal.open(`
        <label>Из локации</label>
        <select name="fromLocationId">${locOptions}</select>

        <label>В локацию</label>
        <select name="toLocationId">${locOptions}</select>
    `, {
        width: "400px",
        onOk: async d => {

            if (!d.fromLocationId || !d.toLocationId)
                return alertBox("error", "Выберите локации");

            const createdById = Number(localStorage.getItem("userid"));

            const dto = {
                createdById,
                fromLocationId: Number(d.fromLocationId),
                toLocationId: Number(d.toLocationId)
            };

            const t = await api("POST", "/api/transfers", dto);

            alertBox("info", "Создан черновик " + t.number);
            loadTransfers();
        }
    });
}

/* ----------------------- DETAIL MODAL ----------------------- */

function showDetail(t) {
    currentTransfer = t;

    const ov = document.getElementById("detailOverlay");
    ov.classList.remove("hidden");

    document.getElementById("d_id").textContent = t.id;
    document.getElementById("d_number").textContent = t.number;
    document.getElementById("d_status").textContent = t.status;
    document.getElementById("d_from").textContent = t.fromLocation;
    document.getElementById("d_to").textContent = t.toLocation;
    document.getElementById("d_createdBy").textContent = t.createdBy;
    document.getElementById("d_date").textContent = t.createdAt;

    const tb = document.querySelector("#itemsTable tbody");
    tb.innerHTML = "";

    for (const it of t.items) {
        tb.innerHTML += `
            <tr>
                <td>${it.id}</td>
                <td>${it.productId}</td>
                <td>${it.batchId ?? ""}</td>
                <td>${it.qty}</td>
                <td>
                    ${t.status === "DRAFT"
            ? `<button class="btn btn-danger delItemBtn" data-id="${it.id}">Удалить</button>`
            : ""}
                </td>
            </tr>
        `;
    }
}

function hideDetail() {
    document.getElementById("detailOverlay").classList.add("hidden");
}

/* ----------------------- DELETE ITEM ----------------------- */

async function deleteItemClick(e) {
    const btn = e.target.closest(".delItemBtn");
    if (!btn) return;

    if (currentTransfer.status !== "DRAFT")
        return alertBox("error", "Удалять можно только DRAFT");

    if (!confirm("Удалить позицию?")) return;

    await api("DELETE", `/api/transfers/${currentTransfer.id}/items/${btn.dataset.id}`);

    const updated = await api("GET", `/api/transfers/${currentTransfer.id}`);
    showDetail(updated);
}

/* ----------------------- ADD ITEM MODAL ----------------------- */

async function openAddItemModal() {
    if (!currentTransfer || currentTransfer.status !== "DRAFT")
        return alertBox("error", "Можно добавлять только в DRAFT");

    Modal.open(`
        <label>ID товара</label>
        <input name="productId" type="number">

        <label>Кол-во</label>
        <input name="qty" type="number" min="1" value="1">
    `, {
        width: "350px",
        onOk: async d => {

            if (!d.productId || !d.qty)
                return alertBox("error", "Заполните поля");

            // получаем партии
            const batches = await api("GET",
                `/api/stocks/batches/${d.productId}/${currentTransfer.fromLocation}`
            );

            if (batches.length === 0)
                return alertBox("error", "Партии не найдены");

            const batchId = batches[0].batchId ?? batches[0].id;

            await api("POST",
                `/api/transfers/${currentTransfer.id}/items`,
                {
                    productId: Number(d.productId),
                    batchId: Number(batchId),
                    qty: Number(d.qty)
                }
            );

            const updated = await api("GET", `/api/transfers/${currentTransfer.id}`);
            showDetail(updated);
        }
    });
}

/* ----------------------- COMMIT ----------------------- */

async function commitTransfer() {
    if (!currentTransfer || currentTransfer.status !== "DRAFT")
        return alertBox("error", "Документ уже проведён");

    await api("POST", `/api/transfers/${currentTransfer.id}/commit`);

    alertBox("info", "Проведено");
    hideDetail();
    loadTransfers();
}

/* ----------------------- DELETE DRAFT ----------------------- */

async function deleteDraft() {
    if (!currentTransfer || currentTransfer.status !== "DRAFT")
        return alertBox("error", "Удалять можно только DRAFT");

    if (!confirm("Удалить документ?")) return;

    await api("DELETE", `/api/transfers/${currentTransfer.id}`);

    alertBox("info", "Удалено");
    hideDetail();
    loadTransfers();
}
