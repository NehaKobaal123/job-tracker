@echo off
if exist backend\src\main\resources\static rmdir /s /q backend\src\main\resources\static
mkdir backend\src\main\resources\static
xcopy /E /I /Y frontend backend\src\main\resources\static
echo Frontend copied into backend\src\main\resources\static
