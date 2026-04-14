@echo off
setlocal

REM Ports to clear before start
set PORTS=8080 8081 3000 5173

echo == Killing processes on ports: %PORTS%
for %%P in (%PORTS%) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do (
        echo   - port %%P -> pid %%A
        taskkill /F /PID %%A >nul 2>&1
    )
)

echo == Starting Spring Boot (mvnw spring-boot:run) ...
pushd demo
call mvnw spring-boot:run
popd

echo == Server stopped
pause
endlocal
