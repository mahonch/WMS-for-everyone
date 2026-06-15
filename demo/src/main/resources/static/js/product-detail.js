const fmtMoney = (n) => {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' ₽';
};

const activeTab = { current: 'receipts' };

async function loadProductPage() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    if (!productId) return;

    const token = localStorage.getItem('token') || '';
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    try {
        // Загружаем товар
        const pRes = await fetch(`/api/products/${productId}`, { headers });
        if (!pRes.ok) throw new Error('Не удалось загрузить товар');
        const p = await pRes.json();
        
        // Заполняем基本信息
        setText('crumbTitle', p.name);
        setText('headerTitle', p.name);
        setText('productName', p.name);
        setText('productSku', 'SKU ' + (p.sku || '—'));
        setText('productBarcode', p.barcode || '—');
        setText('productUnit', p.unit || '—');
        setText('productMin', (p.minStock ?? '—') + ' pcs');
        setText('productPrice', fmtMoney(p.costPrice));
        
        // ========== ЗАГРУЗКА ИЗОБРАЖЕНИЯ ==========
        const productImage = document.getElementById('productViewImage');
        if (productImage) {
            // Функция для установки изображения-заглушки
            const setPlaceholder = () => {
                productImage.src = '/images/no-image.png';
                productImage.alt = 'Нет изображения';
                productImage.style.objectFit = 'contain';
                productImage.style.opacity = '0.6';
                
                // Добавляем иконку если нужно
                const container = productImage.parentElement;
                if (container && !container.querySelector('.image-note')) {
                    const note = document.createElement('div');
                    note.className = 'image-note';
                    note.textContent = '📷 Изображение отсутствует';
                    note.style.fontSize = '12px';
                    note.style.color = '#999';
                    note.style.textAlign = 'center';
                    note.style.marginTop = '8px';
                    container.appendChild(note);
                }
            };
            
            // Проверяем наличие пути к изображению
            const imagePath = p.imagePath || p.imageUrl || p.image;
            
            if (imagePath) {
                // Пробуем загрузить изображение
                const img = new Image();
                img.onload = () => {
                    productImage.src = imagePath;
                    productImage.alt = p.name;
                    console.log('Image loaded successfully:', imagePath);
                };
                img.onerror = () => {
                    console.warn('Failed to load image:', imagePath);
                    setPlaceholder();
                    
                    // Опционально: пробуем загрузить через API
                    tryLoadImageFromApi(productId, productImage, p.name);
                };
                img.src = imagePath;
                
                // Таймаут на случай долгой загрузки
                setTimeout(() => {
                    if (!productImage.complete || productImage.naturalHeight === 0) {
                        console.warn('Image load timeout');
                        setPlaceholder();
                    }
                }, 5000);
            } else {
                console.log('No image path provided for product');
                setPlaceholder();
                
                // Пробуем загрузить через API эндпоинт
                tryLoadImageFromApi(productId, productImage, p.name);
            }
        }
        
        // Дополнительная функция загрузки изображения через API
        async function tryLoadImageFromApi(productId, imgElement, productName) {
            try {
                const response = await fetch(`/api/products/${productId}/image`, { headers });
                if (response.ok) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    imgElement.src = imageUrl;
                    imgElement.alt = productName;
                    imgElement.onload = () => URL.revokeObjectURL(imageUrl);
                    console.log('Image loaded via API');
                    return true;
                }
            } catch (error) {
                console.warn('Could not load image via API:', error);
            }
            return false;
        }
        
        const catChip = document.getElementById('categoryChip');
        if (catChip) catChip.textContent = 'Категория: ' + (p.categoryName || '—');
        
        const status = document.getElementById('statusBadge');
        if (status) {
            status.className = 'badge ' + (p.isActive ? 'green' : 'gray');
            status.textContent = p.isActive ? 'Активен' : 'Неактивен';
        }

        // Загружаем остатки
        const sRes = await fetch(`/api/stocks?productId=${productId}`, { headers });
        let stocks = [];
        if (sRes.ok) stocks = await sRes.json();
        
        const sList = document.getElementById('stocksList');
        if (sList) {
            if (!stocks.length) {
                sList.innerHTML = '<div class="muted">Остатков нет</div>';
            } else {
                sList.innerHTML = stocks.map(s => `
                    <div class="stock-item">
                        <div><strong>Склад:</strong> ${s.warehouseName || s.warehouseId || '—'}</div>
                        <div><strong>Локация:</strong> ${s.locationName
                            ? `<a class="clickable-link" href="/pages/location-detail.html?id=${s.locationId}">${s.locationName}</a>`
                            : (s.locationCode
                                ? `<a class="clickable-link" href="/pages/location-detail.html?id=${s.locationId}">${s.locationCode}</a>`
                                : (s.locationId || '—'))}</div>
                        <div><strong>Количество:</strong> ${s.qty || 0} ${p.unit || 'pcs'}</div>
                    </div>
                `).join('');
            }
        }

        // QR код
        const qr = document.getElementById('qrImageProduct');
        if (qr) {
            qr.src = `/api/qr/product/${productId}.png?size=240&t=${Date.now()}`;
            qr.onerror = () => {
                console.warn('QR code generation failed');
                qr.style.display = 'none';
                const container = qr.parentElement;
                if (container) {
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'qr-error';
                    errorMsg.textContent = 'QR-код временно недоступен';
                    errorMsg.style.fontSize = '12px';
                    errorMsg.style.color = '#999';
                    container.appendChild(errorMsg);
                }
            };
        }
        
        const namePrint = document.getElementById('productNamePrint');
        if (namePrint) namePrint.textContent = p.name || '';

        // Загружаем связанные документы
        const loadDoc = async (url) => {
            const r = await fetch(url, { headers });
            if (!r.ok) return [];
            const data = await r.json();
            return data.content || [];
        };

        const [receipts, issues, transfers] = await Promise.all([
            loadDoc('/api/receipts?page=0&size=100'),
            loadDoc('/api/issues?page=0&size=100'),
            loadDoc('/api/transfers?page=0&size=100')
        ]);

        const relatedReceipts = receipts.filter(r => r.items?.some(it => it.productId == productId));
        const relatedIssues = issues.filter(i => i.items?.some(it => it.productId == productId));
        const relatedTransfers = transfers.filter(t => t.items?.some(it => it.productId == productId));

        const tabContent = document.getElementById('tabContent');
        const renderTable = (rows, columns, type) => {
            if (!rows.length) return '<div class="muted" style="padding:12px;">Нет данных</div>';
            const head = '<tr>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
            const body = rows.map((r, idx) => `
                <tr>
                    <td>${linkDoc(r, type, idx)}</td>
                    <td>${r.status || '—'}</td>
                    <td>${r.supplierName || r.reason || r.fromWarehouseName || '—'}</td>
                    <td>${r.createdAt ? new Date(r.createdAt).toLocaleString('ru-RU') : '—'}</td>
                </tr>
            `).join('');
            return `</table>${head}${body}</table>`;
        };
        
        const linkDoc = (row, type, idx) => {
            const num = row.number || row.id || (idx + 1);
            let href = '#';
            if (type === 'receipts' && row.id) {
                href = `/pages/receipt-detail.html?id=${row.id}`;
            } else if (type === 'issues' && row.id) {
                href = `/pages/issue-detail.html?id=${row.id}`;
            } else if (type === 'transfers' && row.id) {
                href = `/pages/transfer-detail.html?id=${row.id}`;
            }
            return `<a class="clickable-link" href="${href}">${num}</a>`;
        };

        const updateTab = () => {
            if (!tabContent) return;
            if (activeTab.current === 'receipts') {
                tabContent.innerHTML = renderTable(relatedReceipts, ['№', 'Статус', 'Поставщик', 'Дата'], 'receipts');
            } else if (activeTab.current === 'issues') {
                tabContent.innerHTML = renderTable(relatedIssues, ['№', 'Статус', 'Причина', 'Дата'], 'issues');
            } else {
                tabContent.innerHTML = renderTable(relatedTransfers, ['№', 'Статус', 'Откуда', 'Дата'], 'transfers');
            }
        };
        updateTab();

        document.querySelectorAll('.doc-tab').forEach(el => {
            el.onclick = () => {
                document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
                el.classList.add('active');
                activeTab.current = el.dataset.tab;
                updateTab();
            };
        });

        const btnBack = document.getElementById('btnBack');
        if (btnBack) btnBack.onclick = () => history.back();
        
        const btnPrint = document.getElementById('btnPrint');
        if (btnPrint) btnPrint.onclick = () => window.print();

    } catch (e) {
        console.error('Error loading product:', e);
        const container = document.querySelector('.product-detail-container') || document.querySelector('.main-content');
        if (container) {
            const errorHtml = `
                <div class="error-message" style="padding: 40px; text-align: center; background: #fee; border-radius: 8px; margin: 20px;">
                    <h3>❌ Ошибка загрузки товара</h3>
                    <p>${e.message}</p>
                    <button onclick="location.reload()" style="margin-right: 10px;">🔄 Обновить</button>
                    <button onclick="history.back()">⬅️ Назад</button>
                </div>
            `;
            container.innerHTML = errorHtml;
        }
    }
}

document.addEventListener('DOMContentLoaded', loadProductPage);