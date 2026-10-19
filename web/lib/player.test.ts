import { describe, expect, it } from 'vitest';
import { agentStateLabel, agentTurnCount, latestAgentLine } from '@/lib/player';

describe('player session presentation', () => {
  const messages = [
    { type: 'userTranscript', message: 'How do we stop LeBron?' },
    { type: 'agentTranscript', message: 'We load early help toward the paint.' },
    { type: 'userInput', message: 'What about Kyrie?' },
    { type: 'agentTranscript', message: 'Keep the first defender square.' },
  ];

  it('shows the latest agent transcription and counts only agent turns', () => {
    expect(latestAgentLine(messages)).toBe('Keep the first defender square.');
    expect(agentTurnCount(messages)).toBe(2);
  });

  it('maps only displayable agent states', () => {
    expect(agentStateLabel('listening')).toBe('Listening');
    expect(agentStateLabel('thinking')).toBe('Thinking');
    expect(agentStateLabel('speaking')).toBe('Speaking');
    expect(agentStateLabel('initializing')).toBe('—');
  });
});
