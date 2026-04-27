import argparse
import os
import subprocess
import sys


def run_module(module_path, args):
    cmd = [sys.executable, module_path] + args
    return subprocess.call(cmd)


def main():
    parser = argparse.ArgumentParser(description="Orquestador Auto-Tune profesional")
    parser.add_argument(
        "command",
        choices=["offline", "realtime", "devices"],
        help="Comando a ejecutar",
    )
    parser.add_argument("extra", nargs=argparse.REMAINDER, help="Argumentos del subcomando")
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    offline_module = os.path.join(base_dir, "offline.py")
    realtime_module = os.path.join(base_dir, "realtime.py")

    if args.command == "offline":
        raise SystemExit(run_module(offline_module, args.extra))

    if args.command == "realtime":
        raise SystemExit(run_module(realtime_module, args.extra))

    if args.command == "devices":
        raise SystemExit(run_module(realtime_module, ["--list-devices"]))


if __name__ == "__main__":
    main()
