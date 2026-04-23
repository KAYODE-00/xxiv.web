import type {
  AiBuilderGenerateRequest,
  AiBuilderProgressStage,
  AiBuilderProviderId,
  AiBuilderSitePlan,
} from '@/lib/ai-builder/types';

export async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image'));
        return;
      }
      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

export async function generateAiSitePlan(
  payload: AiBuilderGenerateRequest,
): Promise<AiBuilderSitePlan> {
  const response = await fetch('/api/ai-builder/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || 'Failed to generate a site plan');
  }

  return json as AiBuilderSitePlan;
}

export async function streamAiSiteBuild(params: {
  projectId: string;
  sitePlan: AiBuilderSitePlan;
  onProgress: (data: { stage?: string; message?: string; editorUrl?: string }) => void;
  onComplete: (editorUrl: string) => void;
}) {
  const buildResponse = await fetch('/api/ai-builder/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: params.projectId,
      sitePlan: params.sitePlan,
    }),
  });

  if (!buildResponse.ok || !buildResponse.body) {
    const text = await buildResponse.text();
    throw new Error(text || 'Failed to build the website');
  }

  const reader = buildResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const eventBlock of events) {
      const lines = eventBlock.split('\n');
      const eventName = lines.find((line) => line.startsWith('event:'))?.replace('event:', '').trim();
      const dataLine = lines.find((line) => line.startsWith('data:'))?.replace('data:', '').trim();
      if (!eventName || !dataLine) continue;

      const data = JSON.parse(dataLine) as {
        stage?: AiBuilderProgressStage;
        message?: string;
        editorUrl?: string;
      };

      if (eventName === 'progress') {
        params.onProgress(data);
      }

      if (eventName === 'complete' && data.editorUrl) {
        params.onComplete(data.editorUrl);
        return;
      }

      if (eventName === 'error') {
        throw new Error(data.message || 'Something went wrong during the build');
      }
    }
  }
}

export const AI_BUILDER_PROVIDER_OPTIONS: Array<{
  id: AiBuilderProviderId;
  label: string;
  supportsImages: boolean;
}> = [
  { id: 'anthropic', label: 'Claude', supportsImages: true },
  { id: 'groq', label: 'Groq', supportsImages: false },
];
