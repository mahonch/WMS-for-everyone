/* =======================================
   SIMPLE MODAL - Динамический z-index
   ======================================= */

window.Modal = {
    _nextZIndex: 100000, // Начинаем с высокого значения

    open(contentHtml, { width = "420px", onOk = null, onCancel = null, title = "" } = {}) {
        const currentZ = this._nextZIndex;
        this._nextZIndex += 100; // Каждая следующая модалка выше на 100

        // overlay
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay active";
        overlay.style.setProperty("z-index", currentZ, "important");

        // window
        const win = document.createElement("div");
        win.className = "modal";
        win.style.maxWidth = width;
        win.style.setProperty("z-index", currentZ + 1, "important");

        const titleHtml = title ? `<div class="section-title"><h3>${title}</h3></div>` : '';

        win.innerHTML = `
            ${titleHtml}
            <div class="modal-body">${contentHtml}</div>
            <div class="toolbar" style="justify-content:flex-end;margin-top:16px;">
                <button class="btn btn-secondary modal-cancel">Отмена</button>
                <button class="btn btn-primary modal-ok">OK</button>
            </div>
        `;

        overlay.appendChild(win);
        document.body.appendChild(overlay);

        // Кнопки
        overlay.querySelector(".modal-cancel").onclick = () => {
            overlay.remove();
            if (onCancel) onCancel();
        };

        overlay.querySelector(".modal-ok").onclick = () => {
            const data = this.collect(win);
            overlay.remove();
            if (onOk) onOk(data);
        };

        // Закрытие по клику на overlay
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                if (onCancel) onCancel();
            }
        };

        return overlay;
    },

    collect(win) {
        const data = {};
        win.querySelectorAll("input, select, textarea").forEach(el => {
            if (!el.name) return;
            if (el.type === "number") {
                const v = el.value?.trim();
                data[el.name] = v === "" ? null : Number(v);
            } else if (el.type === "checkbox") {
                data[el.name] = el.checked;
            } else {
                data[el.name] = el.value?.trim() || null;
            }
        });
        return data;
    },

    // Получить следующий z-index для HTML-оверлеев
    getNextZIndex() {
        const zIndex = this._nextZIndex;
        this._nextZIndex += 100;
        return zIndex;
    }
};

// Функция для HTML-оверлеев (склады, локации и т.д.)
window.setModalZIndex = function(overlay) {
    const zIndex = Modal.getNextZIndex();
    overlay.style.setProperty("z-index", zIndex, "important");

    const modal = overlay.querySelector(".modal");
    if (modal) {
        modal.style.setProperty("z-index", zIndex + 1, "important");
    }

    return zIndex;
};
