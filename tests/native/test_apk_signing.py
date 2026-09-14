import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("verify_apk_signing", Path(__file__).parents[2] / "scripts/verify-apk-signing.py")
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)

FINGERPRINT = "EB:D5:6B:58:63:5B:96:A1:DC:EE:17:C1:79:9B:DA:D4:C0:2B:07:2F"
KEY_REPORT = "Certificate fingerprints:\n\t SHA1: " + FINGERPRINT + "\n"
MATCHING_APK = "Signer #1 certificate SHA-1 digest: " + FINGERPRINT.replace(":", "").lower() + "\n"


class ApkSigningTests(unittest.TestCase):
    def test_accepts_matching_keytool_and_apksigner_fingerprint_formats(self):
        self.assertEqual(verifier.require_matching_certificate(KEY_REPORT, MATCHING_APK), FINGERPRINT)

    def test_rejects_the_actual_mismatched_certificate_from_the_failed_google_sign_in_build(self):
        actual_report = "Signer #1 certificate SHA-1 digest: ac9e3e8b28f14df53874b157862dd716b12c6cba\n"
        with self.assertRaisesRegex(ValueError, "APK signing SHA-1 mismatch"):
            verifier.require_matching_certificate(KEY_REPORT, actual_report)

    def test_rejects_missing_or_additional_apk_signers(self):
        for report in ["", MATCHING_APK + MATCHING_APK.replace("#1", "#2")]:
            with self.subTest(report=report), self.assertRaises(ValueError):
                verifier.require_matching_certificate(KEY_REPORT, report)

    def test_rejects_missing_or_ambiguous_keystore_fingerprints(self):
        for report in ["", KEY_REPORT + KEY_REPORT]:
            with self.subTest(report=report), self.assertRaises(ValueError):
                verifier.require_matching_certificate(report, MATCHING_APK)


if __name__ == "__main__":
    unittest.main()
