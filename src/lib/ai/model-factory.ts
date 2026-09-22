/**
 * AuraNER / NER-Route AI — Production AI Service & Model Provider Factory
 * 
 * Supports Tier-1 LLM providers for multi-agent reasoning:
 * - OpenAI (gpt-4o, gpt-4o-mini, o1, etc.)
 * - Anthropic (claude-3-5-sonnet-20241022, claude-3-5-haiku, etc.)
 * - Google Gemini (gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash)
 * - Azure OpenAI / Microsoft Foundry
 * - DeepSeek (deepseek-chat, deepseek-reasoner)
 * - OpenRouter
 * 
 * Invariants:
 * 1. AI reasons, APIs provide facts, backend enforces.
 * 2. Never fabricate operational responses or fake successful AI completions.
 * 3. When unconfigured, fails safely with typed AIProviderUnconfiguredError.
 */

import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export type AIProviderName = 'openai' | 'anthropic' | 'gemini' | 'azure' | 'deepseek' | 'openrouter' | 'none';

export class AIProviderError extends Error {
  public readonly provider: AIProviderName;
  public readonly statusCode: number;

  constructor(message: string, provider: AIProviderName, statusCode = 502) {
    super(message);
    this.name = 'AIProviderError';
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export class AIProviderUnconfiguredError extends AIProviderError {
  constructor(provider: AIProviderName, missingVar: string) {
    super(
      `AI Provider '${provider}' is not configured. Missing environment variable: ${missingVar}. Please configure valid credentials to enable AI reasoning.`,
      provider,
      503
    );
    this.name = 'AIProviderUnconfiguredError';
  }
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICallOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface AICompletionResult {
  content: string;
  provider: AIProviderName;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
}

export interface AIRuntimeModelInfo {
  configuredProvider: AIProviderName;
  resolvedModelId: string;
  isConfigured: boolean;
  apiKeyEnvVar: string;
  modelEnvVar: string;
  status: 'READY' | 'UNCONFIGURED' | 'DISABLED';
}

export const DEFAULT_PROVIDER_MODELS: Record<AIProviderName, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash',
  azure: 'gpt-4o',
  deepseek: 'deepseek-chat',
  openrouter: 'anthropic/claude-3.5-sonnet',
  none: 'none',
};

/**
 * Returns runtime inspection details about the active AI provider
 */
export function getAIRuntimeInventory(): AIRuntimeModelInfo {
  const env = getEnv();
  const provider = (env.AI_PROVIDER || 'none') as AIProviderName;
  const configuredModel = env.AI_MODEL || DEFAULT_PROVIDER_MODELS[provider] || 'none';

  let isConfigured = false;
  let apiKeyEnvVar = 'NONE';

  switch (provider) {
    case 'openai':
      apiKeyEnvVar = 'OPENAI_API_KEY';
      isConfigured = Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0);
      break;
    case 'anthropic':
      apiKeyEnvVar = 'ANTHROPIC_API_KEY';
      isConfigured = Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim().length > 0);
      break;
    case 'gemini':
      apiKeyEnvVar = 'GEMINI_API_KEY';
      isConfigured = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
      break;
    case 'azure':
      apiKeyEnvVar = 'AZURE_OPENAI_API_KEY';
      isConfigured = Boolean(env.AZURE_OPENAI_API_KEY && env.AZURE_OPENAI_ENDPOINT);
      break;
    case 'deepseek':
      apiKeyEnvVar = 'DEEPSEEK_API_KEY';
      isConfigured = Boolean(env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY.trim().length > 0);
      break;
    case 'openrouter':
      apiKeyEnvVar = 'OPENROUTER_API_KEY';
      isConfigured = Boolean(env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.trim().length > 0);
      break;
    case 'none':
    default:
      apiKeyEnvVar = 'NONE';
      isConfigured = false;
      break;
  }

  return {
    configuredProvider: provider,
    resolvedModelId: configuredModel,
    isConfigured,
    apiKeyEnvVar,
    modelEnvVar: 'AI_MODEL',
    status: provider === 'none' ? 'DISABLED' : isConfigured ? 'READY' : 'UNCONFIGURED',
  };
}

/**
 * Checks if the configured AI provider has valid credentials
 */
export function isAIConfigured(): boolean {
  return getAIRuntimeInventory().isConfigured;
}

/**
 * Invokes the configured AI provider to generate a reasoning completion
 */
export async function executeAICompletion(
  messages: AIMessage[],
  options: AICallOptions = {}
): Promise<AICompletionResult> {
  const env = getEnv();
  const inventory = getAIRuntimeInventory();
  const provider = inventory.configuredProvider;
  const model = inventory.resolvedModelId;

  if (provider === 'none') {
    throw new AIProviderUnconfiguredError('none', 'AI_PROVIDER');
  }

  if (!inventory.isConfigured) {
    throw new AIProviderUnconfiguredError(provider, inventory.apiKeyEnvVar);
  }

  const startTime = Date.now();
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 2048;

  switch (provider) {
    case 'openai': {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new AIProviderError(`OpenAI API error (${res.status}): ${errText}`, 'openai', res.status);
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        provider: 'openai',
        model: data.model || model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        durationMs: Date.now() - startTime,
      };
    }

    case 'anthropic': {
      const systemMessage = messages.find((m) => m.role === 'system')?.content;
      const conversationMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          system: systemMessage,
          messages: conversationMessages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new AIProviderError(`Anthropic API error (${res.status}): ${errText}`, 'anthropic', res.status);
      }

      const data = await res.json();
      const content = data.content?.[0]?.text || '';
      return {
        content,
        provider: 'anthropic',
        model: data.model || model,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        durationMs: Date.now() - startTime,
      };
    }

    case 'gemini': {
      const systemMessage = messages.find((m) => m.role === 'system')?.content;
      const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemMessage ? { parts: [{ text: systemMessage }] } : undefined,
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: options.responseFormat === 'json' ? 'application/json' : 'text/plain',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new AIProviderError(`Gemini API error (${res.status}): ${errText}`, 'gemini', res.status);
      }

      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const promptTokens = data.usageMetadata?.promptTokenCount || 0;
      const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

      return {
        content,
        provider: 'gemini',
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        durationMs: Date.now() - startTime,
      };
    }

    case 'azure': {
      const endpoint = env.AZURE_OPENAI_ENDPOINT!.replace(/\/+$/, '');
      const url = `${endpoint}/openai/deployments/${model}/chat/completions?api-version=2024-08-01-preview`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': env.AZURE_OPENAI_API_KEY!,
        },
        body: JSON.stringify({
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new AIProviderError(`Azure OpenAI API error (${res.status}): ${errText}`, 'azure', res.status);
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        provider: 'azure',
        model: data.model || model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        durationMs: Date.now() - startTime,
      };
    }

    case 'deepseek': {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new AIProviderError(`DeepSeek API error (${res.status}): ${errText}`, 'deepseek', res.status);
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        provider: 'deepseek',
        model: data.model || model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        durationMs: Date.now() - startTime,
      };
    }

    case 'openrouter': {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://ner-routeai.in',
          'X-Title': 'NER-RouteAI Logistics Intelligence',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new AIProviderError(`OpenRouter API error (${res.status}): ${errText}`, 'openrouter', res.status);
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        provider: 'openrouter',
        model: data.model || model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        durationMs: Date.now() - startTime,
      };
    }

    default:
      throw new AIProviderUnconfiguredError(provider, inventory.apiKeyEnvVar);
  }
}
