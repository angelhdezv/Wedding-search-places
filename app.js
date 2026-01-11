const API_BASE =
    "https://script.google.com/macros/s/AKfycbwnf4TMDl02UBQFoNonbkJUCT6wrUF9MM2xoBOG-BHTC-Cnz-S-seI8ZNDGBtLkSmot/exec";

const tabCode = document.getElementById("tabCode");
const tabName = document.getElementById("tabName");
const panelCode = document.getElementById("panelCode");
const panelName = document.getElementById("panelName");

const codeInput = document.getElementById("codeInput");
const nameInput = document.getElementById("nameInput");
const codeBtn = document.getElementById("codeBtn");
const nameBtn = document.getElementById("nameBtn");

const status = document.getElementById("status");
const statusTitle = document.getElementById("statusTitle");
const statusText = document.getElementById("statusText");
const result = document.getElementById("result");

let mode = "byCode";

function setMode(m) {
    mode = m;
    tabCode.classList.toggle("active", m === "byCode");
    tabName.classList.toggle("active", m === "byName");
    panelCode.classList.toggle("hidden", m !== "byCode");
    panelName.classList.toggle("hidden", m !== "byName");
    clearResult();
    setStatus("Listo", "Ingresa los datos para buscar");
}

function setStatus(title, text, loading = false) {
    statusTitle.textContent = title;
    statusText.textContent = text;
    status.classList.toggle("loading", loading);
}

function clearResult() {
    result.innerHTML = "";
    result.classList.add("hidden");
}

async function callApi(action, value) {
    const url = `${API_BASE}?action=${action}&value=${encodeURIComponent(value)}`;
    const res = await fetch(url);
    return res.json();
}

codeBtn.onclick = async () => {
    const code = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    codeInput.value = code;

    if (code.length !== 6) {
        setStatus("Código inválido", "Debe tener 6 caracteres");
        return;
    }

    setStatus("Buscando…", "Consultando mesa", true);
    const json = await callApi("byCode", code.toLowerCase());

    if (json.success) {
        result.classList.remove("hidden");
        result.innerHTML = `
      <div class="big">
        <div>Mesa asignada</div>
        <div class="mesa">${json.data.table}</div>
      </div>`;
        setStatus("Encontrado", "Mesa localizada");
    } else {
        setStatus("No encontrado", "Prueba buscar por nombre");
    }
};

nameBtn.onclick = async () => {
    const value = nameInput.value.trim();
    if (!value) return;

    setStatus("Buscando…", "Consultando invitados", true);
    const json = await callApi("byName", value);

    if (json.code === "EMPTY_RESULT") {
        setStatus("Sin resultados", "Intenta con otro nombre");
        return;
    }

    result.classList.remove("hidden");
    result.innerHTML = json.data.map(i => `
    <div class="list-item">
      <span>${i.name}</span>
      <span>Mesa ${i.table}</span>
    </div>`).join("");

    setStatus("Resultados", "Selecciona al invitado");
};

tabCode.onclick = () => setMode("byCode");
tabName.onclick = () => setMode("byName");

setMode("byCode");
