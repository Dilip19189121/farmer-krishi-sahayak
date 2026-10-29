# presence.py — laptop-webcam presence detection for the speech test flow.
#
# Standalone Stage (speech-to-speech test, NOT wired into the FastAPI app:
# /chat and /chat/voice are unaffected). Captures frames from the built-in
# webcam and detects whether a human face is present, fully locally:
#   - OpenCV 5.0's FaceDetectorYN (YuNet ONNX, ~230KB model in backend/models/)
#     because 5.0 removed the classic Haar CascadeClassifier.
#   - No API calls, no cloud — everything runs on-device.
#
# Edge-triggering: a repeating face is not a new trigger. A trigger fires only
# on the absence -> presence transition that lasts for MIN_STABILITY_FRAMES
# consecutive frames, so walk-bys and detection flicker don't re-trigger while
# the same person stands there. CooldownSeconds gates re-triggers after the
# person leaves again.

import time
import threading
from pathlib import Path
from typing import Callable, Optional

import cv2
import numpy as np

# presence.py -> app/services/ -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = BACKEND_DIR / "models" / "face_detection_yunet_2023mar.onnx"

# Turns a soft "probably saw a face" into a confirmed presence event only
# after this many consecutive detected frames. At ~10 fps polling this is
# ~0.5s of sustained presence.
MIN_STABILITY_FRAMES = 5
# One confirmed leaver event should not immediately re-trigger (person
# standing still for a while can flicker in/out of the detector).
COOLDOWN_SECONDS = 8.0
DETECT_CONFIDENCE = 0.6
POLL_SECONDS = 0.1  # ~10 fps eye


class PresenceWatcher:
    """Watches the webcam and calls the callback once per NEW person arrival.

    Usage:
        w = PresenceWatcher(on_person = lambda: print("person detected"))
        w.run(seconds=60)            # blocking watch
    or drive it manually:
        w.start(); state = w.poll(); w.stop()
    """

    def __init__(
        self,
        camera_index: int = 0,
        on_person: Optional[Callable[[], None]] = None,
        min_stability_frames: int = MIN_STABILITY_FRAMES,
        cooldown_seconds: float = COOLDOWN_SECONDS,
        model_path: Path = MODEL_PATH,
    ):
        if not Path(model_path).is_file():
            raise FileNotFoundError(
                f"YuNet model not found: {model_path}. Download "
                "face_detection_yunet_2023mar.onnx from the OpenCV Zoo "
                "into backend/models/."
            )
        self.camera_index = camera_index
        self.on_person = on_person
        self.min_stability = min_stability_frames
        self.cooldown = cooldown_seconds

        self._detector = cv2.FaceDetectorYN.create(
            str(model_path), "", (0, 0), score_threshold=DETECT_CONFIDENCE
        )
        self._cap: Optional[cv2.VideoCapture] = None

        # Loop stop signal, owned by the watcher instance from birth (routes
        # and stop_presence() both set it; it used to be injected externally
        # and simply did not exist on a bare-constructed watcher).
        self._stop_event = threading.Event()

        # Edge-trigger state machine (reset on start()).
        # Camera is optional here: on headless machines (no webcam) where
        # the user only wants the status/POLL endpoints, the watcher must
        # still start and return valid state instead of raising.
        self._streak = 0
        self._face_present = False          # last confirmed state
        self._last_trigger_t = 0.0
        # Telemetry for tests/ops, updated by poll().
        self.frames_seen = 0
        self.faces_seen_total = 0
        self.triggers_fired = 0

    # -- camera lifecycle ---------------------------------------------------

    def start(self) -> None:
        """Open the webcam (CAP_DSHOW: fast open on Windows)."""
        global _active_watcher
        self._stop_event.clear()
        self._streak = 0
        self._face_present = False
        self._last_trigger_t = 0.0
        self.frames_seen = 0
        self.faces_seen_total = 0
        self.triggers_fired = 0
        self._cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
        if not self._cap.isOpened():
            self._cap.release()
            self._cap = None
            # Camera is optional. On headless boxes this is not an error:
            # poll() will just report 0 faces, and the frontend can still
            # call /presence/status and /presence/stop without the app 500ing.
        self._detector.setInputSize((640, 480))
        # Registered so stop_presence() can kill this watcher on backend
        # shutdown even when no route holds a reference to it.
        _active_watcher = self

    def stop(self) -> None:
        # Signals any watch loop polling this watcher to exit (checked every
        # iteration) AND releases the camera.
        self._stop_event.set()
        global _active_watcher
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        if _active_watcher is self:
            _active_watcher = None


# -- detection ----------------------------------------------------------

    def _faces_now(self) -> int:
        """Grab one frame, run YuNet, return the number of confident faces."""
        if self._cap is None:
            return 0
        ok, frame = self._cap.read()
        if not ok or frame is None:
            return 0
        self.frames_seen += 1
        height, width = frame.shape[:2]
        self._detector.setInputSize((width, height))
        try:
            _, faces = self._detector.detect(frame)
        except cv2.error:
            # The YuNet detector raised (e.g. input-size/ratio mismatch on
            # the captured frame). Make it a clean 0 rather than letting
            # /presence/start and /presence/status 500 the whole app.
            return 0
        return 0 if faces is None else len(faces)

    def poll(self, face_count: Optional[int] = None) -> dict:
        """Process exactly one frame; fire the callback on a NEW arrival.

        face_count may be injected (tests) — otherwise it is read from the
        camera. Returns a small state dict for logging/asserting.
        """
        if face_count is None:
            face_count = self._faces_now()
        else:
            self.frames_seen += 1
        now = time.monotonic()

        if face_count > 0:
            self.faces_seen_total += face_count
            self._streak += 1
        else:
            self._streak = 0

        fired = False
        reasons: list[str] = []
        if (
            face_count > 0
            and self._streak >= self.min_stability
            and not self._face_present
            and (now - self._last_trigger_t) >= self.cooldown
        ):
            self._face_present = True
            self._last_trigger_t = now
            fired = True
            self.triggers_fired += 1
            reasons.append(f"{face_count} face(s) stable for {self._streak} frames")
            if self.on_person is not None:
                try:
                    self.on_person()
                except Exception as exc:  # user callback must not kill the loop
                    reasons.append(f"on_person callback error: {exc}")
        elif face_count == 0 and self._face_present:
            self._face_present = False
            reasons.append("person left (streak/lock cleared)")
            self._streak = 0

        return {
            "faces": face_count,
            "streak": self._streak,
            "present": self._face_present,
            "fired": fired,
            "reasons": reasons,
            "cooldown_left": max(0.0, self.cooldown - (now - self._last_trigger_t))
            if self._last_trigger_t
            else 0.0,
        }

    def run(self, seconds: float, poll_seconds: float = POLL_SECONDS) -> Optional[dict]:
        """Blocking watch: poll until someone arrives or `seconds` elapse.

        Returns the poll_state of the trigger frame ("fired": True), or None
        on timeout — the caller decides what arrival means next.
        """
        self.start()
        try:
            deadline = time.monotonic() + seconds
            while time.monotonic() < deadline:
                state = self.poll()
                if state["fired"]:
                    return state
                time.sleep(poll_seconds)
            return None
        finally:
            self.stop()


# ---------------------------------------------------------------------------
# Stop support for FastAPI shutdown (main.py).
# ---------------------------------------------------------------------------

# Module-level stop flag: the background watcher thread checks this on every
# iteration so it stops actively on shutdown (not just via daemon=True).
_presence_stop_flag = threading.Event()

# The watcher most recently started (registered by PresenceWatcher.start(),
# cleared by stop()). Lets stop_presence() kill the camera thread on backend
# shutdown even if the route-level reference is already gone.
_active_watcher: Optional["PresenceWatcher"] = None


def stop_presence() -> None:
    """Set the stop flag, signal the active watcher and release the camera.

    The routes/presence.py watch loop checks both _presence_stop_flag and the
    watcher's own _stop_event every iteration; stopping the watcher here too
    guarantees _stop_event is set and the camera is released on backend
    shutdown, whatever route state looks like.
    """
    _presence_stop_flag.set()
    watcher = _active_watcher
    if watcher is not None:
        watcher.stop()  # sets _stop_event and releases the camera


# ---------------------------------------------------------------------------
# Local-only smoke: `python -m app.services.presence`
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    w = PresenceWatcher(on_person=lambda: print("person detected"))
    print("Watching the webcam for ~15s — show a face to the camera...")
    result = w.run(seconds=15)
    if result:
        print("TRIGGERED:", {k: v for k, v in result.items() if k != "reasons"})
        print("reasons:", result["reasons"])
    else:
        print(
            "timeout: no stable face seen in 15s "
            f"(frames={w.frames_seen}, faces={w.faces_seen_total})"
        )
