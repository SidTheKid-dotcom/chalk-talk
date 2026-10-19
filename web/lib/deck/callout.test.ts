import { describe, expect, it } from 'vitest';
import {
  RULE_EXACTLY_ONE,
  RULE_TEXT_DIGIT,
  RULE_TEXT_LENGTH,
  RULE_TEXT_LINE,
  RULE_TEXT_SPELLED,
  RULE_TEXT_SYMBOL,
  RULE_TEXT_WORDS,
  RULE_UNKNOWN_FACT,
  calloutRuleReason,
} from '@/lib/deck/callout';

describe('calloutRuleReason', () => {
  it('requires exactly one of fact_id or text', () => {
    expect(calloutRuleReason(null, null)).toBe(RULE_EXACTLY_ONE);
    expect(calloutRuleReason('F07', 'Iguodala on LeBron')).toBe(RULE_EXACTLY_ONE);
  });

  it('rejects unknown fact ids', () => {
    expect(calloutRuleReason('F99', null)).toBe(RULE_UNKNOWN_FACT);
    expect(calloutRuleReason('lebron', null)).toBe(RULE_UNKNOWN_FACT);
  });

  it('accepts a verified fact id', () => {
    expect(calloutRuleReason('F07', null)).toBeNull();
  });

  it('rejects digits, symbols, and spelled-out numbers', () => {
    expect(calloutRuleReason(null, 'He scores 40 a night')).toBe(RULE_TEXT_DIGIT);
    expect(calloutRuleReason(null, 'Stay home %')).toBe(RULE_TEXT_SYMBOL);
    expect(calloutRuleReason(null, 'Win the # look')).toBe(RULE_TEXT_SYMBOL);
    expect(calloutRuleReason(null, 'LeBron scores forty a night')).toBe(RULE_TEXT_SPELLED);
    expect(calloutRuleReason(null, 'Give me two extra bodies')).toBe(RULE_TEXT_SPELLED);
  });

  it('rejects length, word, and line violations', () => {
    expect(calloutRuleReason(null, 'no')).toBe(RULE_TEXT_LENGTH);
    expect(calloutRuleReason(null, 'x'.repeat(61))).toBe(RULE_TEXT_LENGTH);
    expect(calloutRuleReason(null, 'stay home on the shooters and help early now')).toBe(
      RULE_TEXT_WORDS
    );
    expect(calloutRuleReason(null, 'Iguodala\non LeBron')).toBe(RULE_TEXT_LINE);
  });

  it('allows one-on-one and a short coaching note', () => {
    expect(calloutRuleReason(null, 'stay one-on-one')).toBeNull();
    expect(calloutRuleReason(null, 'Iguodala on LeBron')).toBeNull();
  });
});
