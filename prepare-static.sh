#!/usr/bin/env bash
set -e
rm -rf backend/src/main/resources/static
mkdir -p backend/src/main/resources/static
cp -R frontend/* backend/src/main/resources/static/
echo "Frontend copied into backend/src/main/resources/static"
