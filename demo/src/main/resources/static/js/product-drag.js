/**
 * Product Drag-and-Drop Module
 * Позволяет перемещать товары между ячейками склада задерживая клик
 */

window.ProductDrag = {
    // Состояние
    longPressTimer: null,
    isDragging: false,
    draggedProduct: null,
    longPressDuration: 500, // мс до начала drag
    dragElement: null,

    // Инициализация
    init() {
        console.log('[ProductDrag] Initialized');
        
        // Создаём элемент для перетаскивания
        this.createDragElement();
        
        // Глобальные обработчики для drag
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    },

    // Создание визуального элемента перетаскивания
    createDragElement() {
        const el = document.createElement('div');
        el.id = 'product-drag-element';
        el.className = 'product-drag-element hidden';
        el.innerHTML = `
            <div class="drag-content">
                <span class="drag-icon"></span>
                <span class="drag-text">Перемещение...</span>
            </div>
        `;
        document.body.appendChild(el);
        this.dragElement = el;
    },

    // Начало long press (мышь)
    handleMouseDown(e, product) {
        if (e.button !== 0) return; // Только левая кнопка
        
        // Игнорируем клики на кнопках действий
        if (e.target.closest('.no-drag')) {
            return;
        }
        
        // Предотвращаем выделение и стандартное поведение
        e.preventDefault();
        
        this.longPressTimer = setTimeout(() => {
            this.startDrag(product, e);
        }, this.longPressDuration);
    },

    // Начало long press (тач)
    handleTouchStart(e, product) {
        // Игнорируем клики на кнопках действий
        if (e.target.closest('.no-drag')) {
            return;
        }
        
        // Предотвращаем скролл и выделение
        e.preventDefault();
        
        this.longPressTimer = setTimeout(() => {
            this.startDrag(product, e.touches[0]);
        }, this.longPressDuration);
    },

    // Отмена long press
    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    },

    // Начало перетаскивания
    startDrag(product, event) {
        this.isDragging = true;
        this.draggedProduct = product;
        
        // Показываем элемент перетаскивания
        this.dragElement.classList.remove('hidden');
        this.updateDragPosition(event.clientX, event.clientY);
        
        // Визуальная обратная связь
        document.body.style.cursor = 'grabbing';
        
        // Звуковой сигнал (опционально)
        this.playDragSound();
        
        console.log('[ProductDrag] Started dragging:', product.name);
    },

    // Перемещение элемента
    updateDragPosition(x, y) {
        if (this.dragElement) {
            this.dragElement.style.left = (x - 75) + 'px';
            this.dragElement.style.top = (y - 40) + 'px';
        }
    },

    // Обработка движения мыши
    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        this.updateDragPosition(e.clientX, e.clientY);
        
        // Подсветка целевой зоны
        this.highlightDropTarget(e.target);
    },

    // Обработка движения тача
    handleTouchMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault(); // Предотвращаем скролл
        const touch = e.touches[0];
        this.updateDragPosition(touch.clientX, touch.clientY);
        this.highlightDropTarget(touch.target);
    },

    // Подсветка зоны для drop
    highlightDropTarget(target) {
        // Убираем предыдущую подсветку
        document.querySelectorAll('.drop-target-highlight').forEach(el => {
            el.classList.remove('drop-target-highlight');
        });
        
        // Ищем ближайшую ячейку или склад
        const dropZone = target.closest('.drop-zone');
        if (dropZone) {
            dropZone.classList.add('drop-target-highlight');
        }
    },

    // Окончание перетаскивания (мышь)
    handleMouseUp(e) {
        this.cancelLongPress();
        
        if (!this.isDragging) return;
        
        this.endDrag(e.target);
    },

    // Окончание перетаскивания (тач)
    handleTouchEnd(e) {
        this.cancelLongPress();
        
        if (!this.isDragging) return;
        
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        this.endDrag(target);
    },

    // Завершение перетаскивания
    endDrag(target) {
        this.isDragging = false;
        document.body.style.cursor = '';

        // Скрываем элемент перетаскивания
        this.dragElement.classList.add('hidden');

        // Убираем подсветку
        document.querySelectorAll('.drop-target-highlight').forEach(el => {
            el.classList.remove('drop-target-highlight');
        });

        // Ищем зону для drop - сначала проверяем локацию, потом склад
        const dropZone = target.closest('.drop-zone');
        if (dropZone) {
            const locationId = dropZone.dataset.locationId;
            const warehouseId = dropZone.dataset.warehouseId;

            if (locationId) {
                // Перемещение на конкретную ячейку - сначала выбираем источник
                this.openDragSourceModal(this.draggedProduct);
            } else if (warehouseId) {
                // Перемещение на склад - сначала выбираем источник, потом цель
                this.openDragSourceModal(this.draggedProduct);
            }
        }

        this.draggedProduct = null;
    },

    // Открытие модального окна выбора источника (откуда списать)
    openDragSourceModal(product) {
        if (window.ProductDragSourceSelect) {
            window.ProductDragSourceSelect.open(product);
        }
    },

    // Открытие модального окна перемещения
    openTransferModal(product, locationId) {
        if (window.ProductTransferModal) {
            window.ProductTransferModal.open(product, locationId);
        }
    },

    // Открытие модального окна выбора склада
    openWarehouseModal(product, warehouseId) {
        if (window.WarehouseLocationSelect) {
            window.WarehouseLocationSelect.open(product, warehouseId);
        }
    },

    // Звук начала перетаскивания
    playDragSound() {
        // Опционально: можно добавить звуковой сигнал
        // const audio = new Audio('/sounds/drag-start.mp3');
        // audio.play().catch(() => {});
    },

    // Привязка к элементам товаров
    attachToProductRows() {
        const rows = document.querySelectorAll('#productsTableBody tr');
        rows.forEach(row => {
            const productId = row.dataset.productId;
            if (!productId) return;
            
            const product = this.findProductById(parseInt(productId));
            if (!product) return;
            
            // Запрет контекстного меню
            row.addEventListener('contextmenu', (e) => e.preventDefault());
            
            // Мышь
            row.addEventListener('mousedown', (e) => this.handleMouseDown(e, product));
            row.addEventListener('mouseleave', () => this.cancelLongPress());
            row.addEventListener('mouseup', () => this.cancelLongPress());
            
            // Тач
            row.addEventListener('touchstart', (e) => this.handleTouchStart(e, product), { passive: false });
            row.addEventListener('touchend', () => this.cancelLongPress());
            row.addEventListener('touchcancel', () => this.cancelLongPress());
            
            // Добавляем визуальную подсказку
            row.style.cursor = 'grab';
            row.title = 'Удерживайте для перемещения товара';
        });
    },

    // Поиск товара по ID
    findProductById(id) {
        if (window.ProductsPage && window.ProductsPage.products) {
            return window.ProductsPage.products.find(p => p.id === id);
        }
        return null;
    },

    // Обновление привязок после рендеринга
    refresh() {
        this.attachToProductRows();
    }
};

// ============================================
// PRODUCT TRANSFER MODAL
// ============================================
window.ProductTransferModal = {
    currentProduct: null,
    targetLocationId: null,

    init() {
        this.createModal();
    },

    createModal() {
        const modalHtml = `
            <div id="productTransferModal" class="modal-overlay hidden">
                <div class="modal" style="max-width: 500px;">
                    <div class="section-title">
                        <div>
                            <p class="eyebrow">Перемещение товара</p>
                            <h3 id="transferModalTitle"> Перемещение</h3>
                        </div>
                        <button class="btn btn-secondary" onclick="ProductTransferModal.close()"> Закрыть</button>
                    </div>
                    
                    <div style="padding: 24px;">
                        <div class="info-item" style="margin-bottom: 16px;">
                            <span class="label">Товар</span>
                            <span id="transferProductName" class="value" style="font-weight: 600;">—</span>
                        </div>
                        
                        <div class="info-item" style="margin-bottom: 16px;">
                            <span class="label">Артикул</span>
                            <span id="transferProductSku" class="value">—</span>
                        </div>
                        
                        <div class="info-item" style="margin-bottom: 24px;">
                            <span class="label">Целевая локация</span>
                            <span id="transferLocationName" class="value">—</span>
                        </div>
                        
                        <div style="margin-bottom: 24px;">
                            <label>Количество для перемещения</label>
                            <input type="number" id="transferQuantity" class="input" value="1" min="1" style="font-size: 16px; padding: 12px;">
                        </div>
                        
                        <div id="transferAlert"></div>
                        
                        <div class="toolbar" style="justify-content: flex-end; gap: 12px;">
                            <button type="button" class="btn btn-secondary" onclick="ProductTransferModal.close()">Отмена</button>
                            <button type="button" class="btn btn-primary" onclick="ProductTransferModal.confirm()"> Подтвердить</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const temp = document.createElement('div');
        temp.innerHTML = modalHtml;
        document.body.appendChild(temp.firstElementChild);
    },

    async open(product, locationId) {
        this.currentProduct = product;
        this.targetLocationId = locationId;
        this.sourceLocationId = null;
        this.batchId = null;
        this.maxQty = product.totalQty || 1;

        // Заполняем информацию
        document.getElementById('transferProductName').textContent = product.name;
        document.getElementById('transferProductSku').textContent = product.sku;

        // Загружаем информацию о локации
        await this.loadLocationInfo(locationId);

        // Устанавливаем максимальное количество
        const qtyInput = document.getElementById('transferQuantity');
        qtyInput.value = this.maxQty;
        qtyInput.max = this.maxQty;

        document.getElementById('productTransferModal').classList.remove('hidden');
    },

    // Новая версия open с явным указанием source location и batch
    async openWithSource(product, targetLocationId, sourceLocationId, batchId, maxQty) {
        this.currentProduct = product;
        this.targetLocationId = targetLocationId;
        this.sourceLocationId = sourceLocationId;
        this.batchId = batchId;
        this.maxQty = maxQty;

        // Заполняем информацию
        document.getElementById('transferProductName').textContent = product.name;
        document.getElementById('transferProductSku').textContent = product.sku;

        // Загружаем информацию о целевой локации
        await this.loadLocationInfo(targetLocationId);

        // Устанавливаем максимальное количество
        const qtyInput = document.getElementById('transferQuantity');
        qtyInput.value = maxQty;
        qtyInput.max = maxQty;

        document.getElementById('productTransferModal').classList.remove('hidden');
    },

    async loadLocationInfo(locationId) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/locations/${locationId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) {
                throw new Error('Location not found');
            }
            const location = await res.json();
            
            document.getElementById('transferLocationName').textContent = 
                `${location.name} (${location.code}) - ${location.warehouseName || 'Склад #' + location.warehouseId}`;
        } catch (e) {
            document.getElementById('transferLocationName').textContent = 
                `Локация #${locationId}`;
        }
    },

    close() {
        document.getElementById('productTransferModal').classList.add('hidden');
        document.getElementById('transferAlert').innerHTML = '';
    },

    async confirm() {
        const quantity = parseInt(document.getElementById('transferQuantity').value);
        const token = localStorage.getItem('token');
        const userId = parseInt(localStorage.getItem('userId') || '1');

        console.log('[ProductTransferModal] Confirm:', {
            quantity,
            productId: this.currentProduct?.id,
            sourceLocationId: this.sourceLocationId,
            targetLocationId: this.targetLocationId,
            batchId: this.batchId
        });

        if (quantity <= 0) {
            this.showNotification('error', 'Количество должно быть больше 0');
            return;
        }

        if (quantity > this.maxQty) {
            this.showNotification('error', 'Недостаточно товара для перемещения');
            return;
        }

        try {
            // Используем сохранённые source location и batch если они есть
            let sourceLocationId = this.sourceLocationId;
            let batchId = this.batchId;

            // Если source location не указан, загружаем остатки
            if (!sourceLocationId) {
                const stocksRes = await fetch(`/api/stocks?productId=${this.currentProduct.id}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const stocks = await stocksRes.json();

                if (stocks.length === 0) {
                    this.showNotification('error', 'Товар не найден на складе');
                    return;
                }

                // Берём первую локацию с товаром
                const sourceStock = stocks[0];
                sourceLocationId = sourceStock.locationId;
                batchId = sourceStock.batchId;
            }

            console.log('[ProductTransferModal] Creating transfer:', {
                fromLocationId: sourceLocationId,
                toLocationId: this.targetLocationId,
                productId: this.currentProduct.id,
                batchId: batchId,
                qty: quantity
            });

            // Создаём документ перемещения
            const transferData = {
                fromLocationId: sourceLocationId,
                toLocationId: this.targetLocationId,
                createdById: userId
            };

            const transferRes = await fetch('/api/transfers', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transferData)
            });

            if (!transferRes.ok) {
                const errorText = await transferRes.text();
                console.error('[ProductTransferModal] Transfer create error:', transferRes.status, errorText);
                this.showNotification('error', 'Ошибка создания перемещения: ' + transferRes.status);
                return;
            }

            const transfer = await transferRes.json();
            console.log('[ProductTransferModal] Transfer created:', transfer);

            // Добавляем товар в перемещение
            const itemData = {
                productId: this.currentProduct.id,
                batchId: batchId || 1,
                qty: quantity
            };

            const itemRes = await fetch(`/api/transfers/${transfer.id}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });

            if (!itemRes.ok) {
                const errorText = await itemRes.text();
                console.error('[ProductTransferModal] Item add error:', itemRes.status, errorText);
                this.showNotification('error', 'Ошибка добавления товара: ' + itemRes.status);
                return;
            }

            const item = await itemRes.json();
            console.log('[ProductTransferModal] Item added:', item);

            // Проводим документ
            const commitRes = await fetch(`/api/transfers/${transfer.id}/commit`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!commitRes.ok) {
                const errorData = await commitRes.json().catch(() => ({}));
                const errorMsg = errorData.message || 'Ошибка проведения документа';
                console.error('[ProductTransferModal] Commit error:', commitRes.status, errorMsg);
                this.showNotification('error', errorMsg);
                return;
            }

            // Ответ может быть пустым (200 OK без тела)
            const commitResult = await commitRes.json().catch(() => null);
            console.log('[ProductTransferModal] Transfer committed:', commitResult || 'OK (empty response)');

            // Успех
            this.showNotification('success', 'Товар успешно перемещён!');

            // Обновляем список товаров
            if (window.ProductsPage) {
                setTimeout(() => window.ProductsPage.refresh(), 500);
            }

            setTimeout(() => this.close(), 1000);

        } catch (e) {
            console.error('[ProductTransferModal] Error:', e);
            this.showNotification('error', 'Ошибка перемещения: ' + e.message);
        }
    },

    showNotification(type, message) {
        // Создаём toast контейнер если нет
        let container = document.getElementById('productDragToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'productDragToastContainer';
            container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 99999; max-width: 400px;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const icon = type === 'success' ? '✅' : '⚠️';
        const bg = type === 'success' ? '#d4edda' : '#f8d7da';
        const color = type === 'success' ? '#155724' : '#721c24';

        toast.style.cssText = `
            background: ${bg};
            color: ${color};
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
        `;

        toast.innerHTML = `
            <span style="font-size: 18px;">${icon}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; font-size: 18px;">×</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    showError(message) {
        // Устаревший метод, используем showNotification
        this.showNotification('error', message);
    },

    showSuccess(message) {
        // Устаревший метод, используем showNotification
        this.showNotification('success', message);
    }
};

// ============================================
// WAREHOUSE LOCATION SELECT MODAL
// ============================================
window.WarehouseLocationSelect = {
    currentProduct: null,
    warehouseId: null,
    locations: [],

    init() {
        this.createModal();
    },

    createModal() {
        const modalHtml = `
            <div id="warehouseLocationSelectModal" class="modal-overlay hidden">
                <div class="modal" style="max-width: 600px;">
                    <div class="section-title">
                        <div>
                            <p class="eyebrow">Выбор ячейки</p>
                            <h3> Выберите ячейку для перемещения</h3>
                        </div>
                        <button class="btn btn-secondary" onclick="WarehouseLocationSelect.close()"> Закрыть</button>
                    </div>

                    <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                        <input type="text" id="locationSearch" class="input" placeholder=" Поиск ячейки..."
                               oninput="WarehouseLocationSelect.filterLocations()" style="font-size: 14px;">
                    </div>

                    <div id="locationList" style="max-height: 400px; overflow-y: auto; padding: 8px;">
                        <!-- Ячейки рендерятся здесь -->
                    </div>
                </div>
            </div>
        `;

        const temp = document.createElement('div');
        temp.innerHTML = modalHtml;
        document.body.appendChild(temp.firstElementChild);
    },

    async open(product, warehouseId) {
        this.currentProduct = product;
        this.warehouseId = warehouseId;

        // Пытаемся получить локации из ProductsPage
        if (window.ProductsPage && window.ProductsPage.warehouses) {
            const warehouse = window.ProductsPage.warehouses.find(w => w.id === warehouseId);
            if (warehouse && warehouse.locations) {
                this.locations = warehouse.locations;
                this.renderLocations();
                document.getElementById('warehouseLocationSelectModal').classList.remove('hidden');
                return;
            }
        }

        // Загружаем локации если их нет в ProductsPage
        await this.loadLocations(warehouseId);
        this.renderLocations();

        document.getElementById('warehouseLocationSelectModal').classList.remove('hidden');
    },

    async loadLocations(warehouseId) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/locations?warehouseId=${warehouseId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const page = await res.json();
            this.locations = page.content || page || [];
        } catch (e) {
            console.error('[WarehouseLocationSelect] Error:', e);
            this.locations = [];
        }
    },

    renderLocations() {
        const container = document.getElementById('locationList');
        const filtered = this.filterLocationsArray(this.locations);

        if (filtered.length === 0) {
            container.innerHTML = '<div class="muted" style="padding: 24px; text-align: center;">Нет ячеек</div>';
            return;
        }

        container.innerHTML = filtered.map(loc => `
            <div class="location-item" onclick="WarehouseLocationSelect.selectLocation(${loc.id})">
                <span class="location-icon"></span>
                <div class="location-info">
                    <div class="location-code">${loc.code}</div>
                    <div class="location-name">${loc.name}</div>
                </div>
                <span class="location-type">${loc.type || 'BIN'}</span>
            </div>
        `).join('');
    },

    filterLocationsArray(locations) {
        const query = (document.getElementById('locationSearch')?.value || '').toLowerCase();
        if (!query) return locations;

        return locations.filter(loc =>
            (loc.code && loc.code.toLowerCase().includes(query)) ||
            (loc.name && loc.name.toLowerCase().includes(query))
        );
    },

    filterLocations() {
        this.renderLocations();
    },

    selectLocation(locationId) {
        ProductTransferModal.open(this.currentProduct, locationId);
        this.close();
    },

    close() {
        document.getElementById('warehouseLocationSelectModal').classList.add('hidden');
    }
};

// ============================================
// PRODUCT DRAG SOURCE SELECT MODAL (НОВОЕ)
// Модальное окно для выбора мест списания при перетаскивании
// ============================================
window.ProductDragSourceSelect = {
    currentProduct: null,
    stocks: [],
    filteredStocks: [],

    init() {
        this.createModal();
    },

    createModal() {
        const modalHtml = `
            <div id="productDragSourceSelectModal" class="modal-overlay hidden">
                <div class="modal" style="max-width: 700px;">
                    <div class="section-title">
                        <div>
                            <p class="eyebrow">Выбор места списания</p>
                            <h3 id="dragSourceModalTitle"> Выберите откуда списать товар</h3>
                        </div>
                        <button class="btn btn-secondary" onclick="ProductDragSourceSelect.close()"> Закрыть</button>
                    </div>

                    <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                        <div class="info-item" style="margin-bottom: 12px;">
                            <span class="label">Товар</span>
                            <span id="dragSourceProductName" class="value" style="font-weight: 600;">—</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Артикул</span>
                            <span id="dragSourceProductSku" class="value">—</span>
                        </div>
                    </div>

                    <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                        <input type="text" id="dragSourceSearch" class="input" placeholder=" Поиск склада или ячейки..."
                               oninput="ProductDragSourceSelect.filterStocks()" style="font-size: 14px;">
                    </div>

                    <div id="dragSourceList" style="max-height: 400px; overflow-y: auto; padding: 8px;">
                        <!-- Места хранения рендерятся здесь -->
                    </div>

                    <div style="padding: 16px; border-top: 1px solid var(--border); background: #f8f9fa;">
                        <div class="info-item">
                            <span class="label"> Подсказка</span>
                            <div class="value" style="font-size: 12px; color: #6c757d; margin-top: 4px;">
                                Выберите место хранения для списания товара. Учитываются только локации с остатками.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const temp = document.createElement('div');
        temp.innerHTML = modalHtml;
        document.body.appendChild(temp.firstElementChild);
    },

    async open(product) {
        this.currentProduct = product;

        // Заполняем информацию о товаре
        document.getElementById('dragSourceProductName').textContent = product.name;
        document.getElementById('dragSourceProductSku').textContent = product.sku;

        // Загружаем остатки
        await this.loadStocks(product.id);
        this.renderStocks();

        document.getElementById('productDragSourceSelectModal').classList.remove('hidden');
    },

    async loadStocks(productId) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/stocks?productId=${productId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                // Фильтруем только остатки с qty > 0
                const allStocks = await res.json();
                this.stocks = allStocks.filter(s => s.qty > 0);
                console.log('[ProductDragSourceSelect] Loaded stocks:', allStocks.length, 'filtered to:', this.stocks.length);
            } else {
                this.stocks = [];
            }
        } catch (e) {
            console.error('[ProductDragSourceSelect] Error loading stocks:', e);
            this.stocks = [];
        }
    },

    renderStocks() {
        const container = document.getElementById('dragSourceList');
        const stocks = this.filteredStocks.length > 0 ? this.filteredStocks : this.stocks;

        if (stocks.length === 0) {
            container.innerHTML = `
                <div class="muted" style="padding: 24px; text-align: center;">
                     Товар не найден на складе
                </div>
            `;
            return;
        }

        // Группируем по складам
        const byWarehouse = {};
        stocks.forEach(stock => {
            const whId = stock.warehouseId;
            if (!byWarehouse[whId]) {
                byWarehouse[whId] = {
                    warehouseName: stock.warehouseName || 'Склад #' + whId,
                    stocks: []
                };
            }
            byWarehouse[whId].stocks.push(stock);
        });

        let html = '';
        Object.keys(byWarehouse).forEach(whId => {
            const whData = byWarehouse[whId];
            html += `
                <div class="drag-source-warehouse-group">
                    <div class="drag-source-warehouse-header">
                        <span class="warehouse-icon"></span>
                        <span class="warehouse-name">${whData.warehouseName}</span>
                        <span class="warehouse-count">${whData.stocks.length} яч.</span>
                    </div>
            `;

            whData.stocks.forEach(stock => {
                html += `
                    <div class="drag-source-location-item" onclick="ProductDragSourceSelect.selectSource(${stock.locationId}, ${stock.batchId}, ${stock.qty})">
                        <span class="location-icon"></span>
                        <div class="location-info">
                            <div class="location-code">${stock.locationCode || 'Локация #' + stock.locationId}</div>
                            <div class="location-name">${stock.locationName || ''}</div>
                            ${stock.batchNumber ? `<div class="batch-info">Партия: ${stock.batchNumber}</div>` : ''}
                        </div>
                        <div class="location-qty">
                            <span class="pill pill-success">${stock.qty} шт.</span>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        });

        container.innerHTML = html;
    },

    filterStocks() {
        const query = (document.getElementById('dragSourceSearch')?.value || '').toLowerCase();

        if (!query) {
            this.filteredStocks = [];
        } else {
            this.filteredStocks = this.stocks.filter(stock => {
                const matchLocation = (stock.locationCode || '').toLowerCase().includes(query) ||
                                     (stock.locationName || '').toLowerCase().includes(query);
                const matchWarehouse = (stock.warehouseName || '').toLowerCase().includes(query);
                const matchBatch = (stock.batchNumber || '').toLowerCase().includes(query);
                return matchLocation || matchWarehouse || matchBatch;
            });
        }

        this.renderStocks();
    },

    selectSource(locationId, batchId, maxQty) {
        // Открываем модальное окно выбора целевой локации
        if (window.ProductDragTargetSelect) {
            ProductDragTargetSelect.open(this.currentProduct, locationId, batchId, maxQty);
        }
        this.close();
    },

    close() {
        document.getElementById('productDragSourceSelectModal').classList.add('hidden');
        document.getElementById('dragSourceSearch').value = '';
        this.filteredStocks = [];
    }
};

// ============================================
// PRODUCT DRAG TARGET SELECT MODAL (НОВОЕ)
// Модальное окно для выбора целевого места перемещения
// ============================================
window.ProductDragTargetSelect = {
    currentProduct: null,
    sourceLocationId: null,
    batchId: null,
    maxQty: null,
    warehouses: [],

    init() {
        this.createModal();
    },

    createModal() {
        const modalHtml = `
            <div id="productDragTargetSelectModal" class="modal-overlay hidden">
                <div class="modal" style="max-width: 700px;">
                    <div class="section-title">
                        <div>
                            <p class="eyebrow">Выбор места назначения</p>
                            <h3 id="dragTargetModalTitle"> Выберите куда переместить товар</h3>
                        </div>
                        <button class="btn btn-secondary" onclick="ProductDragTargetSelect.close()"> Закрыть</button>
                    </div>

                    <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                        <div class="info-item" style="margin-bottom: 12px;">
                            <span class="label">Товар</span>
                            <span id="dragTargetProductName" class="value" style="font-weight: 600;">—</span>
                        </div>
                        <div class="info-item" style="margin-bottom: 12px;">
                            <span class="label">Откуда</span>
                            <span id="dragTargetSourceLocation" class="value">—</span>
                        </div>
                    </div>

                    <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                        <input type="text" id="dragTargetSearch" class="input" placeholder=" Поиск склада или ячейки..."
                               oninput="ProductDragTargetSelect.filterWarehouses()" style="font-size: 14px;">
                    </div>

                    <div id="dragTargetList" style="max-height: 400px; overflow-y: auto; padding: 8px;">
                        <!-- Склады и локации рендерятся здесь -->
                    </div>

                    <div style="padding: 16px; border-top: 1px solid var(--border); background: #f8f9fa;">
                        <div class="info-item">
                            <span class="label"> Подсказка</span>
                            <div class="value" style="font-size: 12px; color: #6c757d; margin-top: 4px;">
                                Выберите склад или конкретную ячейку для перемещения товара.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const temp = document.createElement('div');
        temp.innerHTML = modalHtml;
        document.body.appendChild(temp.firstElementChild);
    },

    async open(product, sourceLocationId, batchId, maxQty) {
        this.currentProduct = product;
        this.sourceLocationId = sourceLocationId;
        this.batchId = batchId;
        this.maxQty = maxQty;

        // Заполняем информацию
        document.getElementById('dragTargetProductName').textContent = product.name;
        this.loadSourceLocationInfo(sourceLocationId);

        // Загружаем склады
        await this.loadWarehouses();
        this.renderWarehouses();

        document.getElementById('productDragTargetSelectModal').classList.remove('hidden');
    },

    async loadSourceLocationInfo(locationId) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/locations/${locationId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const location = await res.json();
                document.getElementById('dragTargetSourceLocation').textContent =
                    `${location.name} (${location.code})`;
            } else {
                document.getElementById('dragTargetSourceLocation').textContent = `Локация #${locationId}`;
            }
        } catch (e) {
            document.getElementById('dragTargetSourceLocation').textContent = `Локация #${locationId}`;
        }
    },

    async loadWarehouses() {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/warehouses?page=0&size=100', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const page = await res.json();
            this.warehouses = page.content || [];

            // Загружаем локации для каждого склада
            for (const warehouse of this.warehouses) {
                try {
                    const locRes = await fetch(`/api/locations/warehouse/${warehouse.id}`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (locRes.ok) {
                        warehouse.locations = await locRes.json();
                    }
                } catch (e) {
                    warehouse.locations = [];
                }
            }
        } catch (e) {
            console.error('[ProductDragTargetSelect] Error loading warehouses:', e);
        }
    },

    renderWarehouses() {
        const container = document.getElementById('dragTargetList');
        const warehouses = this.filterWarehousesArray(this.warehouses);

        if (warehouses.length === 0) {
            container.innerHTML = '<div class="muted" style="padding: 24px; text-align: center;">Нет складов</div>';
            return;
        }

        let html = '';
        warehouses.forEach(wh => {
            const locations = wh.locations || [];
            html += `
                <div class="drag-source-warehouse-group">
                    <div class="drag-source-warehouse-header" onclick="ProductDragTargetSelect.toggleWarehouse(${wh.id})">
                        <span class="warehouse-icon"></span>
                        <span class="warehouse-name">${wh.name}</span>
                        <span class="warehouse-count">${locations.length} яч.</span>
                        <span class="toggle-icon" id="toggleWh${wh.id}">▼</span>
                    </div>
                    <div class="drag-source-locations-list" id="locationsWh${wh.id}">
            `;

            locations.forEach(loc => {
                html += `
                    <div class="drag-source-location-item" onclick="ProductDragTargetSelect.selectTarget(${loc.id})">
                        <span class="location-icon"></span>
                        <div class="location-info">
                            <div class="location-code">${loc.code}</div>
                            <div class="location-name">${loc.name}</div>
                        </div>
                        <span class="location-type">${loc.type || 'BIN'}</span>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        container.innerHTML = html;
    },

    filterWarehousesArray(warehouses) {
        const query = (document.getElementById('dragTargetSearch')?.value || '').toLowerCase();
        if (!query) return warehouses;

        return warehouses.filter(wh =>
            (wh.name && wh.name.toLowerCase().includes(query)) ||
            (wh.code && wh.code.toLowerCase().includes(query))
        );
    },

    filterWarehouses() {
        this.renderWarehouses();
    },

    toggleWarehouse(warehouseId) {
        const list = document.getElementById(`locationsWh${warehouseId}`);
        const toggle = document.getElementById(`toggleWh${warehouseId}`);
        if (list && toggle) {
            if (list.style.display === 'none') {
                list.style.display = 'block';
                toggle.textContent = '▼';
            } else {
                list.style.display = 'none';
                toggle.textContent = '▶';
            }
        }
    },

    selectTarget(locationId) {
        // Открываем модальное окно подтверждения перемещения
        if (window.ProductTransferModal) {
            // Передаём source location ID и batch ID
            ProductTransferModal.openWithSource(this.currentProduct, locationId, this.sourceLocationId, this.batchId, this.maxQty);
        }
        this.close();
    },

    close() {
        document.getElementById('productDragTargetSelectModal').classList.add('hidden');
        document.getElementById('dragTargetSearch').value = '';
    }
};

// ============================================
// СТИЛИ
// ============================================
const dragStyles = document.createElement('style');
dragStyles.textContent = `
    /* Запрет выделения на строках товаров */
    #productsTableBody tr[data-product-id] {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        -webkit-touch-callout: none;
    }

    /* Drag element */
    .product-drag-element {
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        background: white;
        border: 2px solid var(--primary);
        border-radius: 8px;
        padding: 12px 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        user-select: none;
        -webkit-user-select: none;
    }

    .product-drag-element.hidden {
        display: none;
    }

    .drag-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .drag-icon {
        font-size: 24px;
        animation: bounce 0.5s infinite;
    }

    .drag-text {
        font-weight: 500;
        color: var(--primary);
    }

    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
    }

    /* Drop target highlight */
    .drop-target-highlight {
        outline: 3px dashed var(--primary) !important;
        outline-offset: -3px;
        background: rgba(0, 123, 255, 0.1) !important;
    }

    /* Location items */
    .location-item {
        display: flex;
        align-items: center;
        padding: 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
        margin: 4px 0;
    }

    .location-item:hover {
        background: #e9ecef;
    }

    .location-icon {
        font-size: 20px;
        margin-right: 12px;
    }

    .location-info {
        flex: 1;
    }

    .location-code {
        font-weight: 600;
        color: #212529;
    }

    .location-name {
        font-size: 13px;
        color: #6c757d;
    }

    .location-type {
        font-size: 12px;
        padding: 4px 8px;
        background: #e9ecef;
        border-radius: 4px;
        color: #495057;
    }

    /* Cursor styles */
    body.dragging {
        cursor: grabbing !important;
    }

    /* Product row drag hint */
    #productsTableBody tr {
        position: relative;
    }

    #productsTableBody tr::after {
        content: '';
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0;
        transition: opacity 0.2s;
    }

    #productsTableBody tr:hover::after {
        opacity: 0.5;
    }

    /* Drag Source/Target Select Styles */
    .drag-source-warehouse-group {
        border: 1px solid var(--border);
        border-radius: 8px;
        margin: 8px 0;
        overflow: hidden;
    }

    .drag-source-warehouse-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        transition: background 0.2s;
    }

    .drag-source-warehouse-header:hover {
        background: #e9ecef;
    }

    .drag-source-warehouse-header .warehouse-icon {
        font-size: 20px;
        margin-right: 8px;
    }

    .drag-source-warehouse-header .warehouse-name {
        flex: 1;
        font-weight: 600;
        color: #212529;
    }

    .drag-source-warehouse-header .warehouse-count {
        font-size: 12px;
        padding: 4px 8px;
        background: #e9ecef;
        border-radius: 4px;
        color: #495057;
        margin-right: 8px;
    }

    .drag-source-warehouse-header .toggle-icon {
        font-size: 12px;
        color: #6c757d;
        width: 20px;
        text-align: center;
    }

    .drag-source-locations-list {
        padding: 4px;
        background: white;
    }

    .drag-source-location-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
        margin: 2px 0;
    }

    .drag-source-location-item:hover {
        background: #e9ecef;
    }

    .drag-source-location-item .location-icon {
        font-size: 18px;
        margin-right: 12px;
    }

    .drag-source-location-item .location-info {
        flex: 1;
    }

    .drag-source-location-item .location-code {
        font-weight: 600;
        color: #212529;
        font-size: 14px;
    }

    .drag-source-location-item .location-name {
        font-size: 12px;
        color: #6c757d;
        margin-top: 2px;
    }

    .drag-source-location-item .batch-info {
        font-size: 11px;
        color: #6c757d;
        margin-top: 4px;
        font-style: italic;
    }

    .drag-source-location-item .location-qty {
        margin-left: 12px;
    }

    .drag-source-location-item .location-type {
        font-size: 12px;
        padding: 4px 8px;
        background: #e9ecef;
        border-radius: 4px;
        color: #495057;
        margin-left: 8px;
    }

    .pill-success {
        background: #d4edda;
        color: #155724;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }

    /* Toast animations */
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(dragStyles);

// ============================================
// AUTO-INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    ProductDrag.init();
    ProductTransferModal.init();
    WarehouseLocationSelect.init();
    ProductDragSourceSelect.init();
    ProductDragTargetSelect.init();
});

// Экспорт для использования в products.html
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductDrag;
}
