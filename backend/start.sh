#!/bin/bash

# Ensure dependencies are installed
echo "Installing dependencies..."
pip install --quiet uvicorn[standard]==0.29.0 fastapi

# Start the server using python -m uvicorn (works when binary is not in PATH)
echo "Starting FastAPI server..."
python -m uvicorn server:app --host 0.0.0.0 --port 8001
