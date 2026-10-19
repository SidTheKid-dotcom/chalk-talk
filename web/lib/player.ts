import type { AgentState } from '@/lib/deck/types';

type SessionMessage = {
  type?: string;
  message: string;
};

export function agentStateLabel(state: string): AgentState {
  if (state === 'listening') return 'Listening';
  if (state === 'thinking') return 'Thinking';
  if (state === 'speaking') return 'Speaking';
  return '—';
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
