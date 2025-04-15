@echo off
echo ===================================================
echo =        Base64Encoder - Tworzenie pliku EXE      =
echo ===================================================
echo.

:: Sprawdzenie, czy Python jest zainstalowany
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [BLAD] Python nie jest zainstalowany lub nie jest dostepny w PATH.
    echo Pobierz i zainstaluj Python ze strony: https://www.python.org/downloads/
    echo Upewnij sie, ze zaznaczyles opcje "Add Python to PATH" podczas instalacji.
    echo.
    pause
    exit /b 1
)

echo [OK] Python jest zainstalowany.
echo.

:: Sprawdzenie, czy plik .py istnieje
if not exist Base64Encoder.py (
    echo [BLAD] Plik Base64Encoder.py nie istnieje w biezacym katalogu.
    echo Upewnij sie, ze plik istnieje i uruchom skrypt ponownie.
    echo.
    pause
    exit /b 1
)

echo [OK] Znaleziono plik Base64Encoder.py.
echo.

:: Instalacja wymaganych bibliotek
echo Instalowanie wymaganych bibliotek...
pip install pyperclip pyinstaller --quiet
if %errorlevel% neq 0 (
    echo [BLAD] Nie udalo sie zainstalowac wymaganych bibliotek.
    echo.
    pause
    exit /b 1
)
echo [OK] Biblioteki zostaly zainstalowane.
echo.

:: Czyszczenie poprzednich plików kompilacji (jeśli istnieją)
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist Base64Encoder.spec del Base64Encoder.spec
echo [OK] Wyczyszczono poprzednie pliki kompilacji.
echo.

:: Kompilacja do EXE - używa modułu PyInstaller z flagą --noconsole
echo Kompilowanie do pliku EXE...
python -m PyInstaller --onefile --noconsole --clean --name Base64Encoder Base64Encoder.py
if %errorlevel% neq 0 (
    echo [BLAD] Kompilacja nie powiodla sie.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Kompilacja zakonczona pomyslnie!

:: Przenoszenie pliku EXE i czyszczenie
echo Przenoszenie pliku EXE i czyszczenie...

if exist dist\Base64Encoder.exe (
    :: Przenieś plik EXE z folderu dist do katalogu nadrzędnego
    copy dist\Base64Encoder.exe Base64Encoder.exe > nul

    :: Usuń folder dist
    rmdir /s /q dist

    :: Usuń folder build
    if exist build rmdir /s /q build

    :: Usuń plik spec
    if exist Base64Encoder.spec del Base64Encoder.spec

    echo [OK] Plik EXE zostal przeniesiony do biezacego katalogu.
    echo [OK] Tymczasowe pliki zostaly usuniete.
) else (
    echo [BLAD] Nie znaleziono pliku EXE w folderze dist.
)

echo.
echo Nacisnij dowolny klawisz, aby zakonczyc...
pause > nul