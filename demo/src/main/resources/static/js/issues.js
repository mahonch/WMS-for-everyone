import { Modal } from "./modal.js";

console.log("[ISSUES] init...");

debugAuthContext("ISSUES_PAGE").then(() => startPage());

let token = null;
let currentIssue = null;

/* ------------------- START PAGE ------------------- */

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
    loadIssues();
}

/* ------------------- ALERTS ------------------- */

const alerts = document.getElementById("alerts");

function alertBox(type, text) {
    const el = document.createElement("div");
    el.className = `alert ${type}`;
    el.textContent = text;
    alerts.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

/* ------------------- API WRAPPER ------------------- */

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
    try {
        json = await res.json();
    } catch {}

    if (!res.ok) {
        const msg = json?.message || json?.error || "Ошибка " + res.status;
        throw new Error(msg);
    }

    return json;
}

/* ------------------- LOAD LIST ------------------- */

async function loadIssues() {
    const page = await api("GET", "/api/issues?page=0&size=200");
    const tb = document.querySelector("#issuesTable tbody");
    tb.innerHTML = "";

    for (const d of page.content) {
        const createdByLabel =
            window.authUsersCache?.[d.createdBy] ?? d.createdBy;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${d.id}</td>
            <td>${d.number}</td>
            <td>${d.status}</td>
            <td>${createdByLabel}</td>
            <td>${d.reason ?? ""}</td>
            <td>${d.createdAt ?? ""}</td>
            <td><button class="btn btn-secondary openBtn" data-id="${d.id}">Открыть</button></td>
        `;
        tb.appendChild(tr);
    }
}

/* ------------------- EVENTS ------------------- */

function bindEvents() {
    document
        .querySelector("#issuesTable")
        .addEventListener("click", async (e) => {
            const btn = e.target.closest(".openBtn");
            if (!btn) return;

            const d = await api("GET", `/api/issues/${btn.dataset.id}`);
            showDetail(d);
        });

    document.getElementById("btnCreate").onclick = createIssue;
    document.getElementById("btnAddItem").onclick = addItemModal;
    document.getElementById("btnCommit").onclick = commitIssue;
    document.getElementById("btnDeleteDraft").onclick = deleteDraft;
    document.getElementById("btnCloseDetail").onclick = hideIssueDetailModal;
    document.getElementById("detailOverlay").addEventListener("click", e => {
        if (e.target.id === "detailOverlay") hideIssueDetailModal();
    });




    document
        .querySelector("#itemsTable")
        .addEventListener("click", deleteItemClick);
}

/* ------------------- CREATE ISSUE ------------------- */

async function createIssue() {
    const reason = await new Promise((resolve) => {
        Modal.open(
            `
            <label>Причина списания</label>
            <input name="reason" placeholder="Например: бой, срок годности">
        `,
            {
                width: "400px",
                onOk: (d) => resolve(d.reason || null),
                onCancel: () => resolve(null),
            }
        );
    });

    if (reason === null) return;

    const createdById = Number(localStorage.getItem("userId") || 1);

    const dto = { createdById, reason, items: [] };

    const iss = await api("POST", "/api/issues", dto);
    alertBox("info", `Создан черновик ${iss.number}`);
    loadIssues();
}

/* ------------------- SHOW DETAIL ------------------- */

function showDetail(d) {
    currentIssue = d;

    // открыть модалку
    showIssueDetailModal();

    document.getElementById('d_id').textContent = d.id;
    document.getElementById('d_number').textContent = d.number;
    document.getElementById('d_status').textContent = d.status;
    document.getElementById('d_reason').textContent = d.reason ?? '-';
    document.getElementById('d_createdBy').textContent =
        window.authUsersCache?.[d.createdBy] ?? d.createdBy;
    document.getElementById('d_date').textContent = d.createdAt ?? '-';

    const tb = document.querySelector('#itemsTable tbody');
    tb.innerHTML = '';

    for (const it of d.items) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${it.id}</td>
            <td>${it.productId}</td>
            <td>${it.batchId ?? ''}</td>
            <td>${it.qty}</td>
            <td>
                <button class="btn btn-danger delItemBtn" data-id="${it.id}">
                    Удалить
                </button>
            </td>
        `;
        tb.appendChild(tr);
    }
}


/* ------------------- DELETE ITEM ------------------- */

async function deleteItemClick(e) {
    const btn = e.target.closest(".delItemBtn");
    if (!btn) return;

    if (currentIssue.status !== "DRAFT")
        return alertBox("error", "Удалять можно только DRAFT");

    if (!confirm("Удалить позицию?")) return;

    await api("DELETE", `/api/issues/${currentIssue.id}/items/${btn.dataset.id}`);

    const updated = await api("GET", `/api/issues/${currentIssue.id}`);
    showDetail(updated);
}

/* ------------------- ADD ITEM (MODAL) ------------------- */

async function addItemModal() {
    if (!currentIssue || currentIssue.status !== "DRAFT")
        return alertBox("error", "Редактировать можно только DRAFT");

    const productsPage = await api("GET", "/api/products?page=0&size=200");

    let productOptions = productsPage.content
        .map((p) => `<option value="${p.id}">${p.name} (${p.sku})</option>`)
        .join("");

    Modal.open(
        `
        <label>Товар</label>
        <select name="productId" id="m_product">
            <option value="">Выберите...</option>
            ${productOptions}
        </select>

        <label>Партия</label>
        <select name="batchId" id="m_batch">
            <option value="">Выберите товар...</option>
        </select>

        <label>Количество</label>
        <input type="number" name="qty" min="1" placeholder="Кол-во">
    `,
        {
            width: "450px",
            onOk: async (d) => {
                if (!d.productId || !d.batchId || !d.qty)
                    return alertBox("error", "Заполните все поля");

                await api("POST", `/api/issues/${currentIssue.id}/items`, {
                    productId: Number(d.productId),
                    batchId: Number(d.batchId),
                    qty: Number(d.qty),
                });

                const updated = await api("GET", `/api/issues/${currentIssue.id}`);
                showDetail(updated);
            },
        }
    );

    const productSel = document.getElementById("m_product");
    const batchSel = document.getElementById("m_batch");

    productSel.onchange = async () => {
        batchSel.innerHTML = `<option>Загрузка...</option>`;

        const batches = await api("GET", `/api/batches/by-product/${productSel.value}`);

        batchSel.innerHTML = batches
            .map(
                (b) =>
                    `<option value="${b.id}">Партия #${b.id} — Остаток ${b.availableQty}</option>`
            )
            .join("");
    };
}

/* ------------------- COMMIT ------------------- */

async function commitIssue() {
    if (currentIssue.status !== "DRAFT")
        return alertBox("error", "Документ уже проведён");

    // выбор локации через модалку
    Modal.open(
        `
        <label>ID локации списания</label>
        <input name="locId" type="number" placeholder="Например: 1">
    `,
        {
            width: "350px",
            onOk: async (d) => {
                if (!d.locId) return alertBox("error", "Укажите локацию");

                await api(
                    "POST",
                    `/api/issues/${currentIssue.id}/commit`,
                    { fromLocationId: Number(d.locId) }
                );

                alertBox("info", "Проведено");

                document.getElementById("detailPanel").classList.add("hidden");
                loadIssues();
            },
        }
    );
}

function showIssueDetailModal() {
    document.getElementById("detailOverlay").classList.remove("hidden");
}

function hideIssueDetailModal() {
    document.getElementById("detailOverlay").classList.add("hidden");
}



async function deleteDraft() {
    if (currentIssue.status !== "DRAFT")
        return alertBox("error", "Удалять можно только DRAFT");

    if (!confirm("Удалить документ?")) return;

    await api("DELETE", `/api/issues/${currentIssue.id}`);

    alertBox("info", "Удалено");

    document.getElementById("detailPanel").classList.add("hidden");

    loadIssues();
}
