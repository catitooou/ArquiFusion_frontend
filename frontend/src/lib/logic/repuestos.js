// Lógica pura de repuestos (sección 7.4, check-parts y parts-api).
// Sin dependencias: se puede copiar a services/repuestos/logic.js del backend.

export const PARTS_BY_FAULT = {
  motor: ['P-FIL-ACE', 'P-ROD-MOT', 'P-SEN-TMP'],
  hidraulico: ['P-MAN-HID', 'P-SEL-HID', 'P-BOM-HID'],
  combustible: ['P-INY', 'P-FIL-COM'],
  electrico: ['P-SEN-RPM', 'P-ALT'],
  general: ['P-KIT-INS'],
};

/**
 * Revisa el stock para un tipo de falla. Devuelve qué se usa, qué falta y el stock actualizado.
 * No muta la entrada.
 */
export function checkParts(parts, faultType) {
  const needed = PARTS_BY_FAULT[faultType] || PARTS_BY_FAULT.general;
  const partsUsed = [];
  const partsMissing = [];
  const updated = parts.map((p) => ({ ...p }));
  for (const partId of needed) {
    const p = updated.find((x) => x.partId === partId);
    if (!p || p.stock <= 0) {
      partsMissing.push(partId);
      continue;
    }
    p.stock -= 1;
    partsUsed.push(partId);
    if (p.stock < p.minStock) partsMissing.push(partId); // alerta de reposición
  }
  return { partsUsed, partsMissing: [...new Set(partsMissing)], alertaReposicion: partsMissing.length > 0, parts: updated };
}

/** Marca consumo irregular: total semanal mayor a la media más 2 desviaciones. */
export function flagIrregular(demand) {
  const totals = demand.map((d) => d.total);
  if (totals.length === 0) return demand;
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  const sd = Math.sqrt(totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length);
  return demand.map((d) => ({ ...d, irregular: d.irregular || d.total > mean + 2 * sd }));
}
