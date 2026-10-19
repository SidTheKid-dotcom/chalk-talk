# References

Only links found in our research or checked while writing this scaffold. Prefer the LiveKit docs MCP (`lk skills install`) over these pages when coding; docs move.

## LiveKit docs
| Topic | URL |
|---|---|
| Agents intro | https://docs.livekit.io/agents/ |
| Voice AI quickstart | https://docs.livekit.io/agents/start/voice-ai.md |
| Agent session, RoomIO, linked participant, `set_participant` | https://docs.livekit.io/agents/logic/sessions/ |
| Turns and interruptions | https://docs.livekit.io/agents/logic/turns.md (also served at https://docs.livekit.io/agents/build/turns.md) |
| Turn detector | https://docs.livekit.io/agents/logic/turns/turn-detector.md |
| Adaptive interruption | https://docs.livekit.io/agents/logic/turns/adaptive-interruption-handling.md |
| Tools overview | https://docs.livekit.io/agents/logic/tools.md |
| Function tool definition | https://docs.livekit.io/agents/logic/tools/definition.md |
| Forwarding tools to the frontend (perform_rpc) | https://docs.livekit.io/agents/logic/tools/forwarding.md |
| Async tools | https://docs.livekit.io/agents/logic/tools/async/ |
| Agents and handoffs | https://docs.livekit.io/agents/logic/agents-handoffs.md |
| Warm transfer (SIP) | https://docs.livekit.io/sip/transfer-warm.md |
| RPC | https://docs.livekit.io/transport/data/rpc.md |
| Participant attributes | https://docs.livekit.io/transport/data/state/participant-attributes.md |
| Text streams | https://docs.livekit.io/transport/data/text-streams.md |
| Text and transcriptions | https://docs.livekit.io/agents/multimodality/text.md |
| Agent speech | https://docs.livekit.io/agents/multimodality/audio.md |
| Realtime models overview | https://docs.livekit.io/agents/models/realtime.md |
| OpenAI Realtime plugin | https://docs.livekit.io/agents/models/realtime/openai.md |
| Agent state in frontends | https://docs.livekit.io/frontends/build/agent-state.md |
| React starter app | https://docs.livekit.io/frontends/start/starter-apps/react.md |
| Token endpoints | https://docs.livekit.io/frontends/build/authentication/endpoint.md |
| Agent dispatch | https://docs.livekit.io/agents/server/agent-dispatch.md |
| Testing agents (unit tests) | https://docs.livekit.io/testing/unit-tests/ |
| CLI docs access | `lk docs search`, `lk docs get-page`, `lk docs code-search`, `lk docs changelog livekit/agents` |
| Quotas and limits | https://docs.livekit.io/deploy/admin/quotas-and-limits.md |
| Pricing | https://livekit.com/pricing |
| KB: fixed participant for agent audio | https://kb.livekit.io/articles/8350195063-how-to-set-a-fixed-participant-for-agent-audio-processing |

## LiveKit code
| Repo / file | Use |
|---|---|
| https://github.com/livekit-examples/agent-starter-python | Agent template (`lk agent init --template agent-starter-python`) |
| https://github.com/livekit-examples/agent-starter-react | Frontend base. Token route at `app/api/token/route.ts`. |
| https://github.com/livekit-examples/python-agents-examples | `docs/examples/rpc_agent`, `state_tracking`, `complex-agents/teleprompter` |
| https://github.com/livekit/agents/blob/main/examples/voice_agents/toggle_io.py | `RoomIO.set_participant` / `unset_participant` via RPC. Key for Spike 1. |
| https://github.com/livekit/agents/issues/6411 | Realtime speaks then calls tool (double reply). Context for Spike 2. |
| https://github.com/livekit/agents/issues/3963 | Realtime history and truncation discussion |
| https://github.com/livekit/agents/issues/2018 | Explicit RoomIO with a chosen participant |
| https://community.livekit.io/t/we-need-to-talk-about-pre-tool-call-speech/1152 | Pre-tool-call speech; no flag gates tool on playout |

## Reference repos (what to borrow)
### thesysdev/voice-agent-generativeui (best reference)
https://github.com/thesysdev/voice-agent-generativeui
- `src/app/api/connection-details/route.ts`: explicit dispatch with `RoomConfiguration({agents:[{agentName}]})`, short TTL.
- `livekit-agent/src/index.ts`: `openai.realtime.RealtimeModel` session setup (Node; port the idea to Python).
- `livekit-agent/src/tools/show-ui.ts`: tool result that tells the model what to say; AbortController to supersede stale work (we use seq instead). Note: no ack, by design.
- `livekit-agent/src/prompt.ts`: narration-before-tool prompt for realtime (useful for `call_head_coach`).
- `src/lib/components/VoiceUI.tsx`: `registerTextStreamHandler` with unregister in cleanup.
- `.github/workflows/deploy-agent.yml` + `livekit-agent/livekit.toml` + `Dockerfile`: CI deploy of the agent to LiveKit Cloud with `lk` CLI. Untested as-is.

### aydrian/teleprompter (+ livekit-examples teleprompter)
https://github.com/aydrian/teleprompter
- `agents/teleprompter/agent.ts`: agent `performRpc` to a destination identity with `responseTimeout` and try/catch per participant.
- `app/hooks/useTranscriber.ts`: `registerRpcMethod` in `useEffect` with `unregisterRpcMethod` cleanup.
- Do NOT copy: `app/routes/api/livekit/token.ts` (`roomAdmin: true`, fixed room, open GET).
- Python version sends to `remote_participants[0]`: do not copy.

## Synthio context (for product framing)
| Post | URL |
|---|---|
| Anatomy of a Warm Transfer | https://synthiolabs.com/blog/anatomy-of-a-warm-transfer |
| Anatomy of a Compliant Voice Agent for Life Sciences | https://synthiolabs.com/blog/anatomy-of-a-voice-agent |
| Synthio Labs AI Guardrails Framework | https://synthiolabs.com/blog/synthio-labs-ai-guardrails-framework |
| Building Trustworthy Voice AI for Pharma With Our Evaluation Framework | https://synthiolabs.com/blog/building-trustworthy-voice-ai-for-pharma-with-our-evaluation-framework |
| Building Reliable AI Agents for Life Sciences | https://synthiolabs.com/blog/building-reliable-ai-agents-for-life-sciences |
| Keep the model in the driver's seat | https://synthiolabs.com/blog/keep-the-model-in-the-drivers-seat |
| Voice AI product page | https://synthiolabs.com/voice-ai |

## Sources for slide facts
- Basketball-Reference 2016 Finals series page: https://www.basketball-reference.com/playoffs/2016-nba-finals-cavaliers-vs-warriors.html
- NBA.com stats and game pages (add exact URLs in `FACTS.md`).
