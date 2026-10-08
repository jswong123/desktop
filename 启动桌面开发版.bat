@echo off
cd /d "%~dp0"
if exist "D:\New Folder\node.exe" set "PATH=D:\New Folder;%PATH%"
if not exist "node_modules\electron" call npm install
call npm start
pause
