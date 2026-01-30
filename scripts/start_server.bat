@echo off
chcp 65001 >nul
echo ========================================
echo   启动MAPWAR本地服务器
echo ========================================
echo.
echo 正在启动服务器...
echo.
echo 服务器地址: http://localhost:8000
echo.
echo 测试地图: http://localhost:8000/test_tilemap.html
echo 完整游戏: http://localhost:8000/index.html
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

REM 检查Python是否可用
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 未找到Python，尝试使用完整路径...
    "C:\Users\GAKU\AppData\Local\Programs\Python\Python313\python.exe" -m http.server 8000
) else (
    python -m http.server 8000
)

pause
