@echo off
title Launch Pixel 7 Emulator
echo ==============================================
echo Launching Pixel 7 Android Emulator with GUI...
echo ==============================================
start "" "%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" -avd Pixel_7
echo Emulator launched. Waiting for device...
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" wait-for-device
echo Connecting Expo app...
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081"
echo Done!
pause
