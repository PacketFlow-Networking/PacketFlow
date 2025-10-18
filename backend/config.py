"""
config.py - Configuration management for AINetUI
"""
import os
from typing import Dict, Any, List, Literal
from pathlib import Path


class Config:
    """Application configuration management."""
    
    def __init__(self):
        """Initialize configuration from environment variables."""
        self.capture = CaptureConfig()
        self.condenser = CondenserConfig()
        self.ai = AIConfig()
        self.server = ServerConfig()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            'capture': self.capture.__dict__,
            'condenser': self.condenser.__dict__,
            'ai': self.ai.__dict__,
            'server': self.server.__dict__
        }
    
    def validate(self) -> List[str]:
        """
        Validate configuration.
        
        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []
        
        # Validate capture interface
        if not self.capture.interface:
            errors.append("CAPTURE_INTERFACE is required")
        
        # Validate window size
        if self.condenser.window_size <= 0:
            errors.append("WINDOW_SIZE must be positive")
        
        # Validate anomaly threshold
        if self.condenser.anomaly_threshold < 0:
            errors.append("ANOMALY_THRESHOLD must be non-negative")
        
        # Validate AI mode
        if self.ai.mode not in ['local', 'remote']:
            errors.append("AI_MODE must be 'local' or 'remote'")
        
        # Validate local AI settings
        if self.ai.mode == 'local':
            if not self.ai.ollama_url:
                errors.append("OLLAMA_URL is required for local mode")
            if not self.ai.local_model:
                errors.append("LOCAL_AI_MODEL is required for local mode")
        
        # Validate remote AI settings
        if self.ai.mode == 'remote':
            if not self.ai.remote_url:
                errors.append("REMOTE_AI_URL is required for remote mode")
            if not self.ai.remote_model:
                errors.append("REMOTE_AI_MODEL is required for remote mode")
        
        # Validate server port
        if not (1 <= self.server.port <= 65535):
            errors.append("SERVER_PORT must be between 1 and 65535")
        
        return errors
    
    @classmethod
    def load_from_env(cls) -> 'Config':
        """Load configuration from environment variables."""
        # Load .env file if it exists
        env_file = Path(__file__).parent / '.env'
        if env_file.exists():
            try:
                from dotenv import load_dotenv
                load_dotenv(env_file)
            except ImportError:
                print("Warning: python-dotenv not installed, using system env vars only")
        
        return cls()


class CaptureConfig:
    """Packet capture configuration."""
    
    def __init__(self):
        self.interface = os.getenv('CAPTURE_INTERFACE', '5')
        self.mock_mode = os.getenv('MOCK_MODE', 'false').lower() == 'true'
        self.buffer_size = int(os.getenv('BUFFER_SIZE', '1000'))
        self.tshark_path = os.getenv('TSHARK_PATH', 'tshark')
        self.filter = os.getenv('CAPTURE_FILTER', '')  # BPF filter
        
        # PCAP replay settings
        self.pcap_file = os.getenv('PCAP_FILE', '')  # Path to PCAP file
        self.pcap_loop = os.getenv('PCAP_LOOP', 'true').lower() == 'true'
        self.pcap_speed = float(os.getenv('PCAP_SPEED', '1.0'))
    
    def __repr__(self):
        mode_str = "mock" if self.mock_mode else ("pcap" if self.pcap_file else "live")
        return (f"CaptureConfig(mode={mode_str}, interface={self.interface}, "
                f"pcap_file='{self.pcap_file}', filter='{self.filter}')")


class CondenserConfig:
    """Flow condenser configuration."""
    
    def __init__(self):
        self.window_size = int(os.getenv('WINDOW_SIZE', '5'))
        self.anomaly_threshold = float(os.getenv('ANOMALY_THRESHOLD', '2.5'))
        self.min_flows_for_alert = int(os.getenv('MIN_FLOWS_FOR_ALERT', '10'))
        self.history_windows = int(os.getenv('HISTORY_WINDOWS', '12'))
    
    def __repr__(self):
        return (f"CondenserConfig(window_size={self.window_size}, "
                f"anomaly_threshold={self.anomaly_threshold})")


class AIConfig:
    """AI agent configuration with local and remote support."""
    
    def __init__(self):
        # AI Mode: 'local' or 'remote'
        self.mode: Literal['local', 'remote'] = os.getenv('AI_MODE', 'local')
        
        # Local Ollama settings
        self.ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        self.local_model = os.getenv('LOCAL_AI_MODEL', 'mistral:7b')
        
        # Remote UCY server settings
        self.remote_url = os.getenv('REMOTE_AI_URL', 'https://chatucy.cs.ucy.ac.cy/api/send_message')
        self.remote_model = os.getenv('REMOTE_AI_MODEL', 'llama3.1:latest')
        self.remote_websearch = os.getenv('REMOTE_WEBSEARCH', 'false').lower() == 'true'
        self.remote_client_rag = os.getenv('REMOTE_CLIENT_RAG', 'false').lower() == 'true'
        
        # Common settings
        self.timeout = int(os.getenv('AI_TIMEOUT', '30'))
        self.temperature = float(os.getenv('AI_TEMPERATURE', '0.7'))
        self.max_tokens = int(os.getenv('AI_MAX_TOKENS', '250'))
        self.mock_mode = os.getenv('AI_MOCK_MODE', 'false').lower() == 'true'
        
        # System prompt for network analysis
        self.system_prompt = os.getenv('AI_SYSTEM_PROMPT', 
            "You are an expert network security analyst. "
            "Analyze network events and provide concise explanations "
            "with security implications and recommendations. "
            "Keep responses to 2-3 sentences."
        )
    
    @property
    def current_url(self) -> str:
        """Get current AI URL based on mode."""
        return self.remote_url if self.mode == 'remote' else self.ollama_url
    
    @property
    def current_model(self) -> str:
        """Get current model based on mode."""
        return self.remote_model if self.mode == 'remote' else self.local_model
    
    def __repr__(self):
        return (f"AIConfig(mode={self.mode}, "
                f"url={self.current_url}, "
                f"model={self.current_model})")


class ServerConfig:
    """Server configuration."""
    
    def __init__(self):
        self.host = os.getenv('SERVER_HOST', '0.0.0.0')
        self.port = int(os.getenv('SERVER_PORT', '8000'))
        self.log_level = os.getenv('LOG_LEVEL', 'INFO')
        self.debug = os.getenv('DEBUG', 'false').lower() == 'true'
        self.log_file = os.getenv('LOG_FILE', 'ainetui.log')
        
        # CORS settings
        cors_origins_str = os.getenv('CORS_ORIGINS', 
            'http://localhost:5173,http://localhost:3000')
        self.cors_origins = [origin.strip() for origin in cors_origins_str.split(',')]
        
        # WebSocket settings
        self.enable_websocket = os.getenv('ENABLE_WEBSOCKET', 'true').lower() == 'true'
        self.ws_ping_interval = int(os.getenv('WS_PING_INTERVAL', '20'))
        
        # Memory limits
        self.max_events_in_memory = int(os.getenv('MAX_EVENTS_IN_MEMORY', '1000'))
    
    def __repr__(self):
        return (f"ServerConfig(host={self.host}, "
                f"port={self.port}, "
                f"log_level={self.log_level})")


# Global configuration instance
config = Config.load_from_env()


# Validate configuration on load
def validate_config():
    """Validate and print configuration."""
    errors = config.validate()
    
    if errors:
        print(" Configuration errors:")
        for error in errors:
            print(f"  - {error}")
        return False
    
    print(" Configuration loaded successfully:")
    print(f"  Capture: {config.capture}")
    print(f"  Condenser: {config.condenser}")
    print(f"  AI: {config.ai}")
    print(f"  Server: {config.server}")
    return True


if __name__ == "__main__":
    # Test configuration loading
    print("Testing configuration...")
    print("=" * 80)
    
    if validate_config():
        print("\nConfiguration dictionary:")
        import json
        print(json.dumps(config.to_dict(), indent=2))
    else:
        print("\n  Please fix configuration errors before running the application.")
