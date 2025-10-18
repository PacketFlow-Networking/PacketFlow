"""
simple_pcap_test.py - Simplest possible PCAP read test
"""

import subprocess

pcap = "../dns-remoteshell.pcap"

print("Testing PCAP with basic TShark command...")
print(f"File: {pcap}\n")

# Most basic read - just count packets
result = subprocess.run(
    ["tshark", "-r", pcap],
    capture_output=True,
    text=True,
    timeout=10
)

print("STDOUT:")
print(result.stdout[:500] if result.stdout else "(empty)")

print("\nSTDERR:")
print(result.stderr[:500] if result.stderr else "(empty)")

print("\nReturn code:", result.returncode)

# Count lines
lines = [l for l in result.stdout.split('\n') if l.strip()]
print(f"\nPackets found: {len(lines)}")
