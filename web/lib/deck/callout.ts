import { facts } from '@/lib/deck/load';

export const CALLOUT_MIN_CHARS = 3;
export const CALLOUT_MAX_CHARS = 60;
export const CALLOUT_MAX_WORDS = 8;

export const RULE_EXACTLY_ONE = 'exactly one of fact_id or text';
export const RULE_UNKNOWN_FACT = 'unknown or unverified fact_id';
export const RULE_TEXT_LENGTH = 'text must be 3-60 characters';
export const RULE_TEXT_WORDS = 'text must be at most 8 words';
export const RULE_TEXT_LINE = 'text must be one line';
export const RULE_TEXT_DIGIT = 'text has a digit';
export const RULE_TEXT_SYMBOL = 'text has a forbidden symbol';
export const RULE_TEXT_SPELLED = 'text has a spelled-out number';

const SPELLED = [
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
  'hundred',
  'thousand',
  'million',
  'dozen',
  'percent',
];

const SPELLED_RE = new RegExp(`\\b(${SPELLED.join('|')})\\b`, 'i');
const FACT_ID_RE = /^F[0-9]{2}$/;
const verifiedFactIds = new Set(facts.map((fact) => fact.id));

export function calloutRuleReason(
  factId: string | null | undefined,
  text: string | null | undefined
): string | null {
  const hasFact = typeof factId === 'string' && factId.trim() !== '';
  const hasText = typeof text === 'string' && text !== '';
  if (hasFact === hasText) {
    return RULE_EXACTLY_ONE;
  }
  if (hasFact) {
    if (!FACT_ID_RE.test(factId) || !verifiedFactIds.has(factId)) {
      return RULE_UNKNOWN_FACT;
    }
    return null;
  }

  const raw = text as string;
  if (raw.includes('\n') || raw.includes('\r')) {
    return RULE_TEXT_LINE;
  }
  const trimmed = raw.trim();
  if (trimmed.length < CALLOUT_MIN_CHARS || trimmed.length > CALLOUT_MAX_CHARS) {
    return RULE_TEXT_LENGTH;
  }
  if (trimmed.split(/\s+/).length > CALLOUT_MAX_WORDS) {
    return RULE_TEXT_WORDS;
  }
  if (/\d/.test(trimmed)) {
    return RULE_TEXT_DIGIT;
  }
  if (/[%#$]/.test(trimmed)) {
    return RULE_TEXT_SYMBOL;
  }
  if (SPELLED_RE.test(trimmed)) {
    return RULE_TEXT_SPELLED;
  }
  return null;
}
