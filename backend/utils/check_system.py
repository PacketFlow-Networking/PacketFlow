"""
check_system.py - System readiness checker for PacketFlow
Verifies all dependencies and configuration before running
"""

import sys
import subprocess
import os
import yaml
from pathlib import Path


def print_header(text):
    """Print a formatted header"""
    print(f"\n{'='*60}")
    print(f"  {text}")
    print('='*60)


def print_status(check, passed, message=""):
    """Print a check status"""
    status = " PASS" if passed else " FAIL"
    color = '\033[92m' if passed else '\033[91m'
    reset = '\033[0m'
    
    print(f"{color}{status}{reset} - {check}")
    if message:
        print(f"       {message}")


def check_python_version():
    """Check Python version"""
    version = sys.version_info
    required = (3, 11)
    
    passed = version >= required
    message = f"Version: {version.major}.{version.minor}.{version.micro}"
    
    if not passed:
        message += f" (Required: {required[0]}.{required[1]}+)"
    
    print_status("Python Version", passed, message)
    return passed


def check_tshark():
    """Check if TShark is installed"""
    try:
        result = subprocess.run(
            ["tshark", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print_status("TShark Installation", True, version_line)
            return True
        else:
            print_status("TShark Installation", False, "TShark returned error")
            return False
            
    except FileNotFoundError:
        print_status(
            "TShark Installation", 
            False, 
            "TShark not found. Install Wireshark: https://www.wireshark.org/download.html"
        )
        return False
    except Exception as e:
        print_status("TShark Installation", False, f"Error: {e}")
        return False


def check_config_file():
    """Check if config.yaml exists and is valid"""
    config_path = Path("config.yaml")
    
    if not config_path.exists():
        print_status("Configuration File", False, "config.yaml not found")
        return False, None
    
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        print_status("Configuration File", True, "config.yaml loaded successfully")
        return True, config
        
    except yaml.YAMLError as e:
        print_status("Configuration File", False, f"YAML parse error: {e}")
        return False, None
    except Exception as e:
        print_status("Configuration File", False, f"Error: {e}")
        return False, None


def check_pcap_file(config):
    """Check if PCAP file exists (if in pcap mode)"""
    if not config:
        return True  # Skip if no config
    
    try:
        capture_config = config.get('capture', {})
        mode = capture_config.get('mode', 'live')
        
        if mode == 'pcap':
            pcap_file = capture_config.get('pcap_file')
            
            if not pcap_file:
                print_status("PCAP File", False, "No pcap_file specified in config")
                return False
            
            pcap_path = Path(pcap_file)
            
            if pcap_path.exists():
                size_mb = pcap_path.stat().st_size / (1024 * 1024)
                print_status("PCAP File", True, f"{pcap_file} ({size_mb:.2f} MB)")
                return True
            else:
                print_status("PCAP File", False, f"{pcap_file} not found")
                return False
        else:
            print_status("PCAP File", True, f"Not required (mode: {mode})")
            return True
            
    except Exception as e:
        print_status("PCAP File", False, f"Error: {e}")
        return False


def check_network_interfaces():
    """Check available network interfaces"""
    try:
        result = subprocess.run(
            ["tshark", "-D"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            interfaces = result.stdout.strip().split('\n')
            interface_count = len([i for i in interfaces if i.strip()])
            
            print_status(
                "Network Interfaces", 
                True, 
                f"Found {interface_count} interface(s)"
            )
            
            print("       Available interfaces:")
            for interface in interfaces[:5]:  # Show first 5
                if interface.strip():
                    print(f"         {interface}")
            
            if interface_count > 5:
                print(f"         ... and {interface_count - 5} more")
            
            return True
        else:
            print_status("Network Interfaces", False, "Could not list interfaces")
            return False
            
    except FileNotFoundError:
        print_status("Network Interfaces", False, "TShark not available")
        return False
    except Exception as e:
        print_status("Network Interfaces", False, f"Error: {e}")
        return False


def check_python_packages():
    """Check if required Python packages are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'orjson',
        'pyyaml',
        'aiohttp',
    ]
    
    all_installed = True
    missing = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            all_installed = False
            missing.append(package)
    
    if all_installed:
        print_status("Python Packages", True, "All required packages installed")
    else:
        print_status(
            "Python Packages", 
            False, 
            f"Missing: {', '.join(missing)}"
        )
        print("       Install with: pip install -r requirements.txt")
    
    return all_installed


def check_port_availability():
    """Check if port 8000 is available"""
    import socket
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('127.0.0.1', 8000))
        sock.close()
        
        if result == 0:
            print_status("Port 8000", False, "Port already in use")
            print("       Change port in config.yaml or stop other service")
            return False
        else:
            print_status("Port 8000", True, "Available")
            return True
            
    except Exception as e:
        print_status("Port 8000", False, f"Error checking port: {e}")
        return False


def check_ai_endpoint(config):
    """Check if AI endpoint is reachable"""
    if not config:
        return True
    
    try:
        ai_config = config.get('ai', {})
        mode = ai_config.get('mode', 'mock')
        
        if mode == 'remote':
            url = ai_config.get('url')
            
            if not url:
                print_status("AI Endpoint", False, "No URL specified for remote mode")
                return False
            
            print_status("AI Endpoint", True, f"Configured: {url}")
            print("       Note: Connection will be tested at runtime")
            return True
        else:
            print_status("AI Endpoint", True, f"Mode: {mode} (no remote check needed)")
            return True
            
    except Exception as e:
        print_status("AI Endpoint", False, f"Error: {e}")
        return False


def main():
    """Run all system checks"""
    print_header("PacketFlow System Readiness Check")
    print("Checking dependencies and configuration...\n")
    
    results = {}
    
    # Run all checks
    print_header("Core Dependencies")
    results['python'] = check_python_version()
    results['tshark'] = check_tshark()
    results['packages'] = check_python_packages()
    
    print_header("Configuration")
    config_ok, config = check_config_file()
    results['config'] = config_ok
    
    if config_ok:
        results['pcap'] = check_pcap_file(config)
        results['ai'] = check_ai_endpoint(config)
    
    print_header("Network")
    results['interfaces'] = check_network_interfaces()
    results['port'] = check_port_availability()
    
    # Summary
    print_header("Summary")
    
    total = len(results)
    passed = sum(results.values())
    failed = total - passed
    
    print(f"\n  Total Checks: {total}")
    print(f"   Passed: {passed}")
    print(f"   Failed: {failed}")
    
    if failed == 0:
        print(f"\n  \033[92m System is ready to run PacketFlow!\033[0m")
        print(f"\n  Start the backend with: python main.py")
        print(f"  Or use the launcher: run.bat")
        return 0
    else:
        print(f"\n  \033[91m Please fix the issues above before running.\033[0m")
        print(f"\n  See TROUBLESHOOTING.md for detailed solutions.")
        return 1


if __name__ == "__main__":
    os.chdir(Path(__file__).parent)  # Ensure we're in backend directory
    sys.exit(main())
