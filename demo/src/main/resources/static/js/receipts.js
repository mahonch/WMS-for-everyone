import { Modal } from "./modal.js";

console.log("[RECEIPTS] init...");

debugAuthContext("RECEIPTS_PAGE").then(() => startPage());

let token = null;
let currentReceipt = null;
let receiptsCache = [];

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

/* -------------------- HELPERS -------------------- */

const alerts = document.getElementById("alerts");

function alertBox(type, text) {
    const div = document.createElement("div");
    div.className = `alert ${type}`;
    div.textContent = text;
    alerts.appendChild(div);
    setTimeout(() => div.remove(), 3500);
}

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");
const fmtUser = (name, id) => name ?? (id ? "ID " + id : "—");
const statusPill = (s) => `<span class="pill pill-${s?.toLowerCase()}">${s}</span>`;

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
    const page = await api("GET", "/api/receipts?page=0&size=400");
    receiptsCache = page.content ?? [];
    renderTable();
}

function renderTable() {
    const tb = document.querySelector("#receiptsTable tbody");
    const q = (document.getElementById("filterInput").value || "").toLowerCase();
    tb.innerHTML = "";

    for (const r of receiptsCache.filter(r =>
        !q ||
        (r.number && r.number.toLowerCase().includes(q)) ||
        (String(r.supplierId ?? "").includes(q))
    )) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.number}</td>
            <td>${statusPill(r.status)}</td>
            <td>${r.supplierId ?? "—"}</td>
            <td>${r.warehouseId ?? "—"}</td>
            <td>${fmtUser(r.createdByName, r.createdBy)}</td>
            <td>${fmtUser(r.committedByName, r.committedBy)}</td>
            <td>${fmtDate(r.committedAt)}</td>
            <td class="right">${r.totalSum ?? 0}</td>
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

    document.getElementById("filterInput").addEventListener("input", renderTable);
    document.getElementById("btnCreate").onclick = createReceipt;

    document.getElementById("btnAddItem").onclick = addItemModal;
    document.getElementById("btnCommit").onclick = commitReceipt;
    document.getElementById("btnDeleteDraft").onclick = deleteDraft;
    document.getElementById("btnCloseDetail").onclick = hideDetail;

    document.querySelector("#itemsTable").addEventListener("click", deleteItemClick);

    document.getElementById("detailOverlay").onclick = e => {
        if (e.target.id === "detailOverlay") hideDetail();
    };
}

/* -------------------- CREATE -------------------- */

async function createReceipt() {
    const createdById = Number(localStorage.getItem("userId") || 1);
    const lastWh = localStorage.getItem("lastWarehouseId") || "";

    Modal.open(`
        <label>Поставщик (ID, можно пусто)</label>
        <input name="supplierId" type="number" min="1" placeholder="ID поставщика">

        <label>Склад (ID, обязательно)</label>
        <input name="warehouseId" type="number" min="1" value="${lastWh}">

        <label>Номер (опционально)</label>
        <input name="number" type="text" placeholder="если пусто — сгенерируем">
    `, {
        width: "420px",
        onOk: async d => {
            if (!d.warehouseId) return alertBox("error", "Укажите склад");

            const dto = {
                createdById,
                supplierId: d.supplierId ? Number(d.supplierId) : null,
                warehouseId: Number(d.warehouseId),
                number: d.number || null,
                items: []
            };

            const r = await api("POST", "/api/receipts", dto);
            localStorage.setItem("lastWarehouseId", dto.warehouseId);
            alertBox("info", "Создан черновик " + r.number);
            loadReceipts();
        }
    });
}

/* -------------------- DETAIL MODAL -------------------- */

function showDetail(r) {
    currentReceipt = r;
    document.getElementById("detailOverlay").classList.remove("hidden");

    document.getElementById("d_id").textContent = r.id;
    document.getElementById("d_number").textContent = r.number;
    document.getElementById("d_status").innerHTML = statusPill(r.status);
    document.getElementById("d_supplier").textContent = r.supplierId ?? "—";
    document.getElementById("d_wh").textContent = r.warehouseId ?? "—";
    document.getElementById("d_createdBy").textContent = fmtUser(r.createdByName, r.createdBy);
    document.getElementById("d_date").textContent = fmtDate(r.createdAt);
    document.getElementById("d_committedBy").textContent = fmtUser(r.committedByName, r.committedBy);
    document.getElementById("d_committedAt").textContent = fmtDate(r.committedAt);
    document.getElementById("d_total").textContent = r.totalSum ?? 0;

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
                <td>${it.locationId ?? ""}</td>
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

        <label>Локация ID (опционально)</label>
        <input name="locationId" type="number" min="1">
    `, {
        width: "440px",
        onOk: async d => {
            if (!d.productId || !d.qty || !d.price)
                return alertBox("error", "Заполните обязательные поля");

            await api("POST",
                `/api/receipts/${currentReceipt.id}/items`,
                {
                    productId: Number(d.productId),
                    qty: Number(d.qty),
                    price: Number(d.price),
                    locationId: d.locationId ? Number(d.locationId) : null
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
        <label>ID локации для оприходования</label>
        <input name="locId" type="number" placeholder="например 1">
    `, {
        width: "360px",
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
