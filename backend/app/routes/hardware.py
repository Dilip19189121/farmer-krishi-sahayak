# hardware.py — manual-entry endpoints for the kiosk state machine.
#
#   POST /hardware/trigger — arm the trigger that IDLE waits for, exactly like
#                            the (optional) ultrasonic sensor would.
#   GET  /hardware/status  — the machine's live state for dashboards/tests.
#
# Hardware is OPTIONAL: on a laptop with no RPi.GPIO these endpoints are the
# way to drive the whole loop. `force=true` skips the CHECKING human
# confirmation (useful when testing on a machine where nobody is in frame);
# the default is the sensor-identical path: trigger → CHECKING → presence
# confirmed within 5 frames → GREETING, else camera off → IDLE.
#
# The machine's conversation loop only ever talks to the EXISTING
# /presence/* and /chat/voice endpoints — /chat, /chat/voice, /presence and
# every other route are untouched.

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.services.hardware import state_machine
from app.services.hardware.state_machine import COOLDOWN_SECONDS, get_machine, frontend_chat_log

router = APIRouter(prefix="/hardware", tags=["hardware"])


@router.post("/trigger")
async def hardware_trigger(force: bool = False):
    """Arm the kiosk trigger (the manual stand-in for the ultrasonic sensor).

    Wakes the IDLE state machine. Fires the normal flow: CHECKING (presence
    confirmed for 5 frames) unless `force=true`, then GREETING → LISTENING →
    RESPONDING loop → END (3 no-response timeouts or presence lost) → IDLE,
    with a 10s cooldown before the next trigger is honored.

    Repeated calls while a session runs are safe and report the live state
    instead of re-triggering.
    """
    machine = get_machine()
    if not machine.start():
        return {
            "status": "error",
            "detail": "no running event loop; start the FastAPI app first",
        }

    # Laptop demo mode: without RPi.GPIO there is no ultrasonic sensor to
    # confirm the approach, so every trigger is treated as forced (the
    # frontend page-load call additionally passes ?force=true).
    if not state_machine.GPIO_AVAILABLE:
        force = True

    state = machine.status()
    if state["state"] not in ("IDLE",) and not force:
        return {"status": "busy", **state}
    result = machine.request_trigger(force=force)
    return {
        "status": "armed" if result.pop("armed", True) else "noop",
        "cooldown_seconds": COOLDOWN_SECONDS,
        "force": force,
        **result,
    }


@router.get("/status")
async def hardware_status():
    """Live state of the kiosk machine (or an idle one that never started)."""
    machine = get_machine()
    return {"status": "ok", **machine.status()}


@router.get("/chat-log")
async def hardware_chat_log():
    """Return the kiosk's full Q&A log and clear it.

    Shape: {"status": "ok", "log": [{role, text}, ...]}.
    """
    import app.services.hardware.state_machine as _sm
    log = list(_sm.frontend_chat_log)
    _sm.frontend_chat_log.clear()
    return JSONResponse(content={"status": "ok", "log": log})
