/**
 * Receipt Task Logic — Страница выполнения задачи приёмки
 */

const API_BASE = '';

let currentTask = null;
let html5QrCode = null;
let currentScanItem = null;
let currentScanType = ''; // 'product' or 'location'

// Init
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    if (!taskId) {
        alert('Нет ID задачи');
        window.location.href = '/pages/worker/index.html';
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
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function loadTask(taskId) {
    try {
        currentTask = await api('GET', `/api/tasks/${taskId}`);
        renderTask();
    } catch (e) {
        alert(e.message);
        window.location.href = '/pages/worker/index.html';
    }
}

function renderTask() {
    document.getElementById('taskNumber').textContent = currentTask.number;
    document.getElementById('taskMeta').textContent = 'Приёмка • ' + (currentTask.warehouseName || '');
    
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';
    
    let completed = 0;
    const items = currentTask.items || [];
    
    items.forEach(item => {
        if (item.confirmed) completed++;
        
        const div = document.createElement('div');
        div.className = 'item-card' + (item.confirmed ? ' completed' : '');
        div.id = `item-${item.id}`;
        
        const productStep = item.confirmed ? 'done' : (item.scannedProduct ? 'done' : '');
        const locationStep = item.confirmed ? 'done' : (item.scannedLocation ? 'done' : '');
        const locationHtml = item.locationId
            ? `<div class="target-location">
                    <div class="target-location-label">Отнести в ячейку</div>
                    <div class="target-location-value">
                        <span class="target-location-code">${item.locationCode || ('#' + item.locationId)}</span>
                        ${item.locationName || ''}
                    </div>
               </div>`
            : `<div class="target-location missing">
                    <div class="target-location-label">Ячейка не указана</div>
                    <div class="target-location-value">Проверьте строку приёмки</div>
               </div>`;
        
        div.innerHTML = `
            <div style="display:flex; gap:12px; align-items:flex-start;">
                ${item.productImageUrl ? `<img src="${item.productImageUrl}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--border); flex-shrink:0;" onerror="this.style.display='none'">` : ''}
                <div style="flex:1;">
                    <div class="item-name">${item.productName}</div>
                    <div class="item-meta">Артикул: ${item.productSku || '—'}</div>
                    <div class="item-qty">Кол-во: ${item.qtyPlanned}</div>
                </div>
            </div>
            ${locationHtml}
            
            <div class="scan-steps">
                <div class="scan-step ${productStep}" onclick="scanProduct(${item.id})" id="scan-prod-${item.id}">
                    <span class="scan-step-icon">📦</span>
                    <span class="scan-step-label">${productStep === 'done' ? 'Товар ✓' : 'Сканировать товар'}</span>
                </div>
                <div class="scan-step ${locationStep}" onclick="scanLocation(${item.id})" id="scan-loc-${item.id}">
                    <span class="scan-step-icon">📍</span>
                    <span class="scan-step-label">${locationStep === 'done' ? 'Ячейка ✓' : 'Сканировать ячейку'}</span>
                </div>
            </div>
        `;
        
        container.appendChild(div);
    });
    
    // Update progress
    const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressText').textContent = `${completed} / ${items.length} выполнено`;
    
    // Complete button state
    const btn = document.getElementById('completeBtn');
    if (pct === 100) {
        btn.disabled = false;
        btn.textContent = '✓ Завершить приёмку';
    } else {
        btn.disabled = true;
        btn.textContent = `Завершите все позиции (${items.length - completed} ост.)`;
    }
}

function scanProduct(itemId) {
    const item = currentTask.items.find(i => i.id === itemId);
    if (!item || item.confirmed) return;
    
    currentScanItem = item;
    currentScanType = 'product';
    openScanner(`Сканируйте QR-код товара: ${item.productName}`);
}

function scanLocation(itemId) {
    const item = currentTask.items.find(i => i.id === itemId);
    if (!item || item.confirmed) return;
    // Check if product is scanned first
    if (!item.scannedProduct) {
        alert('Сначала отсканируйте товар');
        return;
    }
    
    currentScanItem = item;
    currentScanType = 'location';
    openScanner(`Сканируйте QR-код ячейки для: ${item.productName}`);
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
    currentScanItem = null;
    currentScanType = '';
}

async function skipScan() {
    if (!currentScanItem) { closeScanner(); return; }
    
    if (currentScanType === 'product') {
        currentScanItem.scannedProduct = true;
        showToast('Товар подтверждён (без сканирования) ✓');
    } else if (currentScanType === 'location') {
        currentScanItem.scannedLocation = true;
        currentScanItem.confirmed = true;
        currentScanItem.qtyActual = currentScanItem.qtyPlanned;
        
        try {
            await api('POST', `/api/tasks/${currentTask.id}/items/${currentScanItem.id}/confirm`, {
                qtyActual: currentScanItem.qtyPlanned
            });
        } catch(e) { console.warn('Confirm API error:', e); }
        
        showToast('Позиция подтверждена (без сканирования) ✓');
    }
    
    closeScanner();
    currentTask = await api('GET', `/api/tasks/${currentTask.id}`);
    renderTask();
}

async function onScanSuccess(decodedText) {
    if (!currentScanItem) { closeScanner(); return; }
    
    try {
        const data = JSON.parse(decodedText);
        if (!data.t || !data.id) {
            showToast('Неверный QR-код', 'error');
            return;
        }
        
        const scannedId = data.id;
        const scannedType = data.t;
        
        if (currentScanType === 'product') {
            if (scannedType !== 'product' || scannedId !== currentScanItem.productId) {
                showToast('Неверный товар!', 'error');
                return;
            }
            // Mark product as scanned
            currentScanItem.scannedProduct = true;
            showToast('Товар подтверждён ✓');
        } else if (currentScanType === 'location') {
            if (scannedType !== 'loc' || scannedId !== currentScanItem.locationId) {
                showToast('Неверная ячейка!', 'error');
                return;
            }
            // Mark location as scanned and confirm item
            currentScanItem.scannedLocation = true;
            currentScanItem.confirmed = true;
            currentScanItem.qtyActual = currentScanItem.qtyPlanned;
            
            // Confirm via API
            await api('POST', `/api/tasks/${currentTask.id}/items/${currentScanItem.id}/confirm`, {
                qtyActual: currentScanItem.qtyPlanned
            });
            
            showToast('Позиция подтверждена ✓');
        }
        
        closeScanner();
        
        // Reload task to update state
        currentTask = await api('GET', `/api/tasks/${currentTask.id}`);
        renderTask();
        
        // Vibrate on success
        if (navigator.vibrate) navigator.vibrate(200);
        
    } catch (e) {
        console.error(e);
        showToast('Ошибка: ' + e.message, 'error');
    }
}

async function completeTask() {
    if (!confirm('Завершить приёмку?')) return;
    try {
        await api('POST', `/api/tasks/${currentTask.id}/complete`);
        showToast('Приёмка завершена!');
        setTimeout(() => window.location.href = '/pages/worker/index.html', 1500);
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

// Глобальные функции
window.skipScan = skipScan;
window.closeScanner = closeScanner;
window.scanProduct = scanProduct;
window.scanLocation = scanLocation;
window.completeTask = completeTask;
window.onScanSuccess = onScanSuccess;
