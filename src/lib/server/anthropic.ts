import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

export const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
export const LONG_MODEL = 'claude-sonnet-4-6';
