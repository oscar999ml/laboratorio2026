import argparse
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import numpy as np


_STATE_LINE_RE = re.compile(
    r"State: (?P<state>[^|]+) \| "
    r"EAR: (?P<ear>-?\d+(?:\.\d+)?) \| "
    r"MAR: (?P<mar>-?\d+(?:\.\d+)?) \| "
    r"Pitch: (?P<pitch>-?\d+(?:\.\d+)?) \| "
    r"Yaw: (?P<yaw>-?\d+(?:\.\d+)?) \| "
    r"Roll: (?P<roll>-?\d+(?:\.\d+)?)"
)


def _norm180(angle_deg: np.ndarray) -> np.ndarray:
    return ((angle_deg + 180.0) % 360.0) - 180.0


def _squash90(angle_deg: np.ndarray) -> np.ndarray:
    a = _norm180(angle_deg)
    a = np.where(a > 90.0, a - 180.0, a)
    a = np.where(a < -90.0, a + 180.0, a)
    return a


def _read_log_values(log_path: Path) -> dict:
    ears = []
    mars = []
    pitch = []
    yaw = []
    roll = []

    text = log_path.read_text(encoding="utf-8", errors="ignore")
    for line in text.splitlines():
        m = _STATE_LINE_RE.search(line)
        if not m:
            continue
        ears.append(float(m.group("ear")))
        mars.append(float(m.group("mar")))
        pitch.append(float(m.group("pitch")))
        yaw.append(float(m.group("yaw")))
        roll.append(float(m.group("roll")))

    return {
        "ear": np.asarray(ears, dtype=float),
        "mar": np.asarray(mars, dtype=float),
        "pitch": np.asarray(pitch, dtype=float),
        "yaw": np.asarray(yaw, dtype=float),
        "roll": np.asarray(roll, dtype=float),
    }


@dataclass
class Profile:
    ear_threshold: float
    mar_threshold: float
    head_pitch_threshold: float
    head_yaw_threshold: float
    head_roll_threshold: float
    head_tilt_min_duration_s: float
    perclos_threshold: float
    alert_window_s: float
    high_risk_score_threshold: int


def _pick_ear_threshold_from_baseline(ear_baseline: np.ndarray, target_fp: float = 0.002) -> float:
    # Choose threshold so that only ~target_fp of baseline samples fall below it.
    if ear_baseline.size == 0:
        return 0.25
    q = max(0.0001, min(0.2, float(target_fp)))
    thr = float(np.quantile(ear_baseline, q))
    # Safety: avoid being too close to absolute min (tracking glitches)
    thr = max(thr, float(np.quantile(ear_baseline, 0.001)))
    return thr


def _pick_mar_threshold(baseline: np.ndarray, yawn: np.ndarray | None) -> float:
    if baseline.size == 0:
        return 0.6

    # Candidate thresholds from combined distribution.
    pool = baseline if yawn is None or yawn.size == 0 else np.concatenate([baseline, yawn])
    qs = [50, 60, 70, 80, 85, 90, 92, 94, 95, 96, 97, 98, 99]
    cands = sorted({float(np.percentile(pool, q)) for q in qs})
    # Add a few stable defaults too.
    cands = sorted(set(cands + [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]))

    best = None
    for t in cands:
        baseline_fp = float((baseline > t).mean())
        yawn_tp = float((yawn > t).mean()) if yawn is not None and yawn.size else 0.0

        # Hard constraint: keep baseline FP low.
        if baseline_fp > 0.01:
            continue

        # Score: prioritize catching yawns while keeping FP low.
        score = yawn_tp - 3.0 * baseline_fp
        if best is None or score > best[0]:
            best = (score, t)

    if best is not None:
        return float(best[1])

    # Fallback: baseline-focused.
    return float(np.percentile(baseline, 99))


def _pick_head_threshold(abs_angles_baseline: np.ndarray, min_thr: float, margin_deg: float = 5.0) -> float:
    if abs_angles_baseline.size == 0:
        return min_thr
    p995 = float(np.percentile(abs_angles_baseline, 99.5))
    return max(min_thr, p995 + margin_deg)


def calibrate_driver(driver: str, calibration_root: Path) -> tuple[Profile, dict]:
    driver_root = calibration_root / driver
    if not driver_root.exists():
        raise FileNotFoundError(f"No existe carpeta de calibracion: {driver_root}")

    by_tag: dict[str, list[Path]] = defaultdict(list)
    for log in driver_root.rglob("*.log"):
        by_tag[log.parent.name].append(log)

    if "bueno" not in by_tag:
        raise FileNotFoundError(f"No se encontro tag 'bueno' en {driver_root}")

    # Use the newest file per tag.
    def newest(paths: list[Path]) -> Path:
        return sorted(paths, key=lambda p: p.stat().st_mtime, reverse=True)[0]

    baseline_log = newest(by_tag["bueno"])
    baseline = _read_log_values(baseline_log)

    yawn = None
    if "bostezo" in by_tag:
        yawn = _read_log_values(newest(by_tag["bostezo"]))

    ear_thr = _pick_ear_threshold_from_baseline(baseline["ear"], target_fp=0.002)
    mar_thr = _pick_mar_threshold(baseline["mar"], None if yawn is None else yawn["mar"])

    pitch_abs = np.abs(_squash90(baseline["pitch"]))
    yaw_abs = np.abs(_squash90(baseline["yaw"]))
    roll_abs = np.abs(_squash90(baseline["roll"]))

    head_pitch_thr = _pick_head_threshold(pitch_abs, min_thr=20.0)
    head_yaw_thr = _pick_head_threshold(yaw_abs, min_thr=20.0)
    head_roll_thr = _pick_head_threshold(roll_abs, min_thr=20.0)

    profile = Profile(
        ear_threshold=round(ear_thr, 3),
        mar_threshold=round(mar_thr, 3),
        head_pitch_threshold=round(head_pitch_thr, 1),
        head_yaw_threshold=round(head_yaw_thr, 1),
        head_roll_threshold=round(head_roll_thr, 1),
        head_tilt_min_duration_s=0.8,
        perclos_threshold=0.4,
        alert_window_s=60.0,
        high_risk_score_threshold=6,
    )

    debug = {
        "baseline_log": str(baseline_log),
        "counts": {
            "baseline_samples": int(baseline["ear"].size),
            "yawn_samples": int(0 if yawn is None else yawn["ear"].size),
        },
        "baseline_percentiles": {
            "ear_p0_5": float(np.percentile(baseline["ear"], 0.5)) if baseline["ear"].size else None,
            "ear_p1": float(np.percentile(baseline["ear"], 1)) if baseline["ear"].size else None,
            "ear_p5": float(np.percentile(baseline["ear"], 5)) if baseline["ear"].size else None,
            "mar_p95": float(np.percentile(baseline["mar"], 95)) if baseline["mar"].size else None,
            "mar_p99": float(np.percentile(baseline["mar"], 99)) if baseline["mar"].size else None,
        },
    }

    return profile, debug


def main() -> None:
    parser = argparse.ArgumentParser(description="Calibrar umbrales por conductor usando logs")
    parser.add_argument("--driver", required=True, help="Nombre/ID del conductor (carpeta en data/logs/calibration)")
    parser.add_argument(
        "--calibration-root",
        default="data/logs/calibration",
        help="Ruta raiz de logs de calibracion (default: data/logs/calibration)",
    )
    parser.add_argument(
        "--out",
        default=None,
        help="Ruta de salida JSON del perfil (default: data/profiles/<driver>.json)",
    )
    args = parser.parse_args()

    calibration_root = Path(args.calibration_root)
    profile, debug = calibrate_driver(args.driver, calibration_root)

    out_path = Path(args.out) if args.out else Path("data/profiles") / f"{args.driver}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "driver": args.driver,
        "profile": {
            "ear_threshold": profile.ear_threshold,
            "mar_threshold": profile.mar_threshold,
            "head_pitch_threshold": profile.head_pitch_threshold,
            "head_yaw_threshold": profile.head_yaw_threshold,
            "head_roll_threshold": profile.head_roll_threshold,
            "head_tilt_min_duration_s": profile.head_tilt_min_duration_s,
            "perclos_threshold": profile.perclos_threshold,
            "alert_window_s": profile.alert_window_s,
            "high_risk_score_threshold": profile.high_risk_score_threshold,
        },
        "debug": debug,
    }

    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    print("Perfil generado:", out_path)
    print("Recomendado ejecutar asi:")
    print(f"  python -m src.main --camera 2 --hands --pose --profile {out_path.as_posix()}")


if __name__ == "__main__":
    main()
