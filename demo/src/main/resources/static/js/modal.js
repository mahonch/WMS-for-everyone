/* =======================================
   SIMPLE UI MODAL SYSTEM
   ======================================= */

export const Modal = {
    open(contentHtml, { width = "420px", onOk = null, onCancel = null } = {}) {

        // overlay
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";

        // window
        const win = document.createElement("div");
        win.className = "modal-window";
        win.style.width = width;
        win.innerHTML = `
            <div class="modal-body">${contentHtml}</div>
            <div class="modal-actions">
                <button class="btn btn-secondary modal-cancel">Отмена</button>
                <button class="btn modal-ok">OK</button>
            </div>
        `;

        overlay.appendChild(win);
        document.body.appendChild(overlay);

        // actions
        overlay.querySelector(".modal-cancel").onclick = () => {
            overlay.remove();
            if (onCancel) onCancel();
        };

        overlay.querySelector(".modal-ok").onclick = () => {
            const data = Modal.collect(win);
            overlay.remove();
            if (onOk) onOk(data);
        };

        return overlay;
    },

    close(ref) {
        if (ref) ref.remove();
    },

    collect(win) {
        const data = {};
        win.querySelectorAll("input, select, textarea").forEach(el => {
            if (el.type === "number") {
                data[el.name] = Number(el.value);
            } else {
                data[el.name] = el.value;
            }
        });
        return data;
    }
};
