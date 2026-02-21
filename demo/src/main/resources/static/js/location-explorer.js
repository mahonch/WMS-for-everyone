/* =======================================
   LOCATION EXPLORER - Двухпанельный проводник
   ======================================= */

window.LocationExplorer = {
    allLocations: [],
    filteredLocations: [], // Фильтр по складу
    stocks: [],
    selectedNode: null,
    expandedNodes: new Set(),
    searchQuery: '',
    callback: null,
    warehouseId: null, // Выбранный склад

    // Инициализация
    async open(callback, warehouseId = null) {
        this.callback = callback;
        this.warehouseId = warehouseId;
        this.selectedNode = null;
        this.searchQuery = '';
        this.expandedNodes.clear();
        
        // Загружаем данные
        await this.loadData();
        
        // Показываем модалку
        const overlay = document.getElementById("locationExplorerOverlay");
        if (overlay) {
            overlay.classList.remove("hidden");
        }
        
        // Рендерим дерево
        this.renderTree();
        this.renderContent();
    },

    close() {
        document.getElementById("locationExplorerOverlay").classList.add("hidden");
        this.callback = null;
    },

    async loadData() {
        const token = localStorage.getItem("token");
        
        // Загружаем все локации
        const locRes = await fetch("/api/locations", {
            headers: { "Authorization": "Bearer " + token }
        });
        this.allLocations = await locRes.json();
        
        // Загружаем остатки
        const stockRes = await fetch("/api/stocks", {
            headers: { "Authorization": "Bearer " + token }
        });
        this.stocks = await stockRes.json();
        
        // Фильтруем по складу если указан
        if (this.warehouseId) {
            // Находим все локации выбранного склада
            this.filteredLocations = this.allLocations.filter(loc => {
                // Проверяем принадлежит ли локация к складу
                return loc.warehouseId == this.warehouseId;
            });
        } else {
            this.filteredLocations = this.allLocations;
        }
        
        // Убеждаемся что это массив
        if (!Array.isArray(this.filteredLocations)) {
            console.error('[LocationExplorer] filteredLocations is not an array:', this.filteredLocations);
            this.filteredLocations = [];
        }
        
        console.log('[LocationExplorer] loaded locations:', this.filteredLocations.length);
        
        // Строим иерархию
        this.buildHierarchy();
    },

    buildHierarchy() {
        console.log('[LocationExplorer] buildHierarchy start');
        console.log('  - filteredLocations:', this.filteredLocations?.length || 0);
        
        // Проверка на массив
        if (!Array.isArray(this.filteredLocations)) {
            console.error('[LocationExplorer] filteredLocations is not an array!');
            return;
        }
        
        // Сбрасываем children
        this.filteredLocations.forEach(loc => {
            loc.children = [];
            loc.expanded = false;
            
            // Считаем товары в локации (оптимизировано)
            const locStocks = this.stocks.filter(s => s.locationId === loc.id);
            loc.totalQty = locStocks.reduce((sum, s) => sum + s.qty, 0);
            loc.productCount = locStocks.filter(s => s.qty > 0).length;
        });
        
        // Привязываем детей к родителям (только в пределах filteredLocations)
        const locationMap = new Map(this.filteredLocations.map(l => [l.id, l]));
        
        let attachedCount = 0;
        this.filteredLocations.forEach(loc => {
            if (loc.parentId) {
                const parent = locationMap.get(loc.parentId);
                if (parent) {
                    parent.children.push(loc);
                    attachedCount++;
                } else {
                    console.log(`  - Не найден родитель ${loc.parentId} для ${loc.code}`);
                }
            }
        });
        
        console.log(`  - Прикреплено детей: ${attachedCount}`);
        console.log('  - Примеры родителей с детьми:');
        this.filteredLocations
            .filter(l => l.children.length > 0)
            .slice(0, 5)
            .forEach(l => {
                console.log(`    ${l.code} (${l.type}) -> ${l.children.length} детей`);
            });
    },

    // Рендер дерева (левая панель)
    renderTree() {
        const container = document.getElementById("locationTree");
        if (!container) return;
        
        const roots = this.filteredLocations.filter(l => !l.parentId || l.type === "ZONE");
        
        // ОТЛАДКА - выводим информацию
        console.log('[LocationExplorer] renderTree:');
        console.log('  - filteredLocations:', this.filteredLocations.length);
        console.log('  - roots:', roots.length);
        console.log('  - roots:', roots.map(r => ({ id: r.id, code: r.code, type: r.type, children: r.children?.length || 0 })));
        console.log('  - expandedNodes:', Array.from(this.expandedNodes));

        container.innerHTML = roots.map(r => this.renderTreeNode(r, 0)).join("");

        // Event delegation - вешаем один обработчик на контейнер
        container.onclick = (e) => {
            e.stopPropagation();
            
            // Клик на toggle button
            const toggleBtn = e.target.closest(".tree-toggle");
            if (toggleBtn) {
                const nodeId = toggleBtn.dataset.node;
                
                // Визуальный эффект нажатия
                toggleBtn.style.transform = "scale(0.8)";
                setTimeout(() => {
                    toggleBtn.style.transform = "";
                }, 100);
                
                this.toggleNode(nodeId);
                return;
            }
            
            // Клик на узел дерева
            const treeNode = e.target.closest(".tree-node");
            if (treeNode) {
                const nodeId = treeNode.dataset.node;
                this.selectNode(nodeId);
            }
        };
    },

    renderTreeNode(node, level) {
        const indent = level * 16;
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = this.expandedNodes.has(Number(node.id));

        const icons = {
            "ZONE": "📍",
            "RACK": "📚",
            "SHELF": "📋",
            "BIN": "📦"
        };

        const icon = icons[node.type] || "📦";
        const hasProducts = node.productCount > 0;

        let html = `
            <div class="tree-node ${this.selectedNode?.id === node.id ? 'selected' : ''}"
                 data-node="${node.id}"
                 style="padding-left: ${indent}px;">
                ${hasChildren ?
                    `<button class="tree-toggle" data-node="${node.id}">${isExpanded ? '▼' : '▶'}</button>` :
                    '<span class="tree-spacer"></span>'
                }
                <span class="tree-icon">${icon}</span>
                <span class="tree-code">${node.code}</span>
                <span class="tree-name">${node.name}</span>
                ${node.type === "BIN" && hasProducts ?
                    `<span class="tree-badge">${node.productCount} тов.</span>` : ''
                }
            </div>
        `;

        if (hasChildren && isExpanded) {
            html += node.children.map(c => this.renderTreeNode(c, level + 1)).join("");
        }

        return html;
    },

    toggleNode(nodeId) {
        // Конвертируем в число для сравнения
        const nodeIdNum = Number(nodeId);
        const node = this.filteredLocations.find(l => l.id === nodeIdNum);
        
        console.log(`[toggleNode] nodeId: ${nodeId}, nodeIdNum: ${nodeIdNum}, node:`, node);
        
        if (this.expandedNodes.has(nodeIdNum)) {
            this.expandedNodes.delete(nodeIdNum);
            console.log(`[LocationExplorer] Свернут: ${node?.code}`);
        } else {
            this.expandedNodes.add(nodeIdNum);
            console.log(`[LocationExplorer] Развернут: ${node?.code}`);
            
            // Автоматически раскрываем родителей если это вложенный элемент
            if (node?.parentId) {
                let parent = this.filteredLocations.find(l => l.id === node.parentId);
                while (parent) {
                    this.expandedNodes.add(parent.id);
                    parent = this.filteredLocations.find(l => l.id === parent.parentId);
                }
            }
        }
        
        this.renderTree();
    },

    selectNode(nodeId) {
        // Конвертируем в число
        const nodeIdNum = Number(nodeId);
        const node = this.filteredLocations.find(l => l.id === nodeIdNum);
        
        console.log(`[selectNode] nodeId: ${nodeId}, nodeIdNum: ${nodeIdNum}, node:`, node);
        
        this.selectedNode = node;
        this.renderTree();
        this.renderContent();

        // Обновляем подвал (если есть)
        const selectedInfo = document.getElementById("selectedLocation");
        const btnConfirm = document.getElementById("btnConfirmLocation");

        if (node) {
            if (selectedInfo) selectedInfo.textContent = `${node.code} — ${node.name}`;
            if (btnConfirm) btnConfirm.disabled = node.type !== "BIN";
        } else {
            if (selectedInfo) selectedInfo.textContent = "—";
            if (btnConfirm) btnConfirm.disabled = true;
        }
    },

    // Рендер контента (правая панель)
    renderContent() {
        const container = document.getElementById("locationContent");
        const contentHint = document.getElementById("contentHint");

        console.log('[renderContent] selectedNode:', this.selectedNode);

        if (!this.selectedNode) {
            if (contentHint) contentHint.textContent = "Выберите узел";
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">📂</span>
                        <div class="empty-title">Выберите локацию</div>
                        <div class="empty-text">Кликните на элемент в дереве слева</div>
                    </div>
                `;
            }
            return;
        }

        if (contentHint) contentHint.textContent = this.selectedNode.name;
        const node = this.selectedNode;
        
        console.log('[renderContent] node.type:', node.type, 'node.children:', node.children?.length);

        // Если это ячейка (BIN) — показываем товары
        if (node.type === "BIN") {
            this.renderBinContent(node);
            return;
        }

        // Если это папка — показываем дочерние элементы
        const children = node.children || [];

        if (children.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📂</span>
                    <div class="empty-title">Пусто</div>
                    <div class="empty-text">В этом разделе нет дочерних элементов</div>
                </div>
            `;
            return;
        }
        
        // Группируем по типам
        const byType = {
            "ZONE": [],
            "RACK": [],
            "SHELF": [],
            "BIN": []
        };
        
        children.forEach(c => {
            if (byType[c.type]) {
                byType[c.type].push(c);
            }
        });
        
        let html = `<div class="content-header">
            <h3>${this.getNodeTitle(node)}</h3>
            <span class="content-count">${children.length} элементов</span>
        </div>`;
        
        // Показываем каждую группу
        ["ZONE", "RACK", "SHELF", "BIN"].forEach(type => {
            if (byType[type].length > 0) {
                html += this.renderTypeGroup(type, byType[type]);
            }
        });
        
        container.innerHTML = html;
        
        // Bind events
        container.querySelectorAll(".content-item").forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                const nodeId = item.dataset.node;
                const nodeType = item.dataset.type;
                
                if (nodeType === "BIN") {
                    this.selectNode(nodeId);
                } else {
                    this.expandAndSelect(nodeId);
                }
            };
        });
        
        container.querySelectorAll(".btn-select").forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const nodeId = btn.dataset.node;
                this.selectLocation(nodeId);
            };
        });
    },

    renderBinContent(node) {
        const stocks = this.stocks.filter(s => s.locationId === node.id && s.qty > 0);
        
        if (stocks.length === 0) {
            document.getElementById("locationContent").innerHTML = `
                <div class="content-header">
                    <h3>${this.getNodeTitle(node)}</h3>
                </div>
                <div class="empty-state">
                    <span class="empty-icon">📦</span>
                    <div class="empty-title">Ячейка пуста</div>
                    <div class="empty-text">В этой ячейке нет товаров</div>
                </div>
                <div class="location-actions">
                    <button class="btn btn-primary" onclick="LocationExplorer.selectLocation(${node.id})">
                        ✅ Выбрать ячейку
                    </button>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="content-header">
                <h3>${this.getNodeTitle(node)}</h3>
                <span class="content-count">${stocks.length} товаров</span>
            </div>
            <div class="products-list">
        `;
        
        stocks.forEach(s => {
            html += `
                <div class="product-item">
                    <span class="product-icon">🍎</span>
                    <div class="product-info">
                        <div class="product-name">${s.productName || "Товар #" + s.productId}</div>
                        <div class="product-sku">${s.sku || "—"}</div>
                    </div>
                    <div class="product-qty">${s.qty} шт.</div>
                </div>
            `;
        });
        
        html += `
            </div>
            <div class="location-actions">
                <button class="btn btn-primary" onclick="LocationExplorer.selectLocation(${node.id})">
                    ✅ Выбрать ячейку
                </button>
            </div>
        `;
        
        document.getElementById("locationContent").innerHTML = html;
    },

    renderTypeGroup(type, items) {
        const titles = {
            "ZONE": "📍 Зоны",
            "RACK": "📚 Стеллажи",
            "SHELF": "📋 Полки",
            "BIN": "📦 Ячейки"
        };
        
        const icons = {
            "ZONE": "📍",
            "RACK": "📚",
            "SHELF": "📋",
            "BIN": "📦"
        };
        
        let html = `
            <div class="type-group">
                <div class="type-header">${titles[type]} (${items.length})</div>
                <div class="type-items">
        `;
        
        items.forEach(item => {
            const hasProducts = item.productCount > 0;
            const canSelect = item.type === "BIN";
            
            html += `
                <div class="content-item ${canSelect ? 'selectable' : ''}" 
                     data-node="${item.id}" 
                     data-type="${item.type}">
                    <span class="item-icon">${icons[item.type]}</span>
                    <div class="item-info">
                        <div class="item-code">${item.code}</div>
                        <div class="item-name">${item.name}</div>
                    </div>
                    ${hasProducts ? `<span class="item-badge">${item.productCount} тов.</span>` : ''}
                    ${canSelect ? `
                        <button class="btn btn-sm btn-select" data-node="${item.id}">
                            Выбрать
                        </button>
                    ` : ''}
                </div>
            `;
        });
        
        html += `</div></div>`;
        return html;
    },

    getNodeTitle(node) {
        const icons = {
            "ZONE": "📍",
            "RACK": "📚",
            "SHELF": "📋",
            "BIN": "📦"
        };
        return `${icons[node.type] || "📦"} ${node.code} — ${node.name}`;
    },

    expandAndSelect(nodeId) {
        // Раскрываем всех родителей
        let current = this.allLocations.find(l => l.id === nodeId);
        while (current && current.parentId) {
            this.expandedNodes.add(current.parentId);
            current = this.allLocations.find(l => l.id === current.parentId);
        }
        
        // Выбираем узел
        this.selectNode(nodeId);
    },

    selectLocation(locationId) {
        const location = this.allLocations.find(l => l.id === locationId);
        
        console.log('[LocationExplorer] selectLocation:', location);
        
        // Вызываем callback если он есть
        if (this.callback && typeof this.callback === 'function') {
            this.callback(location);
        }
        
        this.close();
    },

    // Поиск
    async search(query) {
        this.searchQuery = query;
        
        const searchResults = document.getElementById("searchResults");
        const locationTree = document.getElementById("locationTree");
        const locationContent = document.getElementById("locationContent");

        if (query.length < 2) {
            if (searchResults) searchResults.innerHTML = "";
            return;
        }

        const q = query.toLowerCase();
        const results = this.filteredLocations.filter(l =>
            l.code.toLowerCase().includes(q) ||
            l.name.toLowerCase().includes(q)
        );

        // Сортируем: сначала с товарами, потом по типу
        results.sort((a, b) => {
            if (a.productCount > 0 && b.productCount === 0) return -1;
            if (a.productCount === 0 && b.productCount > 0) return 1;

            const typeOrder = { "BIN": 0, "SHELF": 1, "RACK": 2, "ZONE": 3 };
            return (typeOrder[a.type] || 4) - (typeOrder[b.type] || 4);
        });
        
        // Группируем по типам
        const byType = {
            "BIN": [],
            "SHELF": [],
            "RACK": [],
            "ZONE": []
        };
        
        results.forEach(r => {
            if (byType[r.type]) {
                byType[r.type].push(r);
            }
        });
        
        const container = document.getElementById("searchResults");
        
        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🔍</span>
                    <div class="empty-title">Ничего не найдено</div>
                    <div class="empty-text">Попробуйте другой запрос</div>
                </div>
            `;
            return;
        }
        
        let html = `<div class="search-header">Найдено: ${results.length}</div>`;
        
        ["BIN", "SHELF", "RACK", "ZONE"].forEach(type => {
            if (byType[type].length > 0) {
                html += this.renderSearchGroup(type, byType[type]);
            }
        });
        
        container.innerHTML = html;
        
        // Bind events
        container.querySelectorAll(".search-item").forEach(item => {
            item.onclick = () => {
                const nodeId = item.dataset.node;
                const nodeType = item.dataset.type;
                
                if (nodeType === "BIN") {
                    this.selectLocation(nodeId);
                } else {
                    this.expandAndSelect(nodeId);
                    // Переключаемся на вкладку дерева
                    document.getElementById("locationContent").innerHTML = "";
                    this.selectNode(nodeId);
                }
            };
        });
    },

    renderSearchGroup(type, items) {
        const titles = {
            "BIN": "📦 Ячейки",
            "SHELF": "📋 Полки",
            "RACK": "📚 Стеллажи",
            "ZONE": "📍 Зоны"
        };
        
        let html = `
            <div class="search-group">
                <div class="search-group-title">${titles[type]} (${items.length})</div>
        `;
        
        items.forEach(item => {
            html += `
                <div class="search-item" data-node="${item.id}" data-type="${item.type}">
                    <span class="search-code">${item.code}</span>
                    <span class="search-name">${item.name}</span>
                    ${item.productCount > 0 ? 
                        `<span class="search-badge">${item.productCount} тов.</span>` : ''
                    }
                </div>
            `;
        });
        
        html += `</div>`;
        return html;
    }
};

// Глобальные функции для HTML
window.openLocationExplorer = function(callback) {
    LocationExplorer.open(callback);
};

window.onLocationSearch = function() {
    const query = document.getElementById("locationExplorerSearch").value;
    LocationExplorer.search(query);
};

window.clearLocationSearch = function() {
    document.getElementById("locationExplorerSearch").value = "";
    LocationExplorer.search("");
};
