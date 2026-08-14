const DEFAULT_API_BASE = 'http://localhost:5000/api/v1';
const DEFAULT_API_KEY = 'polinela_irwh_secret_key_2026';

export function getStoredApiKey() {
  return localStorage.getItem('irwh_api_key') || DEFAULT_API_KEY;
}

export function setStoredApiKey(key) {
  localStorage.setItem('irwh_api_key', key);
}

export function getApiBaseUrl() {
  return localStorage.getItem('irwh_api_url') || DEFAULT_API_BASE;
}

export function setApiBaseUrl(url) {
  localStorage.setItem('irwh_api_url', url);
}

async function request(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const apiKey = getStoredApiKey();

  const url = `${baseUrl}${path}`;
  const headers = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json();
    return json;
  } catch (error) {
    console.error(`API Error on ${path}:`, error);
    throw error;
  }
}

export async function fetchHealth() {
  return request('/health');
}

export async function fetchOverview() {
  return request('/sensors/overview');
}

export async function fetchSensorsMetadata() {
  return request('/sensors');
}

export async function fetchHistory(sensorId, from = '-24h', interval = 'auto', aggregate = 'mean') {
  return request(`/sensors/${sensorId}/history?from=${encodeURIComponent(from)}&interval=${encodeURIComponent(interval)}&aggregate=${aggregate}`);
}

export async function fetchAiInsight({ from = '-24h', to = 'now()', focusDomain = 'all', forceFresh = false } = {}) {
  return request('/ai-insight', {
    method: 'POST',
    body: JSON.stringify({ from, to, focusDomain, forceFresh })
  });
}

export function getExportCsvUrl(sensorId, from = '-7d') {
  const baseUrl = getApiBaseUrl();
  const apiKey = getStoredApiKey();
  return `${baseUrl}/export/csv?sensorId=${sensorId}&from=${encodeURIComponent(from)}&apiKey=${encodeURIComponent(apiKey)}`;
}

export function createEventSource({ onTelemetry, onStatus, onPing, onError }) {
  const baseUrl = getApiBaseUrl();
  const apiKey = getStoredApiKey();
  const sseUrl = `${baseUrl}/sensors/realtime?apiKey=${encodeURIComponent(apiKey)}`;

  const eventSource = new EventSource(sseUrl);

  eventSource.addEventListener('telemetry', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (onTelemetry) onTelemetry(data);
    } catch (err) {
      console.error('Error parsing telemetry SSE:', err);
    }
  });

  eventSource.addEventListener('status', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (onStatus) onStatus(data);
    } catch (err) {
      console.error('Error parsing status SSE:', err);
    }
  });

  eventSource.addEventListener('ping', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (onPing) onPing(data);
    } catch (err) {
      console.error('Error parsing ping SSE:', err);
    }
  });

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return eventSource;
}
