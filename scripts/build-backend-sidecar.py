from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend-python"
VENV_DIR = BACKEND_DIR / ".venv-build"
DIST_DIR = BACKEND_DIR / "dist"
BUILD_DIR = BACKEND_DIR / "build"
SPEC_FILE = BACKEND_DIR / "kefer-backend.spec"
TAURI_BINARIES_DIR = REPO_ROOT / "src-tauri" / "binaries"


def is_windows() -> bool:
    return os.name == "nt"


def venv_python() -> Path:
    return VENV_DIR / ("Scripts/python.exe" if is_windows() else "bin/python")


def venv_pyinstaller() -> Path:
    return VENV_DIR / ("Scripts/pyinstaller.exe" if is_windows() else "bin/pyinstaller")


def sidecar_name() -> str:
    return "kefer-backend.exe" if is_windows() else "kefer-backend"


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print("+", " ".join(str(part) for part in cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def main() -> int:
    TAURI_BINARIES_DIR.mkdir(parents=True, exist_ok=True)

    run([sys.executable, "-m", "venv", str(VENV_DIR)])
    run([str(venv_python()), "-m", "pip", "install", "--upgrade", "pip"])
    run([str(venv_python()), "-m", "pip", "install", '-e', '.[api]', "pyinstaller"], cwd=BACKEND_DIR)

    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    if SPEC_FILE.exists():
        SPEC_FILE.unlink()

    run(
        [
            str(venv_pyinstaller()),
            "--noconfirm",
            "--clean",
            "--name",
            "kefer-backend",
            "--onefile",
            "--collect-all",
            "kerykeion",
            "--hidden-import",
            "module.api.app",
            "--hidden-import",
            "module.api.schemas",
            "-m",
            "module.api",
        ],
        cwd=BACKEND_DIR,
    )

    built_binary = DIST_DIR / sidecar_name()
    if not built_binary.exists():
        raise FileNotFoundError(f"Expected built backend sidecar at {built_binary}")

    destination = TAURI_BINARIES_DIR / sidecar_name()
    shutil.copy2(built_binary, destination)
    if not is_windows():
        destination.chmod(0o755)

    print(f"Staged backend sidecar -> {destination}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
