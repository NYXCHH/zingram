@echo off
echo ========================================
echo   Деплой Zingram на Railway
echo ========================================
echo.

echo Шаг 1: Проверка Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Git не установлен!
    echo Скачай с https://git-scm.com/download/win
    pause
    exit /b 1
)
echo [OK] Git установлен

echo.
echo Шаг 2: Инициализация Git репозитория...
if not exist .git (
    git init
    git add .
    git commit -m "Initial commit - Zingram messenger"
    echo [OK] Git репозиторий создан
) else (
    echo [OK] Git репозиторий уже существует
)

echo.
echo Шаг 3: Установка Railway CLI...
npm list -g @railway/cli >nul 2>&1
if errorlevel 1 (
    echo Устанавливаю Railway CLI...
    npm install -g @railway/cli
)
echo [OK] Railway CLI готов

echo.
echo Шаг 4: Вход в Railway...
echo Откроется браузер для входа...
railway login

echo.
echo Шаг 5: Создание проекта...
railway init

echo.
echo Шаг 6: Деплой...
railway up

echo.
echo ========================================
echo   ГОТОВО!
echo ========================================
echo.
echo Получи ссылку на свой мессенджер:
railway domain

echo.
echo Отправь эту ссылку другу!
echo.
pause
