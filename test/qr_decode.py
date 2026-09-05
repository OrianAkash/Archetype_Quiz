"""Renders every matrix from qr-cases.json and decodes it with OpenCV.

A QR code that encodes cleanly but cannot be read by a real scanner is
worthless, so this is the check that actually matters.

    python3 test/qr_decode.py
"""

import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, "qr-cases.json")) as fh:
    cases = json.load(fh)

detector = cv2.QRCodeDetector()

passed = failed = skipped = 0
failures = []

for case in cases:
    if "error" in case:
        skipped += 1
        continue

    rows = case["rows"]
    size = len(rows)
    quiet = 6  # must match QUIET_ZONE in js/qr.js — that is what ships

    # 1 = dark module -> 0 (black); background white.
    grid = np.ones((size + quiet * 2, size + quiet * 2), dtype=np.uint8) * 255
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "1":
                grid[y + quiet, x + quiet] = 0

    # Scale up the way a printed code would be, no interpolation.
    scale = 8
    img = cv2.resize(grid, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)

    decoded, _, _ = detector.detectAndDecode(img)

    label = f"v{case['version']:>2} {case['level']} mask{case['mask']}"
    if decoded == case["text"]:
        passed += 1
        print(f"  PASS  {label}  {case['text'][:52]}")
    else:
        failed += 1
        failures.append((label, case["text"], decoded))
        print(f"  FAIL  {label}  expected {case['text'][:40]!r}")
        print(f"                    got      {decoded[:40]!r}")

print()
print(f"decoded {passed}/{passed + failed} rendered QR codes"
      + (f" ({skipped} skipped as too long)" if skipped else ""))

if failed:
    print("\nFAILURES:")
    for label, expected, got in failures:
        print(f"  {label}: expected {expected!r}, got {got!r}")
    sys.exit(1)

print("QR ENCODER VERIFIED")
