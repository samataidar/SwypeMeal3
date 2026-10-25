#!/usr/bin/env bash
# Start script for Render.com
set -o errexit

cd backend
uvicorn main:app --host 0.0.0.0 --port $PORT
