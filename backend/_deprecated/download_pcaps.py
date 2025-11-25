"""
download_pcaps.py - Download sample PCAP files for testing
Downloads recommended PCAP files from Wireshark sample captures
"""

import os
import urllib.request
import sys


# Recommended sample captures from Wireshark
SAMPLE_PCAPS = {
    "http": {
        "name": "http.cap",
        "url": "https://wiki.wireshark.org/uploads/__moin_import__/attachments/SampleCaptures/http.cap",
        "description": "Basic HTTP traffic with GET/POST requests - Good for testing HTTP analysis",
        "size": "~500 KB",
        "packets": "~4000"
    },
    "dns_attack": {
        "name": "dns-remoteshell.pcap",
        "url": "https://wiki.wireshark.org/uploads/__moin_import__/attachments/SampleCaptures/dns-remoteshell.pcap",
        "description": "DNS tunneling attack - Perfect for testing anomaly detection!",
        "size": "~100 KB",
        "packets": "~1000"
    },
    "mixed": {
        "name": "SkypeIRC.cap",
        "url": "https://wiki.wireshark.org/uploads/__moin_import__/attachments/SampleCaptures/SkypeIRC.cap",
        "description": "Mixed Skype + IRC traffic - Diverse protocols",
        "size": "~300 KB",
        "packets": "~2000"
    },
    "malware": {
        "name": "Zeus-sample-1.pcap",
        "url": "https://www.malware-traffic-analysis.net/2014/10/29/2014-10-29-traffic-analysis-exercise.pcap.zip",
        "description": "Zeus malware traffic - Advanced threat detection testing",
        "size": "~5 MB",
        "packets": "~50000",
        "note": "ZIP file - extract manually"
    },
    "ddos": {
        "name": "ddos.pcap",
        "url": "https://wiki.wireshark.org/uploads/__moin_import__/attachments/SampleCaptures/ddos.pcap",
        "description": "DDoS attack traffic - Flood detection",
        "size": "~10 MB",
        "packets": "~100000"
    },
    "port_scan": {
        "name": "nmap-simple.pcap",
        "url": "https://wiki.wireshark.org/uploads/__moin_import__/attachments/SampleCaptures/nmap-simple.pcap",
        "description": "Nmap port scan - Reconnaissance detection",
        "size": "~50 KB",
        "packets": "~500"
    },
}


def download_pcap(key: str, dest_dir: str = "."):
    """Download a specific PCAP file."""
    if key not in SAMPLE_PCAPS:
        print(f" Unknown PCAP key: {key}")
        print(f"   Available: {', '.join(SAMPLE_PCAPS.keys())}")
        return False
    
    pcap_info = SAMPLE_PCAPS[key]
    dest_path = os.path.join(dest_dir, pcap_info["name"])
    
    # Check if already exists
    if os.path.exists(dest_path):
        print(f" {pcap_info['name']} already exists")
        print(f"  Path: {dest_path}")
        return True
    
    print(f"\n Downloading: {pcap_info['name']}")
    print(f"   Description: {pcap_info['description']}")
    print(f"   Size: {pcap_info['size']}")
    print(f"   URL: {pcap_info['url']}")
    
    try:
        # Download with progress
        def show_progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(downloaded * 100 / total_size, 100)
                print(f"\r   Progress: {percent:.1f}%", end="", flush=True)
        
        urllib.request.urlretrieve(
            pcap_info["url"],
            dest_path,
            reporthook=show_progress
        )
        
        print(f"\n Downloaded: {dest_path}")
        
        if "note" in pcap_info:
            print(f"     Note: {pcap_info['note']}")
        
        return True
        
    except Exception as e:
        print(f"\n Download failed: {e}")
        return False


def list_pcaps():
    """List all available PCAP files."""
    print("\n" + "="*80)
    print(" Available Sample PCAP Files")
    print("="*80)
    
    for key, info in SAMPLE_PCAPS.items():
        print(f"\n {key}")
        print(f"   File: {info['name']}")
        print(f"   Description: {info['description']}")
        print(f"   Size: {info['size']} (~{info['packets']} packets)")
        
        # Check if exists
        if os.path.exists(info['name']):
            print(f"   Status:  Downloaded")
        else:
            print(f"   Status:  Not downloaded")


def download_recommended():
    """Download recommended PCAP files for testing."""
    print("\n" + "="*80)
    print(" Downloading Recommended PCAPs for AINetUI")
    print("="*80)
    
    # These are the best for testing AINetUI
    recommended = ["http", "dns_attack", "port_scan"]
    
    print("\nRecommended for testing:")
    print("1. http.cap - Basic HTTP traffic")
    print("2. dns-remoteshell.pcap - DNS tunneling attack (PERFECT for anomaly detection)")
    print("3. nmap-simple.pcap - Port scanning (GREAT for incident correlation)")
    
    success_count = 0
    for key in recommended:
        if download_pcap(key):
            success_count += 1
    
    print("\n" + "="*80)
    print(f" Downloaded {success_count}/{len(recommended)} files")
    print("="*80)
    
    if success_count > 0:
        print("\n How to use:")
        print("   1. Edit .env file")
        print("   2. Set PCAP_FILE=dns-remoteshell.pcap")
        print("   3. Set PCAP_LOOP=true")
        print("   4. Run: python main.py")
        print("\n   The DNS tunneling attack will trigger anomalies! ")


def main():
    """Main function."""
    print("\n AINetUI PCAP Downloader")
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "list":
            list_pcaps()
        elif command == "all":
            print("\n Downloading all PCAPs...")
            for key in SAMPLE_PCAPS.keys():
                download_pcap(key)
        elif command == "recommended" or command == "rec":
            download_recommended()
        elif command in SAMPLE_PCAPS:
            download_pcap(command)
        else:
            print(f" Unknown command: {command}")
            print("\nUsage:")
            print("  python download_pcaps.py list          # List available PCAPs")
            print("  python download_pcaps.py recommended   # Download recommended PCAPs")
            print("  python download_pcaps.py <name>        # Download specific PCAP")
            print("  python download_pcaps.py all           # Download all PCAPs")
            print(f"\nAvailable names: {', '.join(SAMPLE_PCAPS.keys())}")
    else:
        # Interactive mode
        print("\nWhat would you like to do?")
        print("1. Download recommended PCAPs (http, dns_attack, port_scan)")
        print("2. List all available PCAPs")
        print("3. Download all PCAPs")
        print("4. Exit")
        
        choice = input("\nYour choice (1-4): ").strip()
        
        if choice == "1":
            download_recommended()
        elif choice == "2":
            list_pcaps()
        elif choice == "3":
            print("\n Downloading all PCAPs...")
            for key in SAMPLE_PCAPS.keys():
                download_pcap(key)
        elif choice == "4":
            print("Goodbye!")
        else:
            print("Invalid choice")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled by user")
    except Exception as e:
        print(f"\n Error: {e}")
        import traceback
        traceback.print_exc()
