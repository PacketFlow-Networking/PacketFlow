"""
test_pcap.py - Quick test to diagnose PCAP reading issues
"""

import subprocess
import json
import sys


def test_pcap_file(pcap_path):
    """Test if we can read packets from the PCAP file."""
    print("="*80)
    print(f"Testing PCAP file: {pcap_path}")
    print("="*80)
    
    # Test 1: Check if file exists
    print("\n1. Checking file existence...")
    import os
    if os.path.exists(pcap_path):
        file_size = os.path.getsize(pcap_path)
        print(f"    File exists: {pcap_path}")
        print(f"    Size: {file_size:,} bytes ({file_size/1024:.1f} KB)")
    else:
        print(f"    File not found: {pcap_path}")
        return False
    
    # Test 2: Try basic TShark read
    print("\n2. Testing TShark basic read...")
    try:
        result = subprocess.run(
            ["tshark", "-r", pcap_path],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        lines = [l for l in result.stdout.split('\n') if l.strip()]
        print(f"    TShark can read file")
        print(f"    Found {len(lines)} packets")
        
        if lines:
            print(f"\n   First 3 packets:")
            for line in lines[:3]:
                print(f"     {line[:100]}")
        
    except Exception as e:
        print(f"    TShark read failed: {e}")
        return False
    
    # Test 3: Try EK format (what we use)
    print("\n3. Testing TShark EK format (Elasticsearch JSON)...")
    try:
        result = subprocess.run(
            ["tshark", "-r", pcap_path, "-T", "ek", "-c", "5"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        # Parse JSON lines
        json_objects = []
        for line in result.stdout.split('\n'):
            line = line.strip()
            if line and not line.startswith('{"index"'):
                try:
                    obj = json.loads(line)
                    if 'layers' in obj:
                        json_objects.append(obj)
                except:
                    pass
        
        print(f"    EK format works")
        print(f"    Parsed {len(json_objects)} JSON packet objects")
        
        if json_objects:
            print(f"\n   First packet structure:")
            first = json_objects[0]
            layers = first.get('layers', {})
            print(f"     Available layers: {list(layers.keys())}")
            
            # Check for IP layer
            if 'ip' in layers or 'ipv6' in layers:
                ip = layers.get('ip', layers.get('ipv6', {}))
                src = ip.get('ip_ip_src', ip.get('ipv6_ipv6_src', 'N/A'))
                dst = ip.get('ip_ip_dst', ip.get('ipv6_ipv6_dst', 'N/A'))
                print(f"     Source IP: {src}")
                print(f"     Dest IP: {dst}")
            else:
                print(f"      No IP layer found!")
                print(f"     Layers detail: {layers.keys()}")
        
        return len(json_objects) > 0
        
    except Exception as e:
        print(f"    EK format failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    pcap_file = "../dns-remoteshell.pcap"
    
    if len(sys.argv) > 1:
        pcap_file = sys.argv[1]
    
    print("\n PCAP File Diagnostic Tool\n")
    
    success = test_pcap_file(pcap_file)
    
    print("\n" + "="*80)
    if success:
        print(" PCAP file is readable and contains packets!")
        print("="*80)
        print("\n If backend still shows 0 packets, the issue is in parsing logic.")
    else:
        print(" PCAP file has issues")
        print("="*80)
        print("\n Possible solutions:")
        print("   1. Try a different PCAP file")
        print("   2. Re-download the PCAP")
        print("   3. Use mock mode instead: MOCK_MODE=true")


if __name__ == "__main__":
    main()
