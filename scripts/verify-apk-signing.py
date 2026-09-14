"""Verify the built APK is signed by the configured debug key before upload."""

import os
from pathlib import Path
import re
import shutil
import subprocess
import sys


def require_matching_certificate(key_report: str, apk_report: str) -> str:
    expected = re.findall(r"^\s*SHA1:\s*((?:[0-9a-f]{2}:){19}[0-9a-f]{2})\s*$", key_report, re.I | re.M)
    if len(expected) != 1:
        raise ValueError("The configured keystore report must contain exactly one SHA-1 fingerprint.")
    actual = re.findall(r"^Signer #\d+ certificate SHA-1 digest:\s*([0-9a-f]{40})\s*$", apk_report, re.I | re.M)
    wanted = expected[0].replace(":", "").lower()
    if [value.lower() for value in actual] != [wanted]:
        got = ", ".join(actual) or "no signing certificate"
        raise ValueError(f"APK signing SHA-1 mismatch: expected {expected[0]}, got {got}.")
    return expected[0].upper()


def find_apksigner() -> str:
    executable = shutil.which("apksigner")
    if executable:
        return executable
    sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if sdk:
        candidates = list(Path(sdk).glob("build-tools/*/apksigner"))
        candidates.sort(key=lambda path: tuple(map(int, re.findall(r"\d+", path.parent.name))))
        if candidates:
            return str(candidates[-1])
    raise ValueError("Android SDK Build Tools must provide apksigner to verify the finished APK.")


def main() -> None:
    if len(sys.argv) != 3:
        raise ValueError("Usage: verify-apk-signing.py APK_PATH KEYSTORE_CERTIFICATE_REPORT")
    apk, report_path = map(Path, sys.argv[1:])
    key_report = report_path.read_text()
    result = subprocess.run(
        [find_apksigner(), "verify", "--verbose", "--print-certs", str(apk)],
        capture_output=True, text=True, check=False,
    )
    with report_path.open("a") as report:
        report.write("\nBuilt APK signing certificate (apksigner):\n" + result.stdout + result.stderr)
    if result.returncode != 0:
        raise ValueError("APK signature verification failed. " + result.stderr.strip())
    fingerprint = require_matching_certificate(key_report, result.stdout)
    print(f"Verified built APK uses the configured signing SHA-1: {fingerprint}")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print(f"::error::{error}", file=sys.stderr)
        sys.exit(1)
