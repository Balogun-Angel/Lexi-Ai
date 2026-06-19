@echo off
REM Backend with hot reload — watches backend\app only (not venv or uploads).
cd /d "%~dp0.."
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir app --reload-exclude "*/__pycache__/*"
