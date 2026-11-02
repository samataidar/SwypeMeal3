#!/usr/bin/env bash
# Build script for Render.com
set -o errexit

cd backend
pip install --upgrade pip
pip install -r requirements.txt
