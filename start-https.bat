@echo off
echo Starting HTTPS development servers...
echo.

echo Starting backend HTTPS server on port 5000...
start "Backend HTTPS Server" cmd /k "cd server && npm start"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Vite dev server with HTTPS on port 3000...
start "Vite HTTPS Dev Server" cmd /k "npm run start:https"

echo.
echo Development servers are starting...
echo Frontend (Vite): https://localhost:3000
echo Backend API: https://localhost:5000
echo.
echo Vite will proxy /api requests to the backend server
echo.
echo You can now access the app from your phone using your computer's IP address:
echo https://[YOUR-IP]:3000
echo.
echo Press any key to exit...
pause > nul 