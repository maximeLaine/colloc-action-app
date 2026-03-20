import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
export const LONG_MODEL = 'claude-sonnet-4-6';
