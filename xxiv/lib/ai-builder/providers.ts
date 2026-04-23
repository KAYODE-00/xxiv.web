import Anthropic from '@anthropic-ai/sdk';
import {
  AI_BUILDER_SYSTEM_PROMPT,
  extractClaudeText,
  parseSitePlanJson,
} from '@/lib/ai-builder/site-plan';
import type {
  AiBuilderGenerateRequest,
  AiBuilderProviderId,
  AiBuilderSitePlan,
} from '@/lib/ai-builder/types';

type GenerateSitePlanArgs = {
  payload: AiBuilderGenerateRequest;
  prompt: string;
};

type AiBuilderProvider = {
  id: AiBuilderProviderId;
  label: string;
  supportsImages: boolean;
  generateSitePlan: (args: GenerateSitePlanArgs) => Promise<AiBuilderSitePlan>;
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  return new Anthropic({ apiKey });
}

async function generateWithAnthropic({
  payload,
  prompt,
}: GenerateSitePlanArgs): Promise<AiBuilderSitePlan> {
  const anthropic = getAnthropicClient();
  const model = payload.model?.trim() || process.env.AI_BUILDER_ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    system: AI_BUILDER_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: payload.imageBase64
          ? [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: payload.imageMediaType!,
                  data: payload.imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ]
          : [{ type: 'text', text: prompt }],
      },
    ],
  });

  return parseSitePlanJson(extractClaudeText(response.content));
}

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

async function generateWithGroq({
  payload,
  prompt,
}: GenerateSitePlanArgs): Promise<AiBuilderSitePlan> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  if (payload.imageBase64) {
    throw new Error('Image-based AI generation currently uses Anthropic in this integration. Choose Claude for screenshots or Figma exports.');
  }

  const model = payload.model?.trim() || process.env.AI_BUILDER_GROQ_MODEL || 'llama-3.3-70b-versatile';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: AI_BUILDER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const json = await response.json() as GroqChatCompletionResponse;
  if (!response.ok) {
    throw new Error(json.error?.message || 'Groq request failed');
  }

  const raw = json.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error('Groq did not return a site plan');
  }

  return parseSitePlanJson(raw);
}

const PROVIDERS: Record<AiBuilderProviderId, AiBuilderProvider> = {
  anthropic: {
    id: 'anthropic',
    label: 'Claude',
    supportsImages: true,
    generateSitePlan: generateWithAnthropic,
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    supportsImages: false,
    generateSitePlan: generateWithGroq,
  },
};

export function getAiBuilderProvider(providerId?: string | null): AiBuilderProvider {
  if (providerId === 'groq') {
    return PROVIDERS.groq;
  }

  if (providerId === 'anthropic') {
    return PROVIDERS.anthropic;
  }

  const defaultProvider = process.env.AI_BUILDER_DEFAULT_PROVIDER;
  if (defaultProvider === 'groq') {
    return PROVIDERS.groq;
  }

  return PROVIDERS.anthropic;
}

export function listAiBuilderProviders() {
  return Object.values(PROVIDERS).map((provider) => ({
    id: provider.id,
    label: provider.label,
    supportsImages: provider.supportsImages,
  }));
}

export async function generateSitePlanWithProvider(
  payload: AiBuilderGenerateRequest,
  prompt: string,
) {
  const provider = getAiBuilderProvider(payload.provider);
  return provider.generateSitePlan({ payload, prompt });
}
