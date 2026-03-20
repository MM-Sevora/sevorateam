"""
Fallback entry point for starting the server.
Usage: python -m backend or python backend/__main__.py
"""
import subprocess
import sys

def main():
    # Ensure uvicorn is installed
    try:
        import uvicorn
    except ImportError:
        print("Installing uvicorn...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "uvicorn[standard]==0.29.0"])
        import uvicorn
    
    # Import and run the app
    from server import app
    uvicorn.run(app, host="0.0.0.0", port=8001)

if __name__ == "__main__":
    main()
