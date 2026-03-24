# Gunicorn configuration for Sevora Hub
# Can be run with: gunicorn -c gunicorn.conf.py server:app

import multiprocessing

# Bind to port 8001
bind = "0.0.0.0:8001"

# Use uvicorn workers for async support
worker_class = "uvicorn.workers.UvicornWorker"

# Number of workers
workers = multiprocessing.cpu_count() * 2 + 1

# Timeout
timeout = 120

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
