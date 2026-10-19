from agent import AGENT_NAME, Assistant


def test_explicit_dispatch_name_is_set() -> None:
    assert AGENT_NAME


def test_assistant_greets_as_warriors_coach() -> None:
    instructions = Assistant().instructions
    assert "Warriors" in instructions
    assert "Game 7" in instructions
    assert "2016 NBA Finals" in instructions
