"""
Real Google Calendar v3 Tooling
Inspects availability via FreeBusy queries and creates review events/meetings.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from googleapiclient.discovery import build
from backend.app.schemas.common import RiskTier
from backend.app.tools.base import AuthenticationRequiredError, BaseTool, ExecutionContext, ToolExecutionError


CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"


# --- Schemas ---

class CalendarCheckSlotsInput(BaseModel):
    time_min: str = Field(description="Start of query window (ISO 8601, e.g. 2026-10-09T09:00:00Z)")
    time_max: str = Field(description="End of query window (ISO 8601, e.g. 2026-10-09T17:00:00Z)")
    calendar_id: str = Field(default="primary", description="Calendar identifier")


class BusySlot(BaseModel):
    start: str
    end: str


class CalendarCheckSlotsResult(BaseModel):
    calendar_id: str
    time_min: str
    time_max: str
    busy_slots: List[BusySlot]
    is_available: bool


class CalendarCreateEventInput(BaseModel):
    title: str = Field(min_length=1, description="Event title / summary")
    start_time: str = Field(description="Start time (ISO 8601)")
    end_time: str = Field(description="End time (ISO 8601)")
    description: Optional[str] = Field(default=None, description="Event notes or agenda")
    attendees: Optional[List[str]] = Field(default=None, description="Email addresses of attendees")
    location: Optional[str] = Field(default=None, description="Physical location or meeting URL")


class CalendarCreateEventResult(BaseModel):
    event_id: str
    summary: str
    start_time: str
    end_time: str
    html_link: str
    status: str
    attendee_count: int


# --- Helper ---

def _get_calendar_service(context: ExecutionContext, tool_name: str):
    """Builds authorized Google Calendar v3 resource."""
    if not context.credentials:
        raise AuthenticationRequiredError(tool_name=tool_name, required_scopes=[CALENDAR_SCOPE])
    return build("calendar", "v3", credentials=context.credentials, cache_discovery=False)


# --- Tools ---

class GoogleCalendarCheckSlotsTool(BaseTool):
    name = "google_calendar_check_slots"
    description = "Queries user availability and detects scheduling conflicts on Google Calendar."
    category = "calendar"
    base_risk_tier = RiskTier.TIER_0_READ
    required_scopes = [CALENDAR_SCOPE]
    requires_approval = False
    input_schema = CalendarCheckSlotsInput
    output_schema = CalendarCheckSlotsResult
    verification_contract = {
        "verifier": "GoogleCalendarFreeBusyVerifier",
        "assertions": ["freebusy_query_succeeded", "valid_time_window"]
    }

    async def execute(self, params: CalendarCheckSlotsInput, context: ExecutionContext) -> CalendarCheckSlotsResult:
        service = _get_calendar_service(context, self.name)

        body = {
            "timeMin": params.time_min,
            "timeMax": params.time_max,
            "items": [{"id": params.calendar_id}]
        }

        response = service.freebusy().query(body=body).execute()
        cal_data = response.get("calendars", {}).get(params.calendar_id, {})
        raw_busy = cal_data.get("busy", [])

        busy_slots = [BusySlot(start=b["start"], end=b["end"]) for b in raw_busy]
        is_available = len(busy_slots) == 0

        return CalendarCheckSlotsResult(
            calendar_id=params.calendar_id,
            time_min=params.time_min,
            time_max=params.time_max,
            busy_slots=busy_slots,
            is_available=is_available
        )


class GoogleCalendarCreateEventTool(BaseTool):
    name = "google_calendar_create_event"
    description = "Schedules confirmed review events and meetings on Google Calendar."
    category = "calendar"
    base_risk_tier = RiskTier.TIER_2_MUTATING
    required_scopes = [CALENDAR_SCOPE]
    requires_approval = False  # Evaluated dynamically by RiskEngine based on attendees
    input_schema = CalendarCreateEventInput
    output_schema = CalendarCreateEventResult
    verification_contract = {
        "verifier": "GoogleCalendarEventVerifier",
        "assertions": ["event_exists", "status_confirmed", "time_window_matches", "attendees_match"]
    }

    async def execute(self, params: CalendarCreateEventInput, context: ExecutionContext) -> CalendarCreateEventResult:
        # If external attendees are included, check that approval was granted if required
        has_external_attendees = bool(params.attendees and len(params.attendees) > 0)
        if has_external_attendees and not context.approval_granted:
            raise ToolExecutionError(
                "Execution halted: Dispatching calendar invites to external attendees requires user approval.",
                tool_name=self.name
            )

        service = _get_calendar_service(context, self.name)

        body: Dict[str, Any] = {
            "summary": params.title,
            "description": params.description or "Scheduled by Aegis Autonomous AI Agent",
            "start": {"dateTime": params.start_time},
            "end": {"dateTime": params.end_time},
        }

        if params.location:
            body["location"] = params.location

        if params.attendees:
            body["attendees"] = [{"email": email.strip()} for email in params.attendees]

        event = service.events().insert(
            calendarId="primary",
            body=body,
            sendUpdates="all" if params.attendees else "none"
        ).execute()

        return CalendarCreateEventResult(
            event_id=event["id"],
            summary=event.get("summary", params.title),
            start_time=event.get("start", {}).get("dateTime", params.start_time),
            end_time=event.get("end", {}).get("dateTime", params.end_time),
            html_link=event.get("htmlLink", ""),
            status=event.get("status", "confirmed"),
            attendee_count=len(params.attendees) if params.attendees else 0
        )


calendar_check_slots_tool = GoogleCalendarCheckSlotsTool()
calendar_create_event_tool = GoogleCalendarCreateEventTool()
