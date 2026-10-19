import { describe, expect, it } from 'vitest';
import {
  agentStateLabel,
  agentTurnCount,
  decidePlayerPhase,
  latestAgentLine,
  nextPlayerPhase,
  shouldDisconnectSession,
  startupFailureMessage,
} from '@/lib/player';

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
    expect(agentStateLabel(undefined)).toBe('—');
  });
});

describe('player session lifecycle', () => {
  const starting = {
    phase: 'starting' as const,
    hasSlide: false,
    agentState: undefined as string | undefined,
    agentFinished: false,
    roomConnected: false,
    agentWasLive: false,
  };

  it('keeps starting when lk.agent.state is missing and no slide has arrived', () => {
    expect(nextPlayerPhase(starting)).toBe('starting');
    expect(decidePlayerPhase(starting)).toEqual({ phase: 'starting', disconnect: false });
  });

  it('does not treat a pre-join finished/disconnected agent as a start failure', () => {
    expect(
      nextPlayerPhase({
        ...starting,
        agentFinished: true,
        agentState: 'disconnected',
      })
    ).toBe('starting');
  });

  it('leaves WelcomeView when an RPC or attribute slide arrives without agent state', () => {
    expect(
      nextPlayerPhase({
        ...starting,
        hasSlide: true,
      })
    ).toBe('active');
  });

  it('leaves starting once the room is connected, still without inventing slide 1', () => {
    expect(
      nextPlayerPhase({
        ...starting,
        roomConnected: true,
        agentFinished: true,
      })
    ).toBe('active');
  });

  it('leaves starting when the agent is live even if the first slide is late', () => {
    expect(
      nextPlayerPhase({
        ...starting,
        agentState: 'listening',
        agentWasLive: true,
      })
    ).toBe('active');
  });

  it('ends starting on failed agent state and asks the session to disconnect', () => {
    expect(decidePlayerPhase({ ...starting, agentState: 'failed' })).toEqual({
      phase: 'ended',
      disconnect: true,
    });
    expect(startupFailureMessage('agent')).toMatch(/could not start/);
    expect(startupFailureMessage('timeout')).toMatch(/did not join in time/);
  });

  it('disconnects an active session only after a live agent finishes or leaves', () => {
    expect(
      decidePlayerPhase({
        phase: 'active',
        hasSlide: true,
        agentState: 'disconnected',
        agentFinished: true,
        roomConnected: true,
        agentWasLive: true,
      })
    ).toEqual({ phase: 'ended', disconnect: true });
    expect(shouldDisconnectSession('active', 'ended')).toBe(true);
  });

  it('keeps an active board with no currentSlideId so typed commands stay available', () => {
    expect(
      nextPlayerPhase({
        phase: 'active',
        hasSlide: false,
        agentState: undefined,
        agentFinished: false,
        roomConnected: true,
        agentWasLive: false,
      })
    ).toBe('active');
  });

  it('does not disconnect CHALK_DEBUG-style sessions that never publish lk.agent.state', () => {
    expect(
      decidePlayerPhase({
        phase: 'active',
        hasSlide: true,
        agentState: undefined,
        agentFinished: true,
        roomConnected: true,
        agentWasLive: false,
      })
    ).toEqual({ phase: 'active', disconnect: false });
  });
});
