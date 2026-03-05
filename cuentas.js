// Cuentas module - loaded by index.html

const CUENTAS_NAMES = [
  "Greyhound GG","Cachagua GG","Carelmapu","Hipotecario Cachagua","Hipotecario Ofis",
  "Autopase","Gas Cachagua","Agua Cachagua","Luz Cachagua","Luz Stgo","Gas Stgo",
  "Agua Stgo","Club de Golf Los Leones","Club de Golf Cachagua","Jardinero Cachagua",
  "TC 1","TC 2","TC Int","VMA","Seduc","Gabriel","Mai","Jessica","Seguros Autos","Contribuciones"
];

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

window.CuentasApp = {
  data: [],
  editingId: null,

  async init() {
    await this.fetch();
    this.render();
  },

  async fetch() {
    try {
      const r = await fetch(`${API_URL}/cuentas`, { headers: HEADERS });
      const d = await r.json();
      this.data = d.cuentas || [];
    } catch(e) { showToast("Error cargando cuentas", "error"); }
  },

  async save(id, field, value) {
    try {
      await fetch(`${API_URL}/cuentas/${id}`, {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify({ [field]: value })
      });
    } catch(e) { showToast("Error guardando", "error"); }
  },

  async create(nombre, mes, anio) {
    try {
      const r = await fetch(`${API_URL}/cuentas`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ nombre, mes, anio, monto: 0, estado: "Por pagar" })
      });
      const d = await r.json();
      this.data.push(d.cuenta);
      this.render();
      showToast("Cuenta creada ✓");
    } catch(e) { showToast("Error creando cuenta", "error"); }
  },

  async delete(id) {
    try {
      await fetch(`${API_URL}/cuentas/${id}`, { method: "DELETE", headers: HEADERS });
      this.data = this.data.filter(c => c.id !== id);
      this.render();
      showToast("Cuenta eliminada");
    } catch(e) { showToast("Error eliminando", "error"); }
  },

  variacion(cuenta) {
    const prev = this.data.find(c =>
      c.nombre === cuenta.nombre &&
      ((cuenta.mes === 1 && c.mes === 12 && c.anio === cuenta.anio - 1) ||
       (cuenta.mes > 1 && c.mes === cuenta.mes - 1 && c.anio === cuenta.anio))
    );
    if (!prev || !prev.monto || !cuenta.monto) return null;
    return ((cuenta.monto - prev.monto) / prev.monto * 100).toFixed(1);
  },

  render() {
    const now = new Date();
    const curMes = now.getMonth() + 1;
    const curAnio = now.getFullYear();

    // Filter controls
    const filterMes  = parseInt(document.getElementById("filter-mes")?.value  || curMes);
    const filterAnio = parseInt(document.getElementById("filter-anio")?.value || curAnio);
    const filterEst  = document.getElementById("filter-estado")?.value || "all";

    let rows = this.data.filter(c =>
      c.mes === filterMes && c.anio === filterAnio &&
      (filterEst === "all" || c.estado === filterEst)
    );

    // Stats
    const total    = rows.reduce((s,c) => s + (parseFloat(c.monto)||0), 0);
    const pagadas  = rows.filter(c => c.estado === "Pagado").length;
    const porPagar = rows.filter(c => c.estado === "Por pagar").length;
    const montoPend = rows.filter(c => c.estado === "Por pagar").reduce((s,c) => s + (parseFloat(c.monto)||0), 0);

    document.getElementById("c-total").textContent    = "$" + total.toLocaleString("es-CL");
    document.getElementById("c-pagadas").textContent  = pagadas;
    document.getElementById("c-pagar").textContent    = porPagar;
    document.getElementById("c-pendiente").textContent = "$" + montoPend.toLocaleString("es-CL");

    if (!rows.length) {
      document.getElementById("cuentasList").innerHTML = `<div class="empty">No hay cuentas para ${MESES[filterMes-1]} ${filterAnio}.<br><br>
        <button class="btn-primary" onclick="CuentasApp.seedMonth(${filterMes},${filterAnio})">+ Generar cuentas del mes</button></div>`;
      return;
    }

    document.getElementById("cuentasList").innerHTML = rows.map(c => {
      const vari = this.variacion(c);
      const variHtml = vari === null ? '<span style="color:var(--muted2);font-size:12px">—</span>' :
        `<span style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px;background:${parseFloat(vari)>0?"#fce8e6":"#e6f4ea"};color:${parseFloat(vari)>0?"#d93025":"#1e8e3e"}">${parseFloat(vari)>0?"+":""}${vari}%</span>`;

      const estadoStyle = c.estado === "Pagado"
        ? "background:#e6f4ea;color:#1e8e3e"
        : "background:#fef7e0;color:#f29900";

      return `<div class="task" style="grid-template-columns:1fr 120px 120px 80px 28px">
        <span style="font-size:14px;font-weight:500;color:var(--text);padding:4px 8px">${c.nombre}</span>
        <div style="position:relative">
          <span style="font-size:12px;color:var(--muted2);position:absolute;top:50%;left:10px;transform:translateY(-50%);pointer-events:none">$</span>
          <input type="number" value="${c.monto||""}" placeholder="0"
            style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:5px 8px 5px 20px;font-size:13px;font-weight:600;outline:none;font-family:inherit"
            onblur="CuentasApp.saveField(${c.id},'monto',this.value)"
            onkeydown="if(event.key==='Enter')this.blur()" />
        </div>
        <select onchange="CuentasApp.saveField(${c.id},'estado',this.value)"
          style="${estadoStyle};border:none;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;outline:none;width:100%">
          <option value="Por pagar" ${c.estado==="Por pagar"?"selected":""}>⏳ Por pagar</option>
          <option value="Pagado"    ${c.estado==="Pagado"?"selected":""}>✅ Pagado</option>
        </select>
        ${variHtml}
        <button class="btn-del" onclick="CuentasApp.confirmDel(${c.id})">✕</button>
      </div>`;
    }).join("");
  },

  async saveField(id, field, value) {
    const c = this.data.find(c => c.id === id); if (!c) return;
    if (field === "monto") value = parseFloat(value) || 0;
    c[field] = value;
    this.render();
    await this.save(id, field, value);
  },

  async seedMonth(mes, anio) {
    showToast("Generando cuentas...");
    for (const nombre of CUENTAS_NAMES) {
      const exists = this.data.find(c => c.nombre === nombre && c.mes === mes && c.anio === anio);
      if (!exists) await this.create(nombre, mes, anio);
    }
    showToast("Cuentas del mes generadas ✓");
  },

  confirmDel(id) {
    if (confirm("¿Eliminar esta cuenta?")) this.delete(id);
  }
};
