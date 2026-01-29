const API_BASE =
    "https://script.google.com/macros/s/AKfycbwnf4TMDl02UBQFoNonbkJUCT6wrUF9MM2xoBOG-BHTC-Cnz-S-seI8ZNDGBtLkSmot/exec";

// ====== Elements
const tabCode = document.getElementById("tabCode");
const tabName = document.getElementById("tabName");
const panelCode = document.getElementById("panelCode");
const panelName = document.getElementById("panelName");

const codeInput = document.getElementById("codeInput");
const nameInput = document.getElementById("nameInput");
const codeBtn = document.getElementById("codeBtn");
const nameBtn = document.getElementById("nameBtn");

const statusEl = document.getElementById("status");
const statusTitle = document.getElementById("statusTitle");
const statusText = document.getElementById("statusText");

const resultEl = document.getElementById("result");
const modeText = document.getElementById("modeText");
const modePill = document.getElementById("modePill");

// ====== State
let mode = "byCode";

// ====== UI helpers
function setMode(nextMode) {
    mode = nextMode;

    const isCode = mode === "byCode";
    tabCode.setAttribute("aria-selected", String(isCode));
    tabName.setAttribute("aria-selected", String(!isCode));
    panelCode.hidden = !isCode;
    panelName.hidden = isCode;

    modeText.textContent = isCode ? "Código" : "Nombre";
    modePill.className = "pill";
    clearResult();

    setStatus(
        "Listo",
        isCode
            ? "Ingresa el código de invitación."
            : "Escribe el nombre del invitado.",
        { loading: false }
    );

    setTimeout(() => (isCode ? codeInput : nameInput).focus(), 50);
}

function setStatus(title, text, { loading = false, tone = "neutral" } = {}) {
    statusTitle.textContent = title;
    statusText.textContent = text;

    statusEl.classList.toggle("loading", loading);
    modePill.classList.remove("ok", "bad");
    if (tone === "ok") modePill.classList.add("ok");
    if (tone === "bad") modePill.classList.add("bad");
}

function clearResult() {
    resultEl.hidden = true;
    resultEl.innerHTML = "";
}

function renderByCodeFound(data) {
    const mesa = String(data?.table ?? "");
    const name = data?.name ?? "Invitado";

    resultEl.hidden = false;
    resultEl.innerHTML = `
    <div class="big">
      <div>
        <div class="label">Invitado</div>
        <div style="font-size:22px;font-weight:900;margin-top:4px;">
          ${escapeHtml(name)}
        </div>
        <div class="hint" style="padding-left:0;margin-top:6px;">
          Código verificado correctamente.
        </div>
      </div>
      <div style="text-align:right;">
        <div class="label">Mesa</div>
        <div class="mesa">${escapeHtml(mesa)}</div>
      </div>
    </div>
  `;
}

function renderByNameList(list) {
    resultEl.hidden = false;

    const items = list.map(x => `
    <div class="item">
      <div class="name">${escapeHtml(x.name)}</div>
      <div class="table">Mesa ${escapeHtml(String(x.table))}</div>
    </div>
  `).join("");

    resultEl.innerHTML = `
    <div class="pill ok">
      ${list.length} resultado(s) encontrados
    </div>
    <div class="list">${items}</div>
  `;
}

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ====== Validations
function sanitizeCodeInput(raw) {
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function isValidCode(code) {
    return /^[A-Z0-9]{6}$/.test(code);
}

// ====== API call
async function callApi(action, value) {
    const url = new URL(API_BASE);
    url.searchParams.set("action", action);
    url.searchParams.set("value", value);

    const res = await fetch(url.toString(), {
        headers: { "Accept": "application/json" },
        cache: "no-store"
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

function setLoading(isLoading) {
    codeBtn.disabled = isLoading;
    nameBtn.disabled = isLoading;
    statusEl.classList.toggle("loading", isLoading);
}

// ====== Actions
async function onSearchByCode() {
    clearResult();

    const visualCode = sanitizeCodeInput(codeInput.value);
    codeInput.value = visualCode;

    if (!visualCode) {
        setStatus("Falta el código", "Ingresa un código de 6 caracteres.", { tone: "bad" });
        return;
    }

    if (!isValidCode(visualCode)) {
        setStatus("Código inválido", "Debe contener exactamente 6 caracteres.", { tone: "bad" });
        return;
    }

    setStatus("Buscando…", "Verificando código de invitación.", { loading: true });
    setLoading(true);

    try {
        const json = await callApi("byCode", visualCode.toLowerCase());

        if (json?.success && json?.code === "FOUND") {
            renderByCodeFound(json.data);
            setStatus("Encontrado", "Mesa asignada correctamente.", { tone: "ok" });
            return;
        }

        if (!json?.success && json?.code === "NOT_FOUND") {
            setStatus("No encontrado", "Código no encontrado. Prueba buscar por nombre.", { tone: "bad" });
            return;
        }

        setStatus("Error", "Respuesta inesperada del sistema.", { tone: "bad" });

    } catch (err) {
        setStatus("Error de red", "No se pudo consultar el sistema.", { tone: "bad" });
    } finally {
        setLoading(false);
    }
}

async function onSearchByName() {
    clearResult();

    const value = nameInput.value.trim();
    if (!value) {
        setStatus("Falta el nombre", "Escribe el nombre del invitado.", { tone: "bad" });
        return;
    }

    setStatus("Buscando…", "Consultando invitados.", { loading: true });
    setLoading(true);

    try {
        const json = await callApi("byName", value);

        if (json?.success && json?.code === "FOUND") {
            renderByNameList(json.data);
            setStatus("Resultados encontrados", "Selecciona al invitado correcto.", { tone: "ok" });
            return;
        }

        if (json?.code === "EMPTY_RESULT") {
            setStatus("Sin resultados", "No se encontraron coincidencias.", { tone: "bad" });
            return;
        }

        setStatus("Error", "Respuesta inesperada del sistema.", { tone: "bad" });

    } catch (err) {
        setStatus("Error de red", "No se pudo consultar el sistema.", { tone: "bad" });
    } finally {
        setLoading(false);
    }
}

// ====== Events
tabCode.addEventListener("click", () => setMode("byCode"));
tabName.addEventListener("click", () => setMode("byName"));

codeBtn.addEventListener("click", onSearchByCode);
nameBtn.addEventListener("click", onSearchByName);

document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    mode === "byCode" ? onSearchByCode() : onSearchByName();
});

codeInput.addEventListener("input", () => {
    const next = sanitizeCodeInput(codeInput.value);
    if (codeInput.value !== next) codeInput.value = next;
});

document.getElementById("mapBtn").addEventListener("click", () => {
    window.open("assets/map.png", "_blank", "noopener");
});

// Init
setMode("byCode");
