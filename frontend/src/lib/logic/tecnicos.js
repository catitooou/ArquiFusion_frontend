// Lógica pura de asignación de técnicos (sección 7.4, assign-technician).
// Sin dependencias: se puede copiar tal cual a services/tecnicos/logic.js del backend.

const R = 6371; // radio de la Tierra en km

export function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Puntaje de un técnico para un incidente: 0.35 cercanía + 0.30 especialidad + 0.20 baja carga + 0.15 experiencia */
export function scoreTechnician(tech, incident) {
  const distanceKm = haversineKm(tech, incident);
  const cercania = 1 - Math.min(distanceKm / 30, 1);
  const especialidad = (tech.specialty || []).includes(incident.faultType) ? 1 : 0.2;
  const bajaCarga = 1 / (1 + (tech.activeIncidents || 0));
  const experiencia = Math.min((tech.experienceYears || 0) / 10, 1);
  const score = 0.35 * cercania + 0.3 * especialidad + 0.2 * bajaCarga + 0.15 * experiencia;
  const etaMin = Math.round((distanceKm / 30) * 60 + 10);
  return {
    techId: tech.techId,
    name: tech.name,
    score: +score.toFixed(3),
    distanceKm: +distanceKm.toFixed(1),
    etaMin,
    breakdown: {
      cercania: +cercania.toFixed(2),
      especialidad,
      bajaCarga: +bajaCarga.toFixed(2),
      experiencia: +experiencia.toFixed(2),
    },
  };
}

/**
 * Elige el mejor técnico y 2 alternativas.
 * @param {Array} technicians
 * @param {{lat:number,lng:number,faultType:string}} incident
 */
export function rankTechnicians(technicians, incident) {
  const available = technicians.filter((t) => t.available);
  if (available.length === 0) {
    const leastBusy = [...technicians].sort((a, b) => (a.activeIncidents || 0) - (b.activeIncidents || 0))[0];
    if (!leastBusy) return { winner: null, alternatives: [], sinDisponibles: true };
    return { winner: scoreTechnician(leastBusy, incident), alternatives: [], sinDisponibles: true };
  }
  const ranked = available.map((t) => scoreTechnician(t, incident)).sort((a, b) => b.score - a.score);
  return { winner: ranked[0], alternatives: ranked.slice(1, 3), sinDisponibles: false };
}
