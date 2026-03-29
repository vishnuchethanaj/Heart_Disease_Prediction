# Deploy to Render

## 1. Push latest code to GitHub
Make sure these files are in your repo:
- render.yaml
- requirements.txt
- api/server.py

## 2. Create service from Blueprint
1. Open Render dashboard.
2. Click New + and choose Blueprint.
3. Connect your GitHub repo and select this project.
4. Render will detect render.yaml and create the web service.

## 3. Wait for build and deploy
Render will run:
- Build: `pip install -r requirements.txt`
- Start: `gunicorn --bind 0.0.0.0:$PORT --timeout 600 api.server:app`

## 4. Verify deployment
After deploy finishes, open:
- `/` for the frontend
- `/api/health` for API status

Example:
- https://<your-render-service>.onrender.com/
- https://<your-render-service>.onrender.com/api/health

## 5. If frontend cannot call API
This project uses same-origin API calls (`/api`), so no API URL change is needed when frontend and backend are deployed together.
