// Azure Function HTTP Trigger: send-notification (sección 9.2)
// Entrada JSON: { incidentId, role, severity, machineId, title, message }
// Respuesta JSON: { ok: true, channel: "azure-push", deliveredAt }

function buildRolePayload(body) {
  const { incidentId, role, severity, machineId, title, message } = body;
  const urgencyMap = {
    operador: severity === 'critica' ? 'detencion_inmediata' : 'alerta_cabina',
    tecnico: 'despacho_campo',
    gerente: ['alta', 'critica'].includes(severity) ? 'escalamiento_gerencial' : 'resumen_operativo',
  };
  return {
    incidentId,
    role,
    severity,
    machineId,
    title: title || `Alerta ${severity || 'media'} en ${machineId}`,
    message,
    urgency: urgencyMap[role] || 'general',
    deliveredAt: new Date().toISOString(),
  };
}

async function archiveToBlobIfConfigured(payload, context) {
  const sasBase = process.env.AZURE_NOTIF_BLOB_SAS_URL;
  if (sasBase) {
    const [baseUrl, query] = sasBase.split('?');
    const blobUrl = `${baseUrl.replace(/\/$/, '')}/${payload.incidentId}-${payload.role}-${Date.now()}.json${query ? `?${query}` : ''}`;
    const res = await fetch(blobUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      context.log.warn(`No se pudo archivar notificación en Blob (${res.status})`);
    }
    return;
  }

  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    try {
      const { BlobServiceClient } = require('@azure/storage-blob');
      const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
      const container = client.getContainerClient('notificaciones');
      await container.createIfNotExists();
      const blobName = `${payload.incidentId}-${payload.role}-${Date.now()}.json`;
      const data = JSON.stringify(payload);
      await container.getBlockBlobClient(blobName).upload(data, Buffer.byteLength(data));
    } catch (err) {
      context.log.warn('Archivo en Blob omitido:', err.message);
    }
  }
}

module.exports = async function (context, req) {
  const body = req.body || {};
  const { incidentId, role, machineId, message } = body;

  if (!incidentId || !role || !machineId || !message) {
    context.res = {
      status: 400,
      headers: { 'content-type': 'application/json' },
      body: { ok: false, error: { code: 'INVALID_PAYLOAD', message: 'Faltan campos requeridos (incidentId, role, machineId, message).' } },
    };
    return;
  }

  const payload = buildRolePayload(body);
  context.log(`Notificación [${payload.role}] (${payload.urgency}) -> ${payload.incidentId}: ${payload.message}`);

  await archiveToBlobIfConfigured(payload, context);

  context.res = {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: {
      ok: true,
      channel: 'azure-push',
      deliveredAt: payload.deliveredAt,
    },
  };
};
