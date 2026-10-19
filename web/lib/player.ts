import type { AgentState } from '@/lib/deck/types';

type SessionMessage = {
  type?: string;
  message: string;
};

const LIVE_AGENT_STATES = new Set(['idle', 'listening', 'thinking', 'speaking']);

export function agentStateLabel(state: string | undefined): AgentState {
  if (state === 'listening') return 'Listening';
  if (state === 'thinking') return 'Thinking';
  if (state === 'speaking') return 'Speaking';
  return '—';
}

export type PlayerPhase = 'ready' | 'starting' | 'active' | 'ended';

export function isLiveAgentState(state: string | undefined): boolean {
  return state !== undefined && LIVE_AGENT_STATES.has(state);
}

export type PlayerPhaseInput = {
  phase: PlayerPhase;
  hasSlide: boolean;
  agentState: string | undefined;
  agentFinished: boolean;
  roomConnected: boolean;
  agentWasLive: boolean;
};

export function nextPlayerPhase({
  phase,
  hasSlide,
  agentState,
  agentFinished,
  roomConnected,
  agentWasLive,
}: PlayerPhaseInput): PlayerPhase {
  if (phase === 'ready' || phase === 'ended') return phase;
  if (agentState === 'failed') return 'ended';
  if (agentFinished && agentWasLive) return 'ended';
  if (hasSlide || roomConnected || isLiveAgentState(agentState)) return 'active';
  return phase;
}

export function shouldDisconnectSession(from: PlayerPhase, to: PlayerPhase): boolean {
  return to === 'ended' && (from === 'starting' || from === 'active');
}

export function decidePlayerPhase(input: PlayerPhaseInput): {
  phase: PlayerPhase;
  disconnect: boolean;
} {
  const phase = nextPlayerPhase(input);
  return {
    phase,
    disconnect: shouldDisconnectSession(input.phase, phase),
  };
}

export function startupFailureMessage(reason: 'timeout' | 'agent'): string {
  if (reason === 'timeout') {
    return 'The assistant coach did not join in time. Please start a fresh session.';
  }
  return 'The assistant coach could not start. You can retry in a fresh room.';
}

export function agentTurnCount(messages: SessionMessage[]): number {
  return messages.filter((message) => message.type === 'agentTranscript').length;
}

export function latestAgentLine(messages: SessionMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.type === 'agentTranscript') {
      return messages[index]?.message.trim() ?? '';
    }
  }
  return '';
}
