@echo off
setlocal
cd /d "%~dp0"
if exist "D:\New Folder\node.exe" set "PATH=D:\New Folder;%PATH%"
where node >nul 2>&1 || (echo Node.js not found. Install Node.js LTS. & pause & exit /b 1)
where npm >nul 2>&1 || (echo npm not found. & pause & exit /b 1)
call npm install
if errorlevel 1 (echo npm install failed. & pause & exit /b 1)
call npm run dist:win
if errorlevel 1 (echo Packaging failed. & pause & exit /b 1)
echo Build completed. Check dist folder.
explorer "%~dp0dist"
pause
