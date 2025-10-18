"""
Test script to diagnose PCAP file issues
"""
import subprocess
import os
import sys

pcap_file = "../dns-remoteshell.pcap"

print("=" * 80)
print("PCAP File Diagnostics")
print("=" * 80)

# Check if file exists
if not os.path.exists(pcap_file):
    print(f" File not found: {pcap_file}")
    sys.exit(1)

print(f" File exists: {pcap_file}")
print(f"   Size: {os.path.getsize(pcap_file):,} bytes")
print()

# Try basic tshark read
print("Testing basic TShark read...")
try:
    result = subprocess.run(
        ["tshark", "-r", pcap_file, "-c", "10"],
        capture_output=True,
        text=True,
        timeout=10
    )
    
    if result.returncode == 0:
        lines = result.stdout.strip().split('\n')
        print(f" TShark can read the file")
        print(f"   Packets found: {len(lines)}")
        print(f"   First 5 packets:")
        for line in lines[:5]:
            print(f"   {line}")
    else:
        print(f" TShark error: {result.stderr}")
except Exception as e:
    print(f" Error: {e}")

print()

# Try with -T ek format
print("Testing TShark EK format...")
try:
    result = subprocess.run(
        ["tshark", "-r", pcap_file, "-T", "ek", "-c", "5"],
        capture_output=True,
        text=True,
        timeout=10
    )
    
    if result.returncode == 0:
        lines = [l for l in result.stdout.strip().split('\n') if l and not l.startswith('{"index"')]
        print(f" EK format works")
        print(f"   Number of JSON lines: {len(lines)}")
        if lines:
            print(f"   First packet (truncated):")
            print(f"   {lines[0][:200]}...")
        else:
            print(f"     No JSON packets found!")
            print(f"   Raw output lines: {len(result.stdout.split(chr(10)))}")
    else:
        print(f" EK format error: {result.stderr}")
except Exception as e:
    print(f" Error: {e}")

print()

# Get packet count
print("Getting packet count...")
try:
    result = subprocess.run(
        ["tshark", "-r", pcap_file, "-q", "-z", "io,stat,0"],
        capture_output=True,
        text=True,
        timeout=10
    )
    
    if result.returncode == 0:
        print(f" Statistics:")
        for line in result.stdout.strip().split('\n'):
            if 'Frames' in line or 'Interval' in line or '|' in line:
                print(f"   {line}")
    else:
        print(f" Error: {result.stderr}")
except Exception as e:
    print(f" Error: {e}")

print()

# Check protocol distribution
print("Checking protocol distribution...")
try:
    result = subprocess.run(
        ["tshark", "-r", pcap_file, "-q", "-z", "io,phs"],
        capture_output=True,
        text=True,
        timeout=10
    )
    
    if result.returncode == 0:
        print(f" Protocol Hierarchy:")
        lines = result.stdout.strip().split('\n')
        for line in lines[:20]:  # First 20 lines
            if line.strip():
                print(f"   {line}")
    else:
        print(f" Error: {result.stderr}")
except Exception as e:
    print(f" Error: {e}")

print()
print("=" * 80)
print("Diagnosis complete!")
print("=" * 80)
print()
print("RECOMMENDATION:")
print("If the file has packets but EK format returns 0 lines,")
print("the PCAP format may not be compatible with TShark's EK output.")
print()
print("Solution: Switch back to MOCK_MODE=true in .env file")
print("or use a different PCAP file.")
