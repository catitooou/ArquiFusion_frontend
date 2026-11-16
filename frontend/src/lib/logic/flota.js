// Lógica pura de flota (sección 6 y 7.3): resumen del dashboard, productividad y mantenimiento.

export function dashboardSummary(machines, incidents = []) {
  const byStatus = { operativa: 0, detenida: 0, requiere_intervencion: 0, mantenimiento: 0 };
  let riskSum = 0;
  for (const m of machines) {
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    riskSum += m.riskScore || 0;
  }
  const open = incidents.filter((i) => i.status !== 'resuelto');
  return {
    total: machines.length,
    byStatus,
    avgRisk: machines.length ? Math.round(riskSum / machines.length) : 0,
    highRisk: machines.filter((m) => (m.riskScore || 0) >= 60).length,
    watch: machines.filter((m) => (m.riskScore || 0) >= 40 && (m.riskScore || 0) < 60).length,
    openIncidents: open.length,
    maintSoon: machines.filter((m) => m.hoursToMaint != null && m.hoursToMaint < 50).length,
  };
}

/** Utilización = activeReadings / readings (FleetKPI). */
export function productivityRanking(rows) {
  return rows
    .map((r) => ({ ...r, utilization: r.readings ? r.activeReadings / r.readings : 0 }))
    .sort((a, b) => b.utilization - a.utilization);
}

export function maintenanceState(hoursToMaint) {
  if (hoursToMaint == null) return null;
  if (hoursToMaint < 0) return 'vencido';
  if (hoursToMaint < 50) return 'proximo';
  return 'ok';
}

export function maintenanceForecast(machines) {
  return machines
    .map((m) => ({
      machineId: m.machineId, model: m.model, zone: m.zone,
      hoursToMaint: m.hoursToMaint, state: maintenanceState(m.hoursToMaint),
    }))
    .sort((a, b) => a.hoursToMaint - b.hoursToMaint);
}
