import test from 'node:test';
import assert from 'node:assert/strict';
import { rankTechnicians, scoreTechnician, haversineKm } from './tecnicos.js';
import { checkParts, flagIrregular } from './repuestos.js';
import { dashboardSummary, maintenanceForecast, maintenanceState, productivityRanking } from './flota.js';

test('haversineKm calcula distancia ~0 para el mismo punto y positiva para distintos', () => {
  assert.equal(haversineKm({ lat: -12.0, lng: -77.0 }, { lat: -12.0, lng: -77.0 }), 0);
  const d = haversineKm({ lat: -11.98, lng: -77.05 }, { lat: -12.12, lng: -77.03 });
  assert.ok(d > 14 && d < 17);
});

test('scoreTechnician y rankTechnicians priorizan cercanía, especialidad, baja carga y experiencia', () => {
  const techs = [
    { techId: 'T1', name: 'Especialista Cerca', lat: -11.981, lng: -77.051, specialty: ['motor'], activeIncidents: 0, experienceYears: 8, available: true },
    { techId: 'T2', name: 'Lejos Sin Esp', lat: -12.15, lng: -77.01, specialty: ['electrico'], activeIncidents: 2, experienceYears: 2, available: true },
    { techId: 'T3', name: 'No Disponible', lat: -11.98, lng: -77.05, specialty: ['motor'], activeIncidents: 0, experienceYears: 10, available: false },
    { techId: 'T4', name: 'Alternativa', lat: -12.01, lng: -77.05, specialty: ['motor'], activeIncidents: 1, experienceYears: 5, available: true },
  ];
  const incident = { lat: -11.98, lng: -77.05, faultType: 'motor' };
  const s1 = scoreTechnician(techs[0], incident);
  assert.equal(s1.breakdown.especialidad, 1);
  assert.ok(s1.etaMin >= 10);

  const ranked = rankTechnicians(techs, incident);
  assert.equal(ranked.sinDisponibles, false);
  assert.equal(ranked.winner.techId, 'T1');
  assert.equal(ranked.alternatives.length, 2);
  assert.equal(ranked.alternatives[0].techId, 'T4');
});

test('rankTechnicians elige al de menor carga cuando no hay disponibles', () => {
  const techs = [
    { techId: 'T1', name: 'Ocupado 2', lat: -12.0, lng: -77.0, specialty: ['motor'], activeIncidents: 2, experienceYears: 5, available: false },
    { techId: 'T2', name: 'Ocupado 1', lat: -12.0, lng: -77.0, specialty: ['motor'], activeIncidents: 1, experienceYears: 5, available: false },
  ];
  const ranked = rankTechnicians(techs, { lat: -12.0, lng: -77.0, faultType: 'motor' });
  assert.equal(ranked.sinDisponibles, true);
  assert.equal(ranked.winner.techId, 'T2');
});

test('checkParts descuenta stock sin mutar la entrada y reporta faltantes/bajo mínimo', () => {
  const original = [
    { partId: 'P-INY', stock: 3, minStock: 2 },
    { partId: 'P-FIL-COM', stock: 2, minStock: 3 },
  ];
  const res = checkParts(original, 'combustible');
  assert.equal(original[0].stock, 3);
  assert.deepEqual(res.partsUsed, ['P-INY', 'P-FIL-COM']);
  assert.deepEqual(res.partsMissing, ['P-FIL-COM']);
  assert.equal(res.alertaReposicion, true);
});

test('flagIrregular detecta consumo mayor a media + 2 desviaciones', () => {
  const demand = [
    { partId: 'A', total: 2, irregular: false },
    { partId: 'B', total: 3, irregular: false },
    { partId: 'C', total: 2, irregular: false },
    { partId: 'D', total: 3, irregular: false },
    { partId: 'E', total: 2, irregular: false },
    { partId: 'F', total: 2, irregular: false },
    { partId: 'G', total: 3, irregular: false },
    { partId: 'H', total: 25, irregular: false },
  ];
  const flagged = flagIrregular(demand);
  assert.equal(flagged.find((x) => x.partId === 'H').irregular, true);
  assert.equal(flagged.find((x) => x.partId === 'A').irregular, false);
});

test('dashboardSummary, maintenanceForecast y productivityRanking calculan métricas correctamente', () => {
  const machines = [
    { machineId: 'M1', model: 'EX-320', zone: 'ZONA-NORTE', status: 'operativa', riskScore: 20, hoursToMaint: 120 },
    { machineId: 'M2', model: 'CT-740', zone: 'ZONA-SUR', status: 'requiere_intervencion', riskScore: 80, hoursToMaint: 30 },
    { machineId: 'M3', model: 'CG-210', zone: 'ZONA-ESTE', status: 'mantenimiento', riskScore: 10, hoursToMaint: -5 },
  ];
  const incidents = [{ incidentId: 'INC-1', status: 'en_atencion' }, { incidentId: 'INC-2', status: 'resuelto' }];
  const sum = dashboardSummary(machines, incidents);
  assert.equal(sum.total, 3);
  assert.equal(sum.byStatus.operativa, 1);
  assert.equal(sum.byStatus.requiere_intervencion, 1);
  assert.equal(sum.highRisk, 1);
  assert.equal(sum.openIncidents, 1);
  assert.equal(sum.maintSoon, 2);

  assert.equal(maintenanceState(-5), 'vencido');
  assert.equal(maintenanceState(30), 'proximo');
  assert.equal(maintenanceState(120), 'ok');

  const forecast = maintenanceForecast(machines);
  assert.equal(forecast[0].machineId, 'M3');

  const ranking = productivityRanking([
    { machineId: 'M1', readings: 100, activeReadings: 40 },
    { machineId: 'M2', readings: 100, activeReadings: 90 },
  ]);
  assert.equal(ranking[0].machineId, 'M2');
  assert.equal(ranking[0].utilization, 0.9);
});
