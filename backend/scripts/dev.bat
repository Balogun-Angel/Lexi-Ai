@echo off
REM Stable backend server (no auto-reload). Use while testing the app.
cd /d "%~dp0.."
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
uvicorn app.main:app --host 127.0.0.1 --port 8000
