"""
format_logs.py - Pretty log formatter for PacketFlow
Converts ANSI escape codes and formats log output nicely
"""

import re
import sys
from datetime import datetime

# ANSI color codes
COLORS = {
    'reset': '\033[0m',
    'bold': '\033[1m',
    'red': '\033[31m',
    'green': '\033[32m',
    'yellow': '\033[33m',
    'blue': '\033[34m',
    'magenta': '\033[35m',
    'cyan': '\033[36m',
}

# Remove ANSI escape sequences for Windows terminals that don't support them
def strip_ansi(text):
    """Remove ANSI escape codes from text"""
    ansi_escape = re.compile(r'\x1b\[[0-9;]*m')
    return ansi_escape.sub('', text)

def format_log_line(line):
    """Format a log line with colors and structure"""
    # Strip existing ANSI codes
    clean = strip_ansi(line)
    
    # Parse log level
    if ' - INFO - ' in clean:
        level_color = COLORS['green']
        level = 'INFO'
    elif ' - ERROR - ' in clean:
        level_color = COLORS['red']
        level = 'ERROR'
    elif ' - WARNING - ' in clean:
        level_color = COLORS['yellow']
        level = 'WARNING'
    elif ' - DEBUG - ' in clean:
        level_color = COLORS['blue']
        level = 'DEBUG'
    else:
        return clean
    
    # Extract timestamp
    timestamp_match = re.match(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})', clean)
    if timestamp_match:
        timestamp = timestamp_match.group(1)
        rest = clean[len(timestamp):].strip()
        
        # Format with colors
        return f"{COLORS['cyan']}{timestamp}{COLORS['reset']} {level_color}[{level}]{COLORS['reset']} {rest}"
    
    return clean

def main():
    """Read from stdin and format each line"""
    try:
        for line in sys.stdin:
            line = line.rstrip('\n')
            
            # Special formatting for section headers
            if '=' * 10 in line:
                print(f"{COLORS['bold']}{COLORS['magenta']}{line}{COLORS['reset']}")
            else:
                print(format_log_line(line))
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()
