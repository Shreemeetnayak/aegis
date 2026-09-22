const configuredBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export async function analyzeRepository(url, { onProgress, signal } = {}) {
  const response = await fetch(`${configuredBaseUrl}/api/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ url }),
    signal,
  });

  if (!response.ok || !response.body) {
    const payload = await safeJson(response);
    throw new ApiError(payload?.error || 'Unable to start repository analysis.', payload?.code);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const frames = buffer.split(/\n\n/);
    buffer = frames.pop() || '';
    for (const frame of frames) {
      const event = parseSseFrame(frame);
      if (!event) continue;
      if (event.name === 'progress') onProgress?.(event.data);
      if (event.name === 'error') throw new ApiError(event.data.error || 'Repository analysis failed.', event.data.code);
      if (event.name === 'result') result = event.data;
    }
    if (done) break;
  }

  if (!result?.success) throw new ApiError('The analysis stream ended before a report was generated.');
  return result;
}

function parseSseFrame(frame) {
  const lines = frame.split(/\r?\n/);
  const name = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
  const dataText = lines.find((line) => line.startsWith('data:'))?.slice(5).trim();
  if (!name || !dataText) return null;
  try {
    return { name, data: JSON.parse(dataText) };
  } catch {
    return null;
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
