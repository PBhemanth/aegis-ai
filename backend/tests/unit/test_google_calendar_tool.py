"""
Unit Tests: Google Calendar v3 Tooling
Tests availability checking, event scheduling, and external attendee approval gates.
"""
from unittest.mock import MagicMock, patch
import pytest
from backend.app.tools.base import AuthenticationRequiredError, ExecutionContext, ToolExecutionError
from backend.app.tools.google_calendar import (
    GoogleCalendarCheckSlotsTool, CalendarCheckSlotsInput,
    GoogleCalendarCreateEventTool, CalendarCreateEventInput,
)


@pytest.mark.asyncio
async def test_calendar_tools_require_authentication():
    context_unauth = ExecutionContext(credentials=None)

    with pytest.raises(AuthenticationRequiredError):
        await GoogleCalendarCheckSlotsTool().execute(
            CalendarCheckSlotsInput(time_min="2026-10-09T09:00:00Z", time_max="2026-10-09T17:00:00Z"),
            context_unauth
        )

    with pytest.raises(AuthenticationRequiredError):
        await GoogleCalendarCreateEventTool().execute(
            CalendarCreateEventInput(title="Meeting", start_time="2026-10-09T10:00:00Z", end_time="2026-10-09T10:30:00Z"),
            context_unauth
        )


@pytest.mark.asyncio
async def test_calendar_check_slots_with_mock_service():
    mock_service = MagicMock()
    mock_service.freebusy().query().execute.return_value = {
        "calendars": {
            "primary": {
                "busy": [
                    {"start": "2026-10-09T10:00:00Z", "end": "2026-10-09T11:00:00Z"}
                ]
            }
        }
    }

    context = ExecutionContext(credentials=MagicMock())
    with patch("backend.app.tools.google_calendar.build", return_value=mock_service):
        tool = GoogleCalendarCheckSlotsTool()
        result = await tool.execute(
            CalendarCheckSlotsInput(time_min="2026-10-09T09:00:00Z", time_max="2026-10-09T17:00:00Z"),
            context
        )

        assert len(result.busy_slots) == 1
        assert result.busy_slots[0].start == "2026-10-09T10:00:00Z"
        assert result.is_available is False


@pytest.mark.asyncio
async def test_calendar_create_event_internal_without_attendees():
    mock_service = MagicMock()
    mock_service.events().insert().execute.return_value = {
        "id": "event_789",
        "summary": "Review Report",
        "start": {"dateTime": "2026-10-09T14:00:00Z"},
        "end": {"dateTime": "2026-10-09T14:30:00Z"},
        "htmlLink": "https://calendar.google.com/event?eid=789",
        "status": "confirmed"
    }

    context = ExecutionContext(credentials=MagicMock())
    with patch("backend.app.tools.google_calendar.build", return_value=mock_service):
        tool = GoogleCalendarCreateEventTool()
        result = await tool.execute(
            CalendarCreateEventInput(
                title="Review Report",
                start_time="2026-10-09T14:00:00Z",
                end_time="2026-10-09T14:30:00Z"
            ),
            context
        )

        assert result.event_id == "event_789"
        assert result.summary == "Review Report"
        assert result.status == "confirmed"


@pytest.mark.asyncio
async def test_calendar_external_attendees_requires_approval():
    context_no_approval = ExecutionContext(credentials=MagicMock(), approval_granted=False)
    tool = GoogleCalendarCreateEventTool()

    params = CalendarCreateEventInput(
        title="External Meeting",
        start_time="2026-10-09T15:00:00Z",
        end_time="2026-10-09T15:30:00Z",
        attendees=["colleague@external.org"]
    )

    with pytest.raises(ToolExecutionError) as exc:
        await tool.execute(params, context_no_approval)
    assert "requires user approval" in str(exc.value)


@pytest.mark.asyncio
async def test_calendar_external_attendees_succeeds_with_approval():
    mock_service = MagicMock()
    mock_service.events().insert().execute.return_value = {
        "id": "event_ext_999",
        "summary": "External Meeting",
        "start": {"dateTime": "2026-10-09T15:00:00Z"},
        "end": {"dateTime": "2026-10-09T15:30:00Z"},
        "htmlLink": "https://calendar.google.com/event?eid=999",
        "status": "confirmed"
    }

    context_approved = ExecutionContext(credentials=MagicMock(), approval_granted=True)
    with patch("backend.app.tools.google_calendar.build", return_value=mock_service):
        tool = GoogleCalendarCreateEventTool()
        result = await tool.execute(
            CalendarCreateEventInput(
                title="External Meeting",
                start_time="2026-10-09T15:00:00Z",
                end_time="2026-10-09T15:30:00Z",
                attendees=["colleague@external.org"]
            ),
            context_approved
        )

        assert result.event_id == "event_ext_999"
        assert result.attendee_count == 1
