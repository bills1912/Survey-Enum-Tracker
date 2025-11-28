#!/bin/bash
cd /app/backend
python -c "
from db_web_viewer import app
import uvicorn
uvicorn.run(app, host='0.0.0.0', port=8003)
"
