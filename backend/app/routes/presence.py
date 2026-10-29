# presence.py — optional background endpoints for the camera presence watchdog.
#
# Adds three routes to the FastAPI app:
#   POST /presence/start  — start the webcam presence watcher (blocking-free)
#   POST /presence/stop   — stop it cleanly
#   GET  /presence/status — current watcher state (faces, streak, fired)
#
# Kept fully separate from /chat and /chat/voice so those endpoints are
# untouched. The watcher runs as a background thread seeded by /presence/start
# and stopped by /presence/stop; a second start while already running is a
# no-op (idempotent), and /presence/stop on a stopped watcher is a no-op too.
#
# This is the real "auto-trigger the voice turn when someone is visible"
# hook the separate speech test script (run_speech_test.py) used to call
# presence.py directly.

import threading
import time

from fastapi import APIRouter

from app.services import presence

router = APIRouter(prefix="/presence", tags=["presence"])

# The live watcher, if any (module-level so the endpoints can reach it).
_watcher: "presence.PresenceWatcher | None" = None


@router.post("/start")
def presence_start(camera_index: int = 0):
    """Start the webcam presence watcher as a background thread.

    Seeds the edge-triggered state machine and returns immediately. If a watcher
    is already running (from a previous /presence/start) this is a no-op and
    returns its current status, so the call is safe to repeat at any time.
    """
    global _watcher
    if _watcher is not None:
        return {
            "status": "already_running",
            **_watcher.poll(),
            "camera_index": _watcher.camera_index,
        }

    watcher = presence.PresenceWatcher(
        camera_index=camera_index,
        on_person=lambda: None,
    )
    try:
        watcher.start()
    except RuntimeError as exc:
        # Camera is busy (Teams/Zoom/OBS hold the device) — surface it, don't
        # leave the app half-initialized. /chat and /chat/voice are still up.
        return {"status": "camera_busy", "error": str(exc)}

    # Run the watch loop in a background thread. It polls forever but
    # checks the watcher's own _stop_event AND the module-level shutdown flag
    # at the top of every iteration and exits (releasing the camera) when
    # either is set — on /presence/stop OR on FastAPI shutdown
    # (services/presence.stop_presence() sets both). daemon=True so the
    # thread can never wedge interpreter exit on shutdown.
    def _watch_loop() -> None:
        nonlocal watcher
        try:
            while not (
                watcher._stop_event.is_set()
                or presence._presence_stop_flag.is_set()
            ):
                state = watcher.poll()
                if state["fired"]:
                    # Signal the caller the person arrived. A real "ask the
                    # question" handler would call an injectable lambda here;
                    # for now we just log the trigger.
                    print(
                        f"[presence] background trigger: "
                        f"{state['faces']} face(s) stable for {state['streak']} frames"
                    )
                time.sleep(presence.POLL_SECONDS)
        finally:
            watcher.stop()

    thread = threading.Thread(target=_watch_loop, daemon=True)
    thread.start()
    _watcher = watcher
    return {
        "status": "running",
        "camera_index": camera_index,
        "thread": thread.ident,
        "initial": watcher.poll(),
    }


@router.post("/stop")
def presence_stop():
    """Stop the presence watcher cleanly.

    Stops the background thread by releasing the camera and clearing the
    module-level reference. Idempotent: calling it when nothing is running is a
    no-op. Returns the last observed poll state.
    """
    global _watcher
    if _watcher is None:
        return {"status": "already_stopped", "message": "no watcher running"}
    state = _watcher.poll()
    _watcher._stop_event.set()
    _watcher.stop()
    _watcher = None
    return {"status": "stopped", "last": state}


@router.get("/status")
def presence_status():
    """Current state of the presence watchdog, or stopped."""
    global _watcher
    if _watcher is None:
        return {
            "status": "stopped",
            "message": "no watcher running; POST /presence/start first",
        }
    return {
        "status": "running",
        **_watcher.poll(),
        "camera_index": _watcher.camera_index,
    }
