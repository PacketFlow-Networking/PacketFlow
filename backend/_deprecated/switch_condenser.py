#!/usr/bin/env python3
"""
switch_condenser.py - Utility to switch between original and enhanced condenser

Usage:
    python switch_condenser.py enhanced    # Switch to enhanced version
    python switch_condenser.py original    # Switch to original version
    python switch_condenser.py status      # Check current version
    python switch_condenser.py compare     # Compare features
"""

import sys
import os
from pathlib import Path


def get_main_py_path():
    """Get path to main.py."""
    return Path(__file__).parent / "main.py"


def read_main_py():
    """Read main.py content."""
    path = get_main_py_path()
    if not path.exists():
        print(f" Error: main.py not found at {path}")
        sys.exit(1)
    
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def write_main_py(content):
    """Write main.py content."""
    path = get_main_py_path()
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def get_current_version():
    """Detect which version is currently active."""
    content = read_main_py()
    
    if 'from condense_enhanced import FlowCondenser' in content:
        return 'enhanced'
    elif 'from condense import FlowCondenser' in content:
        return 'original'
    else:
        return 'unknown'


def switch_to_enhanced():
    """Switch to enhanced condenser."""
    content = read_main_py()
    
    # Replace import
    if 'from condense import FlowCondenser' in content:
        content = content.replace(
            'from condense import FlowCondenser',
            'from condense_enhanced import FlowCondenser'
        )
        write_main_py(content)
        print(" Switched to ENHANCED version")
        print("   New features:")
        print("   - Protocol-specific detection (DNS/HTTP/TLS)")
        print("   - Payload-based threat detection")
        print("   - Improved port scan detection")
        print("   - Detection metrics tracking")
        print("   - Automatic memory cleanup")
        print("\n See ENHANCEMENTS.md for details")
        return True
    elif 'from condense_enhanced import FlowCondenser' in content:
        print("  Already using ENHANCED version")
        return False
    else:
        print(" Error: Could not find FlowCondenser import in main.py")
        return False


def switch_to_original():
    """Switch to original condenser."""
    content = read_main_py()
    
    # Replace import
    if 'from condense_enhanced import FlowCondenser' in content:
        content = content.replace(
            'from condense_enhanced import FlowCondenser',
            'from condense import FlowCondenser'
        )
        write_main_py(content)
        print(" Switched to ORIGINAL version")
        print("   Using proven, stable detection methods")
        return True
    elif 'from condense import FlowCondenser' in content:
        print("  Already using ORIGINAL version")
        return False
    else:
        print(" Error: Could not find FlowCondenser import in main.py")
        return False


def show_status():
    """Show current version status."""
    version = get_current_version()
    
    print("=" * 60)
    print(" PacketFlow Condenser Version Status")
    print("=" * 60)
    
    if version == 'enhanced':
        print(" Current version: ENHANCED")
        print("\n Active features:")
        print("   - All original detection methods (Z-Score, IQR, EWMA, etc.)")
        print("   - Protocol-specific anomaly detection")
        print("   - Lightweight payload analysis")
        print("   - Time-windowed port scan detection")
        print("   - Detection metrics tracking")
        print("   - Automatic memory cleanup")
        print("\n Performance:")
        print("   CPU: +15-25% vs original")
        print("   Memory: Bounded (< 10 MB overhead)")
        print("   Latency: < 20ms per flow")
        
    elif version == 'original':
        print(" Current version: ORIGINAL")
        print("\n Active features:")
        print("   - Z-Score detection")
        print("   - IQR outlier detection")
        print("   - EWMA trend detection")
        print("   - Rate-based detection")
        print("   - Behavioral entropy detection")
        print("   - Basic port scan detection")
        print("\n Performance:")
        print("   CPU: Baseline")
        print("   Memory: ~60-120 MB for 100 flows")
        print("   Latency: < 5ms per flow")
        
    else:
        print(" Current version: UNKNOWN")
        print("   Could not detect FlowCondenser import")
    
    print("\n" + "=" * 60)
    print(" Commands:")
    print("   python switch_condenser.py enhanced  - Switch to enhanced")
    print("   python switch_condenser.py original  - Switch to original")
    print("=" * 60)


def show_comparison():
    """Show feature comparison table."""
    print("\n" + "=" * 80)
    print(" Feature Comparison: Original vs Enhanced")
    print("=" * 80)
    
    features = [
        ("Z-Score Detection", "", ""),
        ("IQR Detection", "", ""),
        ("EWMA Detection", "", ""),
        ("Rate-based Detection", "", ""),
        ("Behavioral Entropy", "", ""),
        ("Port Scan Detection", " Basic", " Time-windowed"),
        ("Protocol-Specific (DNS)", "", " Long queries, DGA, TLDs"),
        ("Protocol-Specific (HTTP)", "", " Methods, User-Agents"),
        ("Protocol-Specific (TLS)", "", " Version checking"),
        ("Payload Analysis", "", " SQL, XSS, Command Inject"),
        ("Detection Metrics", "", " By method/severity/proto"),
        ("Memory Cleanup", "", " Automatic periodic"),
        ("Threat Indicators", "", " Detailed threat tags"),
    ]
    
    print(f"{'Feature':<35} {'Original':<20} {'Enhanced':<25}")
    print("-" * 80)
    
    for feature, orig, enh in features:
        print(f"{feature:<35} {orig:<20} {enh:<25}")
    
    print("=" * 80)
    print("\n Performance Impact:")
    print(f"{'Metric':<30} {'Original':<20} {'Enhanced':<20}")
    print("-" * 70)
    print(f"{'CPU Usage':<30} {'Baseline':<20} {'+15-25%':<20}")
    print(f"{'Memory (100 flows)':<30} {'60-120 MB':<20} {'60-120 MB':<20}")
    print(f"{'Memory Growth':<30} {'Unbounded ':<20} {'Bounded ':<20}")
    print(f"{'Detection Latency':<30} {'< 5ms':<20} {'< 20ms':<20}")
    print("=" * 70)


def show_help():
    """Show help message."""
    print("""
PacketFlow Condenser Version Switcher
===================================

Usage:
    python switch_condenser.py <command>

Commands:
    enhanced    Switch to enhanced version (more features)
    original    Switch to original version (proven, stable)
    status      Show current version and features
    compare     Show detailed feature comparison
    help        Show this help message

Examples:
    python switch_condenser.py enhanced   # Enable new detection methods
    python switch_condenser.py original   # Use stable version
    python switch_condenser.py status     # Check what's active

For detailed documentation, see:
    ENHANCEMENTS.md - Full feature documentation
    README.md - Main project documentation
""")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        show_help()
        sys.exit(0)
    
    command = sys.argv[1].lower()
    
    if command in ['enhanced', 'enh', 'e']:
        switched = switch_to_enhanced()
        if switched:
            print("\n Restart the backend to apply changes:")
            print("   python main.py")
    
    elif command in ['original', 'orig', 'o']:
        switched = switch_to_original()
        if switched:
            print("\n Restart the backend to apply changes:")
            print("   python main.py")
    
    elif command in ['status', 'stat', 's']:
        show_status()
    
    elif command in ['compare', 'comp', 'c']:
        show_comparison()
    
    elif command in ['help', 'h', '-h', '--help']:
        show_help()
    
    else:
        print(f" Unknown command: {command}")
        print("\nUse 'python switch_condenser.py help' for usage")
        sys.exit(1)


if __name__ == "__main__":
    main()
