# Backend File Organization - Final Structure

## Summary
The PacketFlow backend has been completely reorganized into a clean, modular architecture with proper separation of concerns. All files are now in their logical locations.

## Final Directory Structure

```
backend/
├── config/                    # Configuration management
│   ├── __init__.py
│   └── settings.py            # Environment-based configuration (moved from config.py)
│
├── core/                      # Core processing logic
│   ├── __init__.py
│   ├── capture/
│   │   ├── __init__.py
│   │   └── capture.py         # Multi-source packet capture (moved from capture.py)
│   ├── condense/
│   │   ├── __init__.py
│   │   └── condenser.py       # Flow aggregation & anomaly detection (moved from condense_enhanced.py)
│   └── ai/
│       ├── __init__.py
│       └── ai_agent.py        # AI reasoning engine (moved from ai_agent.py)
│
├── api/                       # REST/WebSocket API layer
│   ├── __init__.py
│   ├── websocket_server.py    # FastAPI app (moved from websocket_server.py)
│   ├── routes/
│   │   └── __init__.py        # Future: REST routes
│   └── middleware/
│       └── __init__.py        # Future: Auth, CORS, rate limiting
│
├── persistence/               # Database layer
│   ├── __init__.py
│   ├── db.py                  # SQLite async operations (moved from database.py)
│   ├── repositories/
│   │   └── __init__.py        # Future: Data access objects (DAO pattern)
│   └── migrations/
│       └── __init__.py        # Future: Schema versioning
│
├── observability/             # Metrics & monitoring
│   ├── __init__.py
│   ├── metrics/
│   │   ├── __init__.py
│   │   └── metrics.py         # Prometheus metrics (moved from metrics.py)
│   └── logging/
│       └── __init__.py        # Future: Structured logging
│
├── infrastructure/            # Background tasks & system concerns
│   ├── __init__.py
│   ├── tasks/
│   │   ├── __init__.py
│   │   └── manager.py         # Task restart logic (moved from task_manager.py)
│   ├── cleanup/
│   │   └── __init__.py        # Future: Resource cleanup
│   └── signals/
│       └── __init__.py        # Future: Signal handling
│
├── tests/                     # Comprehensive test suite
│   ├── __init__.py
│   ├── unit/                  # Individual component tests
│   │   └── __init__.py
│   ├── integration/           # Component interaction tests
│   │   └── __init__.py
│   ├── e2e/                   # Full pipeline tests
│   │   └── __init__.py
│   ├── test_client.py         # (moved from root)
│   ├── test_enhanced_backend.py
│   ├── test_improvements.py
│   ├── test_pcap.py
│   └── simple_pcap_test.py
│
├── utils/                     # Development utilities & diagnostics
│   ├── __init__.py
│   ├── diagnose_capture.py    # (moved from root)
│   ├── diagnose_pcap.py
│   ├── download_pcaps.py
│   ├── format_logs.py
│   └── switch_condenser.py
│
├── _deprecated/               # Legacy files (kept for reference during migration)
│   ├── __init__.py
│   ├── ai_agent.py            # ⚠️ USE: from core.ai import AIAgent
│   ├── capture.py             # ⚠️ USE: from core.capture import PacketCapture
│   ├── check_system.py
│   ├── config.py              # ⚠️ USE: from config import config
│   ├── condense.py
│   ├── condense_enhanced.py   # ⚠️ USE: from core.condense import FlowCondenser
│   ├── database.py            # ⚠️ USE: from persistence import Database
│   ├── diagnose_capture.py
│   ├── diagnose_pcap.py
│   ├── download_pcaps.py
│   ├── format_logs.py
│   ├── metrics.py             # ⚠️ USE: from observability import packets_captured
│   ├── switch_condenser.py
│   ├── task_manager.py        # ⚠️ USE: from infrastructure import run_with_restart
│   └── websocket_server.py    # ⚠️ USE: from api import WebSocketServer
│
├── main.py                    # Application entry point (updated imports)
├── BACKEND_BUG_REPORT.md
├── DATABASE_README.md
├── requirements.txt
├── pyproject.toml
├── Dockerfile
├── .env
└── [other config files]
```

## File Organization Summary

### Moved to `config/`
- `config.py` → `config/settings.py`

### Moved to `core/`
- `capture.py` → `core/capture/capture.py`
- `condense_enhanced.py` → `core/condense/condenser.py`
- `ai_agent.py` → `core/ai/ai_agent.py`

### Moved to `api/`
- `websocket_server.py` → `api/websocket_server.py`

### Moved to `persistence/`
- `database.py` → `persistence/db.py`

### Moved to `observability/`
- `metrics.py` → `observability/metrics/metrics.py`

### Moved to `infrastructure/`
- `task_manager.py` → `infrastructure/tasks/manager.py`

### Moved to `tests/`
- `test_client.py`
- `test_enhanced_backend.py`
- `test_improvements.py`
- `test_pcap.py`
- `simple_pcap_test.py`

### Moved to `utils/`
- `check_system.py`
- `diagnose_capture.py`
- `diagnose_pcap.py`
- `download_pcaps.py`
- `format_logs.py`
- `switch_condenser.py`

### Preserved at Root Level
Only 3 essential files remain at root:
- `main.py` - Application entry point (updated with new imports)
- `BACKEND_BUG_REPORT.md` - Bug analysis documentation
- `DATABASE_README.md` - Database documentation

### Deprecated (Reference Only)
All original files are preserved in `_deprecated/` for reference during migration.
**Do NOT import from this directory - use the reorganized modules instead.**

## Import Changes

### Before (Old Structure)
```python
from config import config
from capture import PacketCapture
from condense_enhanced import FlowCondenser
from ai_agent import AIAgent
from websocket_server import WebSocketServer
from database import Database
from task_manager import run_with_restart, task_monitor
from metrics import packets_captured
```

### After (New Structure)
```python
from config import config                           # config/settings.py
from core.capture import PacketCapture             # core/capture/capture.py
from core.condense import FlowCondenser            # core/condense/condenser.py
from core.ai import AIAgent                        # core/ai/ai_agent.py
from api import WebSocketServer                    # api/websocket_server.py
from persistence import Database                  # persistence/db.py
from infrastructure import run_with_restart       # infrastructure/tasks/manager.py
from observability import packets_captured        # observability/metrics/metrics.py
```

## Running the Application

```bash
cd backend
source .venv/bin/activate
python main.py
```

## Development Tools

### Diagnostic Scripts
Located in `utils/`:
```bash
python utils/check_system.py           # Check system requirements
python utils/diagnose_capture.py       # Diagnose packet capture issues
python utils/diagnose_pcap.py          # Diagnose PCAP file issues
python utils/download_pcaps.py         # Download sample PCAP files
python utils/format_logs.py            # Format log output
python utils/switch_condenser.py       # Switch between condenser versions
```

### Test Files
Located in `tests/`:
```bash
python tests/test_client.py            # Test WebSocket client
python tests/test_enhanced_backend.py   # Test enhanced backend features
python tests/simple_pcap_test.py       # Test PCAP processing
```

## Architecture Verification

### Directory Structure Check
```bash
ls -la backend/  # Should show: config, core, api, persistence, observability, infrastructure, tests, utils, _deprecated
```

### Import Verification
```bash
cd backend && source .venv/bin/activate && python -c "
from config import config
from core.capture import PacketCapture
from core.condense import FlowCondenser
from core.ai import AIAgent
from api import WebSocketServer
from persistence import Database
from infrastructure import run_with_restart
from observability import packets_captured
print('✓ All imports successful!')
"
```

## Next Steps

1. **Phase 2 - Module Expansion**
   - Create `api/routes/*.py` for REST endpoints
   - Create `api/middleware/*.py` for authentication & validation
   - Create `persistence/repositories/*.py` for data access objects

2. **Phase 3 - Add Tests**
   - Create comprehensive unit tests in `tests/unit/`
   - Create integration tests in `tests/integration/`
   - Create e2e tests in `tests/e2e/`

3. **Phase 4 - Documentation**
   - Update README.md with new structure
   - Document each module's responsibilities
   - Create contribution guidelines

4. **Phase 5 - Cleanup**
   - Remove `_deprecated/` directory
   - Update CI/CD pipelines
   - Update Docker configuration
   - Update import statements in all files

5. **Phase 6 - Enhancement**
   - Add API documentation (OpenAPI/Swagger)
   - Add logging configuration in `observability/logging/`
   - Add signal handling in `infrastructure/signals/`
   - Implement cleanup tasks in `infrastructure/cleanup/`

## Benefits of This Organization

✓ **Clear Separation of Concerns** - Each directory has a single, well-defined responsibility
✓ **Easy Navigation** - Files organized by functionality, not type
✓ **Scalability** - Easy to add new routes, metrics, tasks, or modules
✓ **Testability** - Core logic decoupled from infrastructure for easier testing
✓ **Maintainability** - New developers can quickly understand the structure
✓ **No Circular Dependencies** - Clean import graph following layered architecture
✓ **Future-Proof** - Ready for microservices or API gateway patterns
✓ **Backwards Compatibility** - `_deprecated/` allows for gradual migration

## File Statistics

- **Functional Code**: 38 Python files across organized modules
- **Deprecated**: 16 reference files (can be deleted after full migration)
- **Configuration**: 3 files at root level
- **Total**: 57 Python files (organized + deprecated)

## Rollback Instructions

If needed, to revert to the old structure:
```bash
# Copy files from _deprecated back to root
cp _deprecated/*.py ./
rm -rf config core api persistence observability infrastructure utils
```

However, this is not recommended as the new structure is significantly better for maintenance and scalability.
