"""
Unit Tests: Capability Gap Engine
Tests honest limitation reporting, detection of unsupported capabilities, and alternative proposals.
"""
from backend.app.agent.capability_engine import CapabilityGapEngine


def test_supported_goal_has_no_capability_gap():
    goal = "Find 3 papers on cryptocurrency fraud on arXiv, write a technical summary, and save it to Google Drive."
    report = CapabilityGapEngine.analyze_goal(goal)
    assert report.has_gap is False
    assert len(report.missing_capabilities) == 0
    assert report.can_partially_execute is True


def test_unsupported_messaging_capability_detected():
    goal = "Send a summary of the cryptocurrency research paper to my team on WhatsApp."
    report = CapabilityGapEngine.analyze_goal(goal)
    assert report.has_gap is True
    assert "messaging.chat" in report.missing_capabilities
    assert "WhatsApp" in report.explanation or "chat" in report.explanation.lower()
    assert report.proposed_alternative is not None
    # Still has research/summary component, so partial execution is feasible
    assert report.can_partially_execute is True


def test_unsupported_financial_trading_capability_detected():
    goal = "Execute a buy order for 1.5 BTC on Binance immediately."
    report = CapabilityGapEngine.analyze_goal(goal)
    assert report.has_gap is True
    assert "finance.trading" in report.missing_capabilities
    assert report.can_partially_execute is False
    assert "strictly forbids" in report.proposed_alternative.lower()


def test_unsupported_system_shell_capability_detected():
    goal = "Run a bash script with sudo reboot on my Linux server."
    report = CapabilityGapEngine.analyze_goal(goal)
    assert report.has_gap is True
    assert "system.host_execution" in report.missing_capabilities
    assert report.can_partially_execute is False


def test_unsupported_third_party_email_detected():
    goal = "Send the fraud report to advisor via Outlook email."
    report = CapabilityGapEngine.analyze_goal(goal)
    assert report.has_gap is True
    assert "email.third_party" in report.missing_capabilities
    assert report.can_partially_execute is True
