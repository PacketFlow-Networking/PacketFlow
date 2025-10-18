"""
diagnose_capture.py - Diagnose packet capture issues
Run this to troubleshoot why TShark isn't capturing packets
"""

import subprocess
import sys
import os


def check_tshark_installed():
    """Check if TShark is installed and accessible."""
    print("="*80)
    print("1. Checking TShark Installation")
    print("="*80)
    
    try:
        result = subprocess.run(
            ["tshark", "-v"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            print(" TShark is installed")
            print(f"   Version: {result.stdout.split('\\n')[0]}")
            return True
        else:
            print(" TShark command failed")
            return False
            
    except FileNotFoundError:
        print(" TShark not found in PATH")
        print("\n Solution:")
        print("   1. Install Wireshark from: https://www.wireshark.org/download.html")
        print("   2. During installation, make sure to check 'TShark' component")
        print("   3. Add to PATH: C:\\Program Files\\Wireshark")
        return False
        
    except Exception as e:
        print(f" Error checking TShark: {e}")
        return False


def list_interfaces():
    """List available network interfaces."""
    print("\n" + "="*80)
    print("2. Available Network Interfaces")
    print("="*80)
    
    try:
        result = subprocess.run(
            ["tshark", "-D"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            interfaces = result.stdout.strip().split('\n')
            print(" Found interfaces:")
            for iface in interfaces:
                print(f"   {iface}")
            return interfaces
        else:
            print(" Could not list interfaces")
            print(f"   Error: {result.stderr}")
            return []
            
    except Exception as e:
        print(f" Error listing interfaces: {e}")
        return []


def test_capture_permissions(interface="5"):
    """Test if we can capture on the specified interface."""
    print("\n" + "="*80)
    print(f"3. Testing Packet Capture on Interface {interface}")
    print("="*80)
    
    try:
        print(f"   Attempting to capture 5 packets (this may take 10 seconds)...")
        
        result = subprocess.run(
            ["tshark", "-i", interface, "-c", "5"],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode == 0:
            packet_count = len([l for l in result.stdout.split('\n') if l.strip()])
            print(f" Successfully captured {packet_count} packets")
            print("\n   Sample output:")
            lines = result.stdout.split('\n')[:3]
            for line in lines:
                if line.strip():
                    print(f"   {line[:80]}")
            return True
        else:
            print(" Capture failed")
            print(f"   Error: {result.stderr}")
            
            if "permission" in result.stderr.lower():
                print("\n Permission Issue Detected:")
                print("   On Windows, TShark needs administrator privileges")
                print("\n   Solutions:")
                print("   1. Run your terminal as Administrator")
                print("   2. Or use MOCK_MODE=true in .env file")
            
            return False
            
    except subprocess.TimeoutExpired:
        print("  Capture timed out (no packets received in 15 seconds)")
        print("\n Possible reasons:")
        print("   1. No active traffic on this interface")
        print("   2. Wrong interface selected")
        print("   3. Interface is down")
        print("\n   Try:")
        print("    Select a different interface (see list above)")
        print("    Open a browser/ping something to generate traffic")
        print("    Or use MOCK_MODE=true for testing")
        return False
        
    except Exception as e:
        print(f" Error during capture test: {e}")
        return False


def check_active_interface():
    """Check which interface has active traffic."""
    print("\n" + "="*80)
    print("4. Detecting Active Interfaces")
    print("="*80)
    
    try:
        # Try to capture on multiple interfaces briefly
        interfaces = ["1", "2", "3", "4", "5"]
        
        for iface in interfaces:
            try:
                result = subprocess.run(
                    ["tshark", "-i", iface, "-c", "1"],
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                
                if result.returncode == 0 and result.stdout.strip():
                    print(f" Interface {iface} has active traffic")
                    
            except subprocess.TimeoutExpired:
                # No traffic on this interface
                pass
            except:
                # Interface doesn't exist or error
                pass
                
    except Exception as e:
        print(f"  Could not auto-detect: {e}")


def recommend_solution():
    """Provide recommendations based on diagnosis."""
    print("\n" + "="*80)
    print(" RECOMMENDATIONS")
    print("="*80)
    
    print("""
For testing the AINetUI enhancements:
 RECOMMENDED: Use Mock Mode
    Edit .env file: MOCK_MODE=true
    Generates realistic simulated traffic
    No admin privileges needed
    Perfect for testing AI features

For production use:
1. Install Wireshark/TShark properly
2. Run terminal as Administrator (Windows)
3. Select the correct active interface
4. Ensure interface has traffic (browse web, ping, etc.)

Quick test command:
   python main.py

You should see packets being captured within seconds.
""")


def main():
    """Run all diagnostics."""
    print("\n AINetUI Packet Capture Diagnostics")
    print(f"Running on: {sys.platform}")
    print()
    
    # Check TShark
    tshark_ok = check_tshark_installed()
    
    if not tshark_ok:
        print("\n" + "="*80)
        print("  TShark not available - Use MOCK_MODE=true")
        print("="*80)
        recommend_solution()
        return
    
    # List interfaces
    interfaces = list_interfaces()
    
    # Test capture
    capture_ok = test_capture_permissions()
    
    # Try to find active interface
    if not capture_ok:
        check_active_interface()
    
    # Give recommendations
    recommend_solution()
    
    print("\n" + "="*80)
    print("Diagnostics complete!")
    print("="*80)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nDiagnostics cancelled by user")
    except Exception as e:
        print(f"\n Fatal error: {e}")
        import traceback
        traceback.print_exc()
