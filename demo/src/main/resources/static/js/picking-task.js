/**
 * Picking Task Logic — Страница выполнения задачи сборки
 */

const API_BASE = '';

let currentTask = null;
let currentRoute = null;
let html5QrCode = null;
let currentScanType = ''; // 'product', 'shipment'
let currentItemIndex = 0;
let routeOrderMap = {};
let shipmentLocationId = null;

// Init
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    if (!taskId) {
        alert('Нет ID задачи');
        window.location.href = 'tasks.html';
        return;
    }
    loadTask(taskId);
    document.getElementById('scannerOverlay').querySelector('.btn').onclick = closeScanner;
    document.getElementById('completeBtn').onclick = completeTask;
});

async function api(method, url, body) {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/index.html'; throw new Error('No token'); }
    const opts = { method, headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + url, opts);
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'Request failed');
    }
    return res.json();
}

async function loadTask(taskId) {
    try {
        currentTask = await api('GET', `/api/tasks/${taskId}`);
        
        // Load route if exists
        if (currentTask.routeId) {
            try {
                currentRoute = await api('GET', `/api/routes/task/${taskId}`);
                // запомним порядок точек маршрута для сортировки групп
                const points = currentRoute.points || currentRoute.routePoints || [];
                routeOrderMap = {};
                points.forEach((p, idx) => {
                    const locId = p.locationId || p.id;
                    if (locId) routeOrderMap[locId] = p.sortOrder ?? idx;
                });
                // возможная ячейка отгрузки от сервера
                shipmentLocationId = currentRoute.shipmentLocationId || currentTask.shipmentLocationId || null;
            } catch (e) {
                console.warn('No route found');
                routeOrderMap = {};
            }
        }
        
        renderTask();
    } catch (e) {
        alert(e.message);
        window.location.href = 'tasks.html';
    }
}

function renderTask() {
    document.getElementById('taskNumber').textContent = currentTask.number;
    document.getElementById('taskMeta').textContent = 'Сборка • ' + (currentTask.warehouseName || '');
    
    const container = document.getElementById('routeContainer');
    container.innerHTML = '';
    
    const items = currentTask.items || [];
    let completed = 0;
    
    // Group items by location (route points)
    const locationGroups = {};
    items.forEach((item, idx) => {
        const locId = item.locationId || 'unknown';
        if (!locationGroups[locId]) {
            locationGroups[locId] = { locationName: item.locationName || 'Не указана', items: [] };
        }
        locationGroups[locId].items.push({ ...item, index: idx });
    });
    
    // Сортируем группы по маршруту (если есть), иначе по имени
    const groupsSorted = Object.entries(locationGroups).sort((a, b) => {
        const aId = a[0], bId = b[0];
        const aOrder = routeOrderMap[aId] ?? Number.MAX_SAFE_INTEGER;
        const bOrder = routeOrderMap[bId] ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a[1].locationName || '').localeCompare(b[1].locationName || '');
    }).map(([_, group]) => group);
    
    let stepNum = 1;
    groupsSorted.forEach(group => {
        const div = document.createElement('div');
        div.className = 'route-step';
        div.id = `step-${stepNum}`;
        
        const groupCompleted = group.items.every(i => i.confirmed);
        if (groupCompleted) {
            div.classList.add('completed');
            completed += group.items.length;
        } else {
            div.classList.add('active');
        }
        
        let itemsHtml = '';
        group.items.forEach(item => {
            const scanned = item.confirmed || item.scannedCount > 0;
            const remaining = item.qtyPlanned - (item.qtyActual || 0);
            
            itemsHtml += `
                <div class="product-info">
                    <div>
                        <div class="product-name">${item.productName}</div>
                        <div style="color:var(--muted); font-size:13px;">Артикул: ${item.productSku || '—'}</div>
                    </div>
                    <div class="product-qty">${remaining > 0 ? remaining : '✓'}</div>
                </div>
                
                ${!item.confirmed ? `
                    <div class="scan-area ${scanned ? 'done' : ''}" onclick="scanProduct(${item.index})" id="scan-prod-${item.index}">
                        <span class="scan-icon">${scanned ? '✅' : '📦'}</span>
                        <span class="scan-text">${scanned ? 'Товар отсканирован' : 'Сканировать товар'}</span>
                    </div>
                    <div class="qty-input">
                        <button class="qty-btn" onclick="adjustQty(${item.index}, -1)">−</button>
                        <div class="qty-display" id="qty-${item.index}">${item.qtyActual || 0}</div>
                        <button class="qty-btn" onclick="adjustQty(${item.index}, 1)">+</button>
                    </div>
                    ${remaining <= 0 && !item.confirmed ? `
                        <button class="btn btn-success" style="width:100%; margin-top:12px;" onclick="confirmItem(${item.index})">Подтвердить</button>
                    ` : ''}
                ` : '<div style="text-align:center; color:var(--success); font-weight:600; padding:12px;">✓ Собрано</div>'}
            `;
        });
        
        div.innerHTML = `
            <div class="route-step-header" onclick="toggleStep(${stepNum})">
                <div class="step-number">${stepNum}</div>
                <div style="flex:1;">
                    <div style="font-weight:600;">Ячейка: ${group.locationName}</div>
                    <div style="color:var(--muted); font-size:13px;">${group.items.length} товаров</div>
                </div>
                <span style="font-size:18px;">${groupCompleted ? '✅' : '▼'}</span>
            </div>
            <div class="step-content">${itemsHtml}</div>
        `;
        
        container.appendChild(div);
        stepNum++;
    });
    
    // Update progress
    const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressText').textContent = `${completed} / ${items.length} собрано`;
    
    // Show shipment area when all collected
    const shipmentArea = document.getElementById('shipmentArea');
    if (pct === 100 && !currentTask.shipmentConfirmed && !currentTask.shipmentScanned) {
        shipmentArea.style.display = 'block';
    } else if (currentTask.shipmentScanned || currentTask.shipmentConfirmed) {
        shipmentArea.style.display = 'block';
        shipmentArea.classList.add('done');
        shipmentArea.innerHTML = '<h3 style="margin:0;">✅ Отгрузка подтверждена</h3>';
    } else {
        shipmentArea.style.display = 'none';
    }
    
    // Complete button
    const btn = document.getElementById('completeBtn');
    if (pct === 100 && (currentTask.shipmentScanned || currentTask.shipmentConfirmed)) {
        btn.disabled = false;
        btn.textContent = '✓ Завершить сборку';
    } else {
        btn.disabled = true;
        btn.textContent = pct === 100 ? 'Отсканируйте ячейку отгрузки' : `Собрано ${completed}/${items.length}`;
    }
}

function toggleStep(stepNum) {
    const step = document.getElementById(`step-${stepNum}`);
    if (step.classList.contains('completed')) return;
    
    // Deactivate all
    document.querySelectorAll('.route-step').forEach(s => s.classList.remove('active'));
    step.classList.add('active');
}

function scanProduct(itemIndex) {
    const item = currentTask.items[itemIndex];
    if (!item || item.confirmed) return;
    
    currentScanType = 'product';
    currentItemIndex = itemIndex;
    openScanner(`Сканируйте QR-код товара: ${item.productName}`);
}

function scanShipmentLocation() {
    currentScanType = 'shipment';
    openScanner('Сканируйте QR-код ячейки отгрузки');
}

function adjustQty(itemIndex, delta) {
    const item = currentTask.items[itemIndex];
    if (!item || item.confirmed) return;
    
    item.qtyActual = Math.max(0, Math.min(item.qtyPlanned, (item.qtyActual || 0) + delta));
    document.getElementById(`qty-${itemIndex}`).textContent = item.qtyActual;
    
    // Update remaining display
    const remaining = item.qtyPlanned - item.qtyActual;
    const qtyDisplay = document.querySelector(`#step-${itemIndex + 1} .product-qty`);
    if (qtyDisplay) qtyDisplay.textContent = remaining > 0 ? remaining : '✓';
    
    // Show confirm button if qty matches
    const container = document.getElementById(`scan-prod-${itemIndex}`);
    if (container && item.qtyActual === item.qtyPlanned) {
        // Auto-confirm if qty matches
        confirmItem(itemIndex);
    }
}

async function confirmItem(itemIndex) {
    const item = currentTask.items[itemIndex];
    if (!item || item.confirmed) return;
    
    try {
        await api('POST', `/api/tasks/${currentTask.id}/items/${item.id}/confirm`, {
            qtyActual: item.qtyActual || item.qtyPlanned
        });
        
        item.confirmed = true;
        item.qtyActual = item.qtyPlanned;
        showToast(`✓ ${item.productName} собран`);
        
        if (navigator.vibrate) navigator.vibrate(200);
        
        // Reload to update UI
        currentTask = await api('GET', `/api/tasks/${currentTask.id}`);
        renderTask();
        
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function openScanner(title) {
    const overlay = document.getElementById('scannerOverlay');
    overlay.style.display = 'flex';
    document.getElementById('scannerTitle').textContent = title || 'Сканирование';
    
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {}
    ).catch(err => {
        console.error(err);
        alert('Ошибка камеры: ' + err);
        closeScanner();
    });
}

function closeScanner() {
    document.getElementById('scannerOverlay').style.display = 'none';
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(() => {});
    }
    currentScanType = '';
    currentItemIndex = 0;
}

async function onScanSuccess(decodedText) {
    try {
        const data = JSON.parse(decodedText);
        if (!data.t || !data.id) {
            showToast('Неверный QR-код', 'error');
            return;
        }
        
        if (currentScanType === 'product') {
            const item = currentTask.items[currentItemIndex];
            if (!item || item.confirmed) { closeScanner(); return; }
            
            if (data.t !== 'product' || data.id !== item.productId) {
                showToast('Неверный товар!', 'error');
                return;
            }
            
            // Increment qty or confirm
            if (!item.qtyActual) item.qtyActual = 0;
            item.qtyActual++;
            
            showToast(`✓ ${item.productName} (${item.qtyActual}/${item.qtyPlanned})`);
            
            if (item.qtyActual >= item.qtyPlanned) {
                await confirmItem(currentItemIndex);
            }
            
            closeScanner();
            
        } else if (currentScanType === 'shipment') {
            // Verify shipment location
            if (data.t !== 'loc') {
                showToast('Ожидается QR ячейки', 'error');
                return;
            }
            if (shipmentLocationId && data.id !== shipmentLocationId) {
                showToast('Не та ячейка отгрузки', 'error');
                return;
            }

            // отправляем подтверждение на сервер
            await api('POST', `/api/tasks/${currentTask.id}/shipment/confirm`, {
                locationId: data.id
            });

            currentTask.shipmentScanned = true;
            currentTask.shipmentConfirmed = true;
            currentTask.shipmentLocationId = data.id;
            showToast('✓ Ячейка отгрузки подтверждена');
            closeScanner();
            
            // Update UI
            renderTask();
            if (navigator.vibrate) navigator.vibrate(300);
        }
        
    } catch (e) {
        console.error(e);
        showToast('Ошибка: ' + e.message, 'error');
    }
}

async function completeTask() {
    if (!confirm('Завершить сборку?')) return;
    try {
        await api('POST', `/api/tasks/${currentTask.id}/complete`);
        showToast('Сборка завершена!');
        setTimeout(() => window.location.href = 'tasks.html', 1500);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
