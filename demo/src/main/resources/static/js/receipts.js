import { Modal } from "./modal.js";

console.log("[RECEIPTS] init...");

debugAuthContext("RECEIPTS_PAGE").then(() => startPage());

let token = null;
let currentReceipt = null;

/* ----------------------- START ----------------------- */

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

/* -------------------- ALERTS -------------------- */

const alerts = document.getElementById("alerts");

function alertBox(type, text) {
    const div = document.createElement("div");
    div.className = `alert ${type}`;
    div.textContent = text;
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

/* -------------------- API -------------------- */

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

/* -------------------- LOAD LIST -------------------- */

async function loadReceipts() {
    const page = await api("GET", "/api/receipts?page=0&size=200");

    const tb = document.querySelector("#receiptsTable tbody");
    tb.innerHTML = "";

    for (const r of page.content) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.id}</td>
            <td>${r.number}</td>
            <td>${r.status}</td>
            <td>${r.supplierId ?? ""}</td>
            <td>${r.createdBy ?? ""}</td>
            <td>${r.createdAt ?? ""}</td>
            <td>${r.totalSum}</td>
            <td><button class="btn btn-secondary openBtn" data-id="${r.id}">Открыть</button></td>
        `;
        tb.appendChild(tr);
    }
}

/* -------------------- EVENTS -------------------- */

function bindEvents() {

    document.querySelector("#receiptsTable").addEventListener("click", async e => {
        const btn = e.target.closest(".openBtn");
        if (!btn) return;

        const r = await api("GET", `/api/receipts/${btn.dataset.id}`);
        showDetail(r);
    });

    document.getElementById("btnCreate").onclick = createReceipt;

    document.getElementById("btnAddItem").onclick = addItemModal;
    document.getElementById("btnCommit").onclick = commitReceipt;
    document.getElementById("btnDeleteDraft").onclick = deleteDraft;
    document.getElementById("btnCloseDetail").onclick = hideDetail;

    document.querySelector("#itemsTable").addEventListener("click", deleteItemClick);

    // клик по затемнению
    document.getElementById("detailOverlay").onclick = e => {
        if (e.target.id === "detailOverlay") hideDetail();
    };
}

/* -------------------- CREATE -------------------- */

async function createReceipt() {
    const createdById = Number(localStorage.getItem("userId") || 1);

    const dto = {
        createdById,
        supplierId: null,
        items: []
    };

    const r = await api("POST", "/api/receipts", dto);

    alertBox("info", "Создан черновик " + r.number);
    loadReceipts();
}

/* -------------------- DETAIL MODAL -------------------- */

function showDetail(r) {
    currentReceipt = r;
    const ov = document.getElementById("detailOverlay");

    ov.classList.remove("hidden");

    document.getElementById("d_id").textContent = r.id;
    document.getElementById("d_number").textContent = r.number;
    document.getElementById("d_status").textContent = r.status;
    document.getElementById("d_supplier").textContent = r.supplierId ?? "-";
    document.getElementById("d_createdBy").textContent =
        r.createdByName ?? ("ID " + r.createdBy);
    document.getElementById("d_date").textContent = r.createdAt ?? "-";
    document.getElementById("d_total").textContent = r.totalSum;

    const tb = document.querySelector("#itemsTable tbody");
    tb.innerHTML = "";

    for (const it of r.items) {
        tb.innerHTML += `
            <tr>
                <td>${it.id}</td>
                <td>${it.productId}</td>
                <td>${it.qty}</td>
                <td>${it.price}</td>
                <td>${it.batchId ?? ""}</td>
                <td><button class="btn btn-danger delItemBtn" data-id="${it.id}">Удалить</button></td>
            </tr>
        `;
    }
}

function hideDetail() {
    document.getElementById("detailOverlay").classList.add("hidden");
}

/* -------------------- DELETE ITEM -------------------- */

async function deleteItemClick(e) {
    const btn = e.target.closest(".delItemBtn");
    if (!btn) return;

    if (currentReceipt.status !== "DRAFT")
        return alertBox("error", "Удалять можно только DRAFT");

    if (!confirm("Удалить позицию?")) return;

    await api("DELETE", `/api/receipts/${currentReceipt.id}/items/${btn.dataset.id}`);

    const updated = await api("GET", `/api/receipts/${currentReceipt.id}`);
    showDetail(updated);
}

/* -------------------- ADD ITEM MODAL -------------------- */

async function addItemModal() {
    if (!currentReceipt || currentReceipt.status !== "DRAFT")
        return alertBox("error", "Редактировать можно только DRAFT");

    Modal.open(`
        <label>Товар ID</label>
        <input name="productId" type="number" placeholder="ID товара">

        <label>Кол-во</label>
        <input name="qty" type="number" min="1">

        <label>Цена</label>
        <input name="price" type="number" min="0">
    `, {
        width: "420px",
        onOk: async d => {
            if (!d.productId || !d.qty || !d.price)
                return alertBox("error", "Заполните все поля");

            await api("POST",
                `/api/receipts/${currentReceipt.id}/items`,
                {
                    productId: Number(d.productId),
                    qty: Number(d.qty),
                    price: Number(d.price)
                }
            );

            const updated = await api("GET", `/api/receipts/${currentReceipt.id}`);
            showDetail(updated);
        }
    });
}

/* -------------------- COMMIT -------------------- */

async function commitReceipt() {
    if (!currentReceipt || currentReceipt.status !== "DRAFT")
        return alertBox("error", "Документ уже проведён");

    Modal.open(`
        <label>ID локации</label>
        <input name="locId" type="number">
    `, {
        width: "350px",
        onOk: async d => {
            if (!d.locId) return alertBox("error", "Укажите локацию");

            await api("POST",
                `/api/receipts/${currentReceipt.id}/commit`,
                { toLocationId: Number(d.locId) }
            );

            alertBox("info", "Проведено");
            hideDetail();
            loadReceipts();
        }
    });
}

/* -------------------- DELETE DRAFT -------------------- */

async function deleteDraft() {
    if (!currentReceipt || currentReceipt.status !== "DRAFT")
        return alertBox("error", "Удалять можно только DRAFT");

    if (!confirm("Удалить документ?")) return;

    await api("DELETE", `/api/receipts/${currentReceipt.id}`);

    alertBox("info", "Удалено");
    hideDetail();
    loadReceipts();
}
