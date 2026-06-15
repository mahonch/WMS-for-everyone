console.log("[WAREHOUSE-DETAIL] init...");

let token = null;
let warehouseId = null;
let warehouse = null;
let currentLocation = null;
let currentProduct = null;

// Запускаем после объявления всех переменных
startPage();

/* ==================== START ==================== */

function startPage() {
    token = localStorage.getItem("token");
    if (!token) return (window.location.href = "/index.html");

    // Получаем ID склада из URL
    const params = new URLSearchParams(window.location.search);
    warehouseId = params.get("id");
    if (!warehouseId) {
        alert("Не указан склад");
        window.location.href = "/pages/warehouses.html";
        return;
    }

    document.getElementById("usernameLabel").textContent = localStorage.getItem("username") || "user";
    document.getElementById("logoutBtn").onclick = () => {
        localStorage.clear();
        window.location.href = "/index.html";
    };

    bindEvents();
    loadWarehouse();
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

const fmtMoney = (n) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "BYN" }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat("ru-RU").format(n || 0);

const typeIcons = {
    "ZONE": "🏭",
    "RACK": "📦",
    "SHELF": "📚",
    "BIN": "📍"
};

const typeNames = {
    "ZONE": "Зона",
    "RACK": "Стеллаж",
    "SHELF": "Полка",
    "BIN": "Ячейка"
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

/* ==================== LOAD WAREHOUSE ==================== */

async function loadWarehouse() {
    try {
        console.log("[DEBUG] Loading warehouse ID:", warehouseId);
        warehouse = await api("GET", `/api/warehouses/${warehouseId}`);
        console.log("[DEBUG] Warehouse loaded:", warehouse);
        document.getElementById("warehouseName").textContent = ` ${warehouse.name}`;
        
        loadOverview();
        loadLocations();
        loadProducts();
    } catch (e) {
        console.error("[ERROR] loadWarehouse:", e);
        document.getElementById("warehouseName").textContent = "Ошибка загрузки";
    }
}

async function loadOverview() {
    try {
        // Загружаем все локации склада
        const locations = await api("GET", `/api/locations/warehouse/${warehouseId}`);
        
        // Загружаем все товары на складе
        const stocks = await api("GET", `/api/stocks?warehouseId=${warehouseId}`);

        // Считаем статистику
        const totalLocations = locations.length;
        const totalProducts = [...new Set(stocks.map(s => s.productId))].length;
        const totalQty = stocks.reduce((sum, s) => sum + s.qty, 0);
        const totalValue = stocks.reduce((sum, s) => sum + (s.qty * (s.costPrice || 0)), 0);

        document.getElementById("statLocations").textContent = fmtNum(totalLocations);
        document.getElementById("statProducts").textContent = fmtNum(totalProducts);
        document.getElementById("statQty").textContent = fmtNum(totalQty);
        document.getElementById("statValue").textContent = fmtMoney(totalValue);
        
        // Заполненность по зонам
        await loadZonesStats(locations, stocks);
        
    } catch (e) {
        console.error("[ERROR] loadOverview:", e);
        document.getElementById("zonesStats").innerHTML = `<div class="error">Ошибка загрузки: ${e.message}</div>`;
    }
}

async function loadZonesStats(locations, stocks) {
    // Группируем по зонам
    const zones = {};
    locations.forEach(loc => {
        if (loc.type === "ZONE") {
            zones[loc.id] = { zone: loc, locations: 0, stocked: 0 };
        }
    });
    
    // Считаем локации в зонах
    locations.forEach(loc => {
        if (loc.parentId) {
            // Ищем родительскую зону
            let parent = locations.find(l => l.id === loc.parentId);
            while (parent && parent.type !== "ZONE") {
                parent = locations.find(l => l.id === parent.parentId);
            }
            if (parent && zones[parent.id]) {
                zones[parent.id].locations++;
                const hasStock = stocks.some(s => s.locationId === loc.id && s.qty > 0);
                if (hasStock) zones[parent.id].stocked++;
            }
        }
    });
    
    const container = document.getElementById("zonesStats");
    const zoneList = Object.values(zones);
    
    if (zoneList.length === 0) {
        container.innerHTML = `<div class="muted">Зоны не созданы</div>`;
        return;
    }
    
    container.innerHTML = zoneList.map(z => {
        const percent = z.locations > 0 ? Math.round((z.stocked / z.locations) * 100) : 0;
        const color = percent >= 80 ? "🟢" : percent >= 50 ? "🟡" : "🔴";
        return `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                <span>${typeIcons.ZONE} ${z.zone.name}</span>
                <span>${color} ${percent}% заполнено (${z.stocked}/${z.locations})</span>
            </div>
        `;
    }).join("");
}

/* ==================== LOCATIONS TREE ==================== */

async function loadLocations() {
    const container = document.getElementById("locationTree");
    container.innerHTML = `<div class="muted" style="padding: 2rem; text-align: center;">Загрузка...</div>`;
    
    try {
        const locations = await api("GET", `/api/locations/warehouse/${warehouseId}`);
        const stocks = await api("GET", `/api/stocks?warehouseId=${warehouseId}`);
        
        renderLocationTree(locations, stocks);
    } catch (e) {
        console.error("[ERROR] loadLocations:", e);
        container.innerHTML = `<div class="error">Ошибка: ${e.message}</div>`;
    }
}

function renderLocationTree(locations, stocks) {
    const container = document.getElementById("locationTree");
    
    // Строим дерево
    const tree = {};
    locations.forEach(loc => {
        loc.children = [];
        loc.stock = stocks.filter(s => s.locationId === loc.id);
        loc.totalQty = loc.stock.reduce((sum, s) => sum + s.qty, 0);
        tree[loc.id] = loc;
    });
    
    // Привязываем детей к родителям
    locations.forEach(loc => {
        if (loc.parentId && tree[loc.parentId]) {
            tree[loc.parentId].children.push(loc);
        }
    });
    
    // Находим корневые элементы (без родителей или зоны)
    const roots = locations.filter(l => !l.parentId || l.type === "ZONE");
    
    if (roots.length === 0) {
        container.innerHTML = `<div class="muted" style="padding: 2rem; text-align: center;">Локации не созданы</div>`;
        return;
    }
    
    container.innerHTML = roots.map(r => renderLocationNode(r, tree)).join("");
    
    // Bind events
    container.querySelectorAll(".loc-toggle").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const nodeId = btn.dataset.node;
            const children = document.getElementById(`loc-children-${nodeId}`);
            if (children) {
                children.classList.toggle("hidden");
                btn.textContent = children.classList.contains("hidden") ? "▶" : "▼";
            }
        };
    });
}

function renderLocationNode(loc, tree, level = 0) {
    const indent = level * 20;
    const hasChildren = loc.children && loc.children.length > 0;
    const stockStatus = loc.totalQty > 0 ? "📦" : "⬜";
    const typeIcon = typeIcons[loc.type] || "📍";
    
    let html = `
        <div class="location-node" style="padding-left: ${indent}px;">
            <div class="node-row">
                ${hasChildren ? `<button class="loc-toggle" data-node="${loc.id}">▼</button>` : '<span style="width: 20px;"></span>'}
                <span class="node-icon">${typeIcon}</span>
                <span class="node-code">${loc.code}</span>
                <span class="node-name">${loc.name}</span>
                <span class="node-status">${stockStatus}</span>
                <span class="node-qty">${loc.totalQty > 0 ? fmtNum(loc.totalQty) + ' ед.' : 'Пусто'}</span>
                <button class="btn btn-sm btn-secondary" onclick="openLocationDetail(${loc.id})">👁️</button>
            </div>
            ${hasChildren ? `<div id="loc-children-${loc.id}">${loc.children.map(c => renderLocationNode(c, tree, level + 1)).join("")}</div>` : ''}
        </div>
    `;
    
    return html;
}

/* ==================== PRODUCTS ==================== */

async function loadProducts() {
    const tb = document.querySelector("#productsTable tbody");
    tb.innerHTML = `<tr><td colspan="7" class="muted">Загрузка...</td></tr>`;
    
    try {
        const stocks = await api("GET", `/api/stocks?warehouseId=${warehouseId}`);
        const productsMap = new Map();
        
        stocks.forEach(s => {
            if (!productsMap.has(s.productId)) {
                productsMap.set(s.productId, { 
                    product: s, 
                    qty: 0, 
                    value: 0, 
                    locations: new Set() 
                });
            }
            const p = productsMap.get(s.productId);
            p.qty += s.qty;
            p.value += s.qty * (s.costPrice || 0);
            p.locations.add(s.locationId);
        });
        
        const products = Array.from(productsMap.values());
        
        tb.innerHTML = "";
        if (products.length === 0) {
            tb.innerHTML = `<table><td colspan="7" class="muted">Товаров нет</td></tr>`;
            return;
        }
        
        products.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${p.product.productName || "Товар #" + p.product.productId}</strong></td>
                <td><code>${p.product.sku || "—"}</code></td>
                <td>${p.product.categoryName || "—"}</td>
                <td class="right">${fmtNum(p.qty)}</td>
                <td class="right">${fmtMoney(p.value)}</td>
                <td>${p.locations.size}</td>
                <td><button class="btn btn-sm btn-secondary" onclick="openProductDetail(${p.product.productId})">👁️</button></td>
            `;
            tb.appendChild(tr);
        });
        
    } catch (e) {
        console.error("[ERROR] loadProducts:", e);
        tb.innerHTML = `<tr><td colspan="7" class="error">Ошибка: ${e.message}</td></tr>`;
    }
}

/* ==================== LOCATION DETAIL ==================== */

window.openLocationDetail = async function(id) {
    try {
        const location = await api("GET", `/api/locations/${id}`);
        const stocks = await api("GET", `/api/stocks?warehouseId=${warehouseId}`);
        const locationStocks = stocks.filter(s => s.locationId === id && s.qty > 0);
        
        currentLocation = location;
        
        document.getElementById("ld_code").textContent = `${typeIcons[location.type] || "📍"} ${location.code}`;
        document.getElementById("ld_path").textContent = location.path || location.code;
        document.getElementById("ld_type").textContent = typeNames[location.type] || location.type;
        document.getElementById("ld_products").textContent = locationStocks.length;
        
        const totalQty = locationStocks.reduce((sum, s) => sum + s.qty, 0);
        const totalValue = locationStocks.reduce((sum, s) => sum + s.qty * (s.costPrice || 0), 0);
        
        document.getElementById("ld_qty").textContent = fmtNum(totalQty);
        document.getElementById("ld_value").textContent = fmtMoney(totalValue);
        
        const tb = document.querySelector("#locationStockTable tbody");
        tb.innerHTML = "";
        
        if (locationStocks.length === 0) {
            tb.innerHTML = `<tr><td colspan="5" class="muted">Нет товаров</td></tr>`;
        } else {
            locationStocks.forEach(s => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${s.productName || "Товар #" + s.productId}</td>
                    <td>${s.sku || "—"}</td>
                    <td class="right">${fmtNum(s.qty)}</td>
                    <td class="right">${fmtMoney(s.costPrice || 0)}</td>
                    <td class="right">${fmtMoney((s.qty || 0) * (s.costPrice || 0))}</td>
                `;
                tb.appendChild(tr);
            });
        }
        
        document.getElementById("locationDetailOverlay").classList.remove("hidden");
    } catch (e) {
        alertBox("error", "Не удалось загрузить локацию");
    }
}

window.closeLocationDetail = function() {
    document.getElementById("locationDetailOverlay").classList.add("hidden");
    currentLocation = null;
}

/* ==================== PRODUCT DETAIL ==================== */

window.openProductDetail = async function(productId) {
    try {
        const stocks = await api("GET", `/api/stocks?warehouseId=${warehouseId}`);
        const productStocks = stocks.filter(s => s.productId === productId && s.qty > 0);
        
        if (productStocks.length === 0) {
            alertBox("error", "Товар не найден");
            return;
        }
        
        currentProduct = productStocks[0];
        const totalQty = productStocks.reduce((sum, s) => sum + s.qty, 0);
        const totalValue = productStocks.reduce((sum, s) => sum + s.qty * (s.costPrice || 0), 0);
        
        document.getElementById("pd_name").textContent = productStocks[0].productName || "Товар";
        document.getElementById("pd_sku").textContent = productStocks[0].sku || "—";
        document.getElementById("pd_category").textContent = productStocks[0].categoryName || "—";
        document.getElementById("pd_qty").textContent = fmtNum(totalQty);
        document.getElementById("pd_value").textContent = fmtMoney(totalValue);
        
        // Локации
        const tb = document.querySelector("#productLocationsTable tbody");
        tb.innerHTML = "";
        productStocks.forEach(s => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${s.locationCode || "—"}</td>
                <td>${typeIcons[s.locationType] || ""} ${typeNames[s.locationType] || s.locationType || "—"}</td>
                <td class="right">${fmtNum(s.qty)}</td>
                <td class="right">${fmtMoney(s.costPrice || 0)}</td>
                <td class="right">${fmtMoney((s.qty || 0) * (s.costPrice || 0))}</td>
            `;
            tb.appendChild(tr);
        });
        
        document.getElementById("productDetailOverlay").classList.remove("hidden");
    } catch (e) {
        alertBox("error", "Не удалось загрузить товар");
    }
}

window.closeProductDetail = function() {
    document.getElementById("productDetailOverlay").classList.add("hidden");
    currentProduct = null;
}

/* ==================== EVENTS ==================== */

/* ==================== EVENTS ==================== */

function bindEvents() {
    // Вкладки
    document.querySelectorAll(".tab").forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
            tab.classList.add("active");
            document.getElementById(`tab-${tab.dataset.tab}`).classList.remove("hidden");
        };
    });
    
    // Фильтры локаций
    const locationSearch = document.getElementById("locationSearch");
    if (locationSearch) locationSearch.addEventListener("input", filterLocations);
    const locationTypeFilter = document.getElementById("locationTypeFilter");
    if (locationTypeFilter) locationTypeFilter.addEventListener("change", filterLocations);
    const locationStockFilter = document.getElementById("locationStockFilter");
    if (locationStockFilter) locationStockFilter.addEventListener("change", filterLocations);
    
    // Фильтр товаров
    const productSearch = document.getElementById("productSearch");
    if (productSearch) productSearch.addEventListener("input", filterProducts);
    
    // Быстрые действия
    const btnCreateReceipt = document.getElementById("btnCreateReceipt");
    if (btnCreateReceipt) btnCreateReceipt.onclick = () => {
        window.location.href = `/pages/receipts.html?warehouseId=${warehouseId}`;
    };
    
    const btnCreateIssue = document.getElementById("btnCreateIssue");
    if (btnCreateIssue) btnCreateIssue.onclick = () => {
        window.location.href = `/pages/issues.html?warehouseId=${warehouseId}`;
    };
    
    const btnCreateTransfer = document.getElementById("btnCreateTransfer");
    if (btnCreateTransfer) btnCreateTransfer.onclick = () => {
        window.location.href = `/pages/transfers.html?warehouseId=${warehouseId}`;
    };
    
    const btnPrintQR = document.getElementById("btnPrintQR");
    if (btnPrintQR) btnPrintQR.onclick = () => {
        window.open(`/labels.html?warehouseId=${warehouseId}`, "_blank");
    };
    
    // Автогенерация - используем стрелочную функцию вместо прямой ссылки
    const btnAutoGenerate = document.getElementById("btnAutoGenerate");
    if (btnAutoGenerate) {
        btnAutoGenerate.onclick = () => {
            const modal = document.getElementById("autoGenerateOverlay");
            if (modal) modal.classList.remove("hidden");
            updateAutoGenerateSummary();
        };
    }
    
    // Действия в модалке локации
    const btnCreateReceiptToLocation = document.getElementById("btnCreateReceiptToLocation");
    if (btnCreateReceiptToLocation) {
        btnCreateReceiptToLocation.onclick = () => {
            if (currentLocation) {
                window.location.href = `/pages/receipts.html?warehouseId=${warehouseId}&locationId=${currentLocation.id}`;
                closeLocationDetail();
            }
        };
    }
    
    const btnCreateIssueFromLocation = document.getElementById("btnCreateIssueFromLocation");
    if (btnCreateIssueFromLocation) {
        btnCreateIssueFromLocation.onclick = () => {
            if (currentLocation) {
                window.location.href = `/pages/issues.html?warehouseId=${warehouseId}&locationId=${currentLocation.id}`;
                closeLocationDetail();
            }
        };
    }
    
    // Обновление подсчёта при изменении параметров
    ['ag_zoneCount', 'ag_rackCount', 'ag_shelfCount', 'ag_binCount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateAutoGenerateSummary);
        }
    });
}

function filterLocations() {
    const search = document.getElementById("locationSearch")?.value.toLowerCase() || "";
    const type = document.getElementById("locationTypeFilter")?.value || "";
    const stock = document.getElementById("locationStockFilter")?.value || "";
    
    document.querySelectorAll(".location-node").forEach(node => {
        const code = node.querySelector(".node-code")?.textContent.toLowerCase() || "";
        const name = node.querySelector(".node-name")?.textContent.toLowerCase() || "";
        const nodeText = code + " " + name;
        const hasStock = node.querySelector(".node-status")?.textContent.includes("📦") || false;
        
        const matchSearch = !search || nodeText.includes(search);
        const matchType = !type || true; // Упрощённо
        const matchStock = stock === "" || (stock === "empty" && !hasStock) || (stock === "stocked" && hasStock);
        
        node.style.display = (matchSearch && matchType && matchStock) ? "" : "none";
    });
}

function filterProducts() {
    const search = document.getElementById("productSearch")?.value.toLowerCase() || "";
    document.querySelectorAll("#productsTable tbody tr").forEach(tr => {
        const text = tr.textContent.toLowerCase();
        tr.style.display = text.includes(search) ? "" : "none";
    });
}

/* ==================== AUTO GENERATE ==================== */

function updateAutoGenerateSummary() {
    const zoneCount = Number(document.getElementById("ag_zoneCount")?.value) || 0;
    const rackCount = Number(document.getElementById("ag_rackCount")?.value) || 0;
    const shelfCount = Number(document.getElementById("ag_shelfCount")?.value) || 0;
    const binCount = Number(document.getElementById("ag_binCount")?.value) || 0;
    
    const totalRacks = zoneCount * rackCount;
    const totalShelves = totalRacks * shelfCount;
    const totalBins = totalShelves * binCount;
    
    const summaryEl = document.getElementById("ag_summary");
    if (summaryEl) {
        summaryEl.textContent = 
            `Зон: ${zoneCount}, Стеллажей: ${totalRacks}, Полок: ${totalShelves}, Ячеек: ${totalBins}`;
    }
}

window.closeAutoGenerate = function() {
    const modal = document.getElementById("autoGenerateOverlay");
    if (modal) modal.classList.add("hidden");
}

window.generateStructure = async function() {
    const zonePrefix = document.getElementById("ag_zonePrefix")?.value.trim() || "Z";
    const zoneCount = Number(document.getElementById("ag_zoneCount")?.value) || 0;
    const rackPrefix = document.getElementById("ag_rackPrefix")?.value.trim() || "R";
    const rackCount = Number(document.getElementById("ag_rackCount")?.value) || 0;
    const shelfPrefix = document.getElementById("ag_shelfPrefix")?.value.trim() || "S";
    const shelfCount = Number(document.getElementById("ag_shelfCount")?.value) || 0;
    const binPrefix = document.getElementById("ag_binPrefix")?.value.trim() || "B";
    const binCount = Number(document.getElementById("ag_binCount")?.value) || 0;
    
    if (!confirm(`Будет создано:\nЗон: ${zoneCount}\nСтеллажей: ${zoneCount * rackCount}\nПолок: ${zoneCount * rackCount * shelfCount}\nЯчеек: ${zoneCount * rackCount * shelfCount * binCount}\n\nПродолжить?`)) {
        return;
    }
    
    alertBox("info", "Создание структуры... Это может занять время");
    
    let created = 0;
    const errors = [];
    
    try {
        // Создаём зоны
        for (let z = 1; z <= zoneCount; z++) {
            let zoneId = null;
            try {
                const zoneRes = await api("POST", "/api/locations", {
                    warehouseId,
                    code: `${zonePrefix}${z}`,
                    name: `Зона ${zonePrefix}${z}`,
                    type: "ZONE"
                });
                zoneId = zoneRes.id;
                created++;
            } catch (e) {
                errors.push(`Зона ${zonePrefix}${z}: ${e.message}`);
                continue;
            }
            
            // Создаём стеллажи в зоне
            for (let r = 1; r <= rackCount; r++) {
                let rackId = null;
                try {
                    const rackRes = await api("POST", "/api/locations", {
                        warehouseId,
                        parentId: zoneId,
                        code: `${zonePrefix}${z}-${rackPrefix}${r}`,
                        name: `Стеллаж ${zonePrefix}${z}-${rackPrefix}${r}`,
                        type: "RACK"
                    });
                    rackId = rackRes.id;
                    created++;
                } catch (e) {
                    errors.push(`Стеллаж ${zonePrefix}${z}-${rackPrefix}${r}: ${e.message}`);
                    continue;
                }
                
                // Создаём полки на стеллаже
                for (let s = 1; s <= shelfCount; s++) {
                    let shelfId = null;
                    try {
                        const shelfRes = await api("POST", "/api/locations", {
                            warehouseId,
                            parentId: rackId,
                            code: `${zonePrefix}${z}-${rackPrefix}${r}-${shelfPrefix}${s}`,
                            name: `Полка ${zonePrefix}${z}-${rackPrefix}${r}-${shelfPrefix}${s}`,
                            type: "SHELF"
                        });
                        shelfId = shelfRes.id;
                        created++;
                    } catch (e) {
                        errors.push(`Полка ${zonePrefix}${z}-${rackPrefix}${r}-${shelfPrefix}${s}: ${e.message}`);
                        continue;
                    }
                    
                    // Создаём ячейки на полке
                    for (let b = 1; b <= binCount; b++) {
                        try {
                            await api("POST", "/api/locations", {
                                warehouseId,
                                parentId: shelfId,
                                code: `${zonePrefix}${z}-${rackPrefix}${r}-${shelfPrefix}${s}-${binPrefix}${b}`,
                                name: `Ячейка ${zonePrefix}${z}-${rackPrefix}${r}-${shelfPrefix}${s}-${binPrefix}${b}`,
                                type: "BIN"
                            });
                            created++;
                        } catch (e) {
                            errors.push(`Ячейка ${zonePrefix}${z}-${rackPrefix}${r}-${shelfPrefix}${s}-${binPrefix}${b}: ${e.message}`);
                        }
                    }
                }
            }
        }
        
        if (errors.length > 0) {
            alertBox("warning", `Создано: ${created}. Ошибок: ${errors.length}`);
            console.error("[generateStructure] errors:", errors);
        } else {
            alertBox("success", `Создано ${created} локаций`);
        }
        
        closeAutoGenerate();
        await loadLocations();
        await loadOverview();
        
    } catch (e) {
        alertBox("error", `Ошибка: ${e.message}`);
    }
}