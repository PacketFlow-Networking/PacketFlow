# 📚 Documentation Structure

**Last Updated**: November 2025  
**Status**: Consolidated and reorganized for single source of truth

---

## Overview

PacketFlow documentation has been consolidated into a clear hierarchy with a single authoritative source (README.md) and archived historical documents for reference.

---

## Main Documentation

### 📄 README.md (Root)
**Location**: `/README.md`  
**Purpose**: Primary documentation - comprehensive guide for all users  
**Content**:
- System concept and overview
- Architecture and technology stack
- Quick start guide (backend, frontend, AI)
- Configuration guide
- All features (security monitoring, AI intelligence, IUI, incident management, alerts)
- Data sources (mock, PCAP, live)
- Development guide
- Security considerations
- Use cases
- Performance characteristics
- Troubleshooting

**Audience**: Everyone - developers, analysts, researchers, new users

---

## Backend Documentation

### 📄 backend/README.md
**Location**: `/backend/README.md`  
**Purpose**: Backend-specific architecture and development guide  
**Content**:
- 7-tier architecture explanation
- Module descriptions
- Running the backend
- Configuration options
- Database setup
- Development patterns and conventions

**Audience**: Backend developers

### 📄 backend/BACKEND_BUG_REPORT.md
**Location**: `/backend/BACKEND_BUG_REPORT.md`  
**Purpose**: Complete record of bugs identified and fixed  
**Content**:
- 25 bugs categorized by severity and type
- Detailed descriptions of issues
- Implemented fixes
- File paths and line numbers
- Status tracking (✅ FIXED)
- Testing recommendations

**Audience**: QA, maintainers, auditors

---

## Frontend Documentation

### 📄 frontend/README.md
**Location**: `/frontend/README.md`  
**Purpose**: Frontend-specific guide and component reference  
**Content**:
- Component organization
- State management (Zustand store)
- WebSocket integration
- Tailwind CSS customization
- Building and deployment

**Audience**: Frontend developers

### 📄 frontend/IUI_PHASE1_COMPLETE.md
**Location**: `/frontend/IUI_PHASE1_COMPLETE.md`  
**Purpose**: Intelligent User Interface Phase 1 feature documentation  
**Content**:
- Proactive suggestions system
- Event feedback mechanism
- User profile and adaptive learning
- Glossary and contextual help
- Keyboard shortcuts implementation
- User metrics and tracking

**Audience**: UI/UX designers, frontend developers, product managers

---

## Developer Reference

### 📄 .github/copilot-instructions.md
**Location**: `/.github/copilot-instructions.md`  
**Purpose**: Developer guidelines and architectural patterns  
**Content**:
- Project overview for AI assistants
- Critical workflows (running full stack, testing)
- Data flow architecture
- Backend patterns (config, logging, error handling, queues)
- Frontend patterns (TypeScript, Zustand, components, memory management)
- Flow condenser (anomaly detection) brain
- Integration points and API formats
- Common pitfalls and solutions
- Key files for common tasks
- Testing patterns
- Documentation index

**Audience**: Developers using AI assistance, maintainers

---

## Archived Documentation

### 📁 docs/archived/
**Location**: `/docs/archived/`  
**Purpose**: Historical documentation and consolidated materials  
**Files**:

#### PROJECT_DESCRIPTION_ARCHIVED.md
- Original project description (consolidated into README.md)
- Contains duplicate information with updated PacketFlow naming
- Kept for reference and historical tracking

#### PROTOCOL_PIE_CHART_ARCHIVED.md
- Feature documentation for protocol visualization enhancement
- Functionality now integrated into standard StatsDashboard
- Kept for understanding feature development history

#### README_OLD_AINETUI.md
- Old README with "AINetUI" naming
- Superseded by current README.md with "PacketFlow" naming
- Archived for version control and history

---

## Documentation Changes Summary

### ✅ Completed Consolidation (November 2025)

| Document | Status | Reason |
|----------|--------|--------|
| `README.md` | ✅ Updated | Unified into comprehensive primary doc |
| `project_Description.md` | ✅ Archived | Merged into README.md |
| `PROTOCOL_PIE_CHART_UPDATE.md` | ✅ Archived | Feature complete, merged into README.md |
| `README_OLD.md` | ✅ Archived | Old AINetUI version, moved to `docs/archived/` |
| All docs | ✅ Renamed | "AINetUI" → "PacketFlow" throughout |

---

## Quick Navigation

### 🚀 Getting Started
→ See **README.md** § Quick Start

### 🛠️ Development
→ See **.github/copilot-instructions.md** § Critical Workflows

### 🔧 Backend Development
→ See **backend/README.md**

### ⚛️ Frontend Development
→ See **frontend/README.md**

### 📊 Bug Tracking
→ See **backend/BACKEND_BUG_REPORT.md**

### 🎨 UI Features
→ See **frontend/IUI_PHASE1_COMPLETE.md**

---

## Documentation Maintenance

### Adding New Documentation
1. Determine if it belongs in:
   - **README.md** - General/user-facing content
   - **backend/README.md** - Backend-specific
   - **frontend/README.md** - Frontend-specific
   - **.github/copilot-instructions.md** - Developer patterns
   - **docs/archived/** - Historical reference

2. Update the **Documentation Index** in README.md
3. Update this file if creating new sections

### Deprecating Documentation
1. Mark as **ARCHIVED** with consolidation note
2. Move to `docs/archived/` with clear naming
3. Add link to replacement documentation
4. Keep for historical reference

### Naming Conventions
- Use **PacketFlow** (not AINetUI) in all new documentation
- Use **✅ FIXED** emoji in bug reports for completion tracking
- Use **section headers** with emoji for visual scanning (📄, 🔧, ⚛️, etc.)

---

## Related Files

- **docker-compose.yml** - Deployment configuration
- **Dockerfile** - Container build
- **.github/** - GitHub-specific files (actions, instructions)

---

## Questions?

- 📖 Start with **README.md** for general questions
- 👨‍💻 Check **.github/copilot-instructions.md** for development patterns
- 🐛 See **backend/BACKEND_BUG_REPORT.md** for known issues
- 📁 Browse **docs/archived/** for historical context
