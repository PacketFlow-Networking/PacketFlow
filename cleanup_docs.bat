@echo off
echo Cleaning up outdated documentation files...
echo.

REM Remove root-level outdated docs
del "ARCHITECTURE_SPRINT1.md" 2>nul
del "ARCHITECTURE.md" 2>nul
del "DOCUMENTATION_INDEX.md" 2>nul
del "FILE_INVENTORY.md" 2>nul
del "FIXES_AND_NEXT_STEPS.md" 2>nul
del "IMPLEMENTATION_GUIDE.md" 2>nul
del "IMPLEMENTATION_SUMMARY.md" 2>nul
del "LAUNCH_READY.md" 2>nul
del "PAYLOAD_CAPTURE.md" 2>nul
del "PROJECT_COMPLETE.md" 2>nul
del "QUICKSTART.md" 2>nul
del "QUICKSTART_FIX.md" 2>nul
del "QUICKSTART_SPRINT1.md" 2>nul
del "SPRINT1_CHECKLIST.md" 2>nul
del "SPRINT1_README.md" 2>nul
del "SPRINT1_REPORT.md" 2>nul
del "SPRINT1_SUMMARY.md" 2>nul
del "START_HERE.md" 2>nul
del "SYSTEM_STATUS.md" 2>nul
del "VISUAL_SUMMARY.md" 2>nul
del "AINetUI_Proposal.docx" 2>nul

REM Remove backend outdated docs
del "backend\COMPARISON.md" 2>nul
del "backend\DEPLOYMENT.md" 2>nul
del "backend\IMPROVEMENTS.md" 2>nul
del "backend\PCAP_GUIDE.md" 2>nul
del "backend\SAMPLE_OUTPUT.md" 2>nul
del "backend\SUMMARY.md" 2>nul

REM Remove frontend outdated docs
del "frontend\GRAPH_IMPLEMENTATION.md" 2>nul
del "frontend\GRAPH_VISUAL_GUIDE.md" 2>nul

echo.
echo Cleanup complete!
echo.
echo Remaining documentation:
echo - README.md (root)
echo - backend\README.md
echo - frontend\README.md
echo.
pause
