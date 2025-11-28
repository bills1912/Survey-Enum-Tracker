"""
Database Web Viewer
Simple web interface to view MongoDB data
"""
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime

app = FastAPI(title="Database Viewer")

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "field_tracker_db")
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, datetime):
        return doc.isoformat()
    else:
        return doc

@app.get("/", response_class=HTMLResponse)
async def home():
    """Main page with database viewer"""
    html = """
<!DOCTYPE html>
<html>
<head>
    <title>Field Tracker - Database Viewer</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
            font-size: 16px;
        }
        .nav {
            display: flex;
            background: #f5f5f5;
            border-bottom: 2px solid #e0e0e0;
            overflow-x: auto;
        }
        .nav-item {
            padding: 15px 25px;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
            white-space: nowrap;
            font-weight: 500;
        }
        .nav-item:hover {
            background: #e8e8e8;
        }
        .nav-item.active {
            background: white;
            border-bottom-color: #2196F3;
            color: #2196F3;
        }
        .content {
            padding: 30px;
            min-height: 500px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        .stat-label {
            font-size: 14px;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .table-container {
            overflow-x: auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background: #2196F3;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        tr:hover {
            background: #f5f5f5;
        }
        .loading {
            text-align: center;
            padding: 50px;
            color: #666;
            font-size: 18px;
        }
        .loading::after {
            content: '...';
            animation: dots 1.5s steps(3, end) infinite;
        }
        @keyframes dots {
            0%, 20% { content: '.'; }
            40% { content: '..'; }
            60%, 100% { content: '...'; }
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-success { background: #4CAF50; color: white; }
        .badge-warning { background: #FF9800; color: white; }
        .badge-danger { background: #F44336; color: white; }
        .badge-info { background: #2196F3; color: white; }
        .search-box {
            margin-bottom: 20px;
            padding: 12px;
            width: 100%;
            max-width: 400px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        .search-box:focus {
            outline: none;
            border-color: #2196F3;
        }
        .export-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin-left: 10px;
            transition: background 0.3s;
        }
        .export-btn:hover {
            background: #388E3C;
        }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 12px;
            line-height: 1.6;
        }
        .error {
            background: #ffebee;
            color: #c62828;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Field Tracker Database</h1>
            <p>Real-time Database Viewer</p>
        </div>
        
        <div class="nav">
            <div class="nav-item active" onclick="loadView('stats')">📈 Statistics</div>
            <div class="nav-item" onclick="loadView('users')">👥 Users</div>
            <div class="nav-item" onclick="loadView('surveys')">📋 Surveys</div>
            <div class="nav-item" onclick="loadView('respondents')">👤 Respondents</div>
            <div class="nav-item" onclick="loadView('locations')">📍 Locations</div>
            <div class="nav-item" onclick="loadView('messages')">💬 Messages</div>
            <div class="nav-item" onclick="loadView('faqs')">❓ FAQs</div>
        </div>
        
        <div class="content" id="content">
            <div class="loading">Loading data</div>
        </div>
    </div>

    <script>
        let currentView = 'stats';
        
        async function loadView(view) {
            currentView = view;
            
            // Update nav
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Load content
            document.getElementById('content').innerHTML = '<div class="loading">Loading data</div>';
            
            try {
                const response = await fetch('/api/view/' + view);
                const html = await response.text();
                document.getElementById('content').innerHTML = html;
            } catch (error) {
                document.getElementById('content').innerHTML = 
                    '<div class="error">Error loading data: ' + error.message + '</div>';
            }
        }
        
        async function exportData(collection) {
            try {
                const response = await fetch('/api/export/' + collection);
                const data = await response.json();
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = collection + '_export_' + new Date().toISOString().split('T')[0] + '.json';
                a.click();
                window.URL.revokeObjectURL(url);
            } catch (error) {
                alert('Export failed: ' + error.message);
            }
        }
        
        function searchTable(inputId) {
            const input = document.getElementById(inputId);
            const filter = input.value.toUpperCase();
            const table = input.parentElement.nextElementSibling.querySelector('table');
            const tr = table.getElementsByTagName('tr');
            
            for (let i = 1; i < tr.length; i++) {
                let display = false;
                const td = tr[i].getElementsByTagName('td');
                
                for (let j = 0; j < td.length; j++) {
                    if (td[j]) {
                        const txtValue = td[j].textContent || td[j].innerText;
                        if (txtValue.toUpperCase().indexOf(filter) > -1) {
                            display = true;
                            break;
                        }
                    }
                }
                
                tr[i].style.display = display ? '' : 'none';
            }
        }
        
        // Load initial view
        window.onload = () => loadView('stats');
    </script>
</body>
</html>
    """
    return html

@app.get("/api/view/{collection}")
async def view_collection(collection: str):
    """Get HTML view for a collection"""
    try:
        if collection == "stats":
            return await get_stats_view()
        elif collection == "users":
            return await get_users_view()
        elif collection == "surveys":
            return await get_surveys_view()
        elif collection == "respondents":
            return await get_respondents_view()
        elif collection == "locations":
            return await get_locations_view()
        elif collection == "messages":
            return await get_messages_view()
        elif collection == "faqs":
            return await get_faqs_view()
        else:
            return HTMLResponse("<div class='error'>Collection not found</div>")
    except Exception as e:
        return HTMLResponse(f"<div class='error'>Error: {str(e)}</div>")

async def get_stats_view():
    """Statistics view"""
    users_count = db.users.count_documents({})
    surveys_count = db.surveys.count_documents({})
    respondents_count = db.respondents.count_documents({})
    locations_count = db.locations.count_documents({})
    messages_count = db.messages.count_documents({})
    faqs_count = db.faqs.count_documents({})
    
    # Respondents by status
    resp_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    resp_stats = list(db.respondents.aggregate(resp_pipeline))
    
    # Users by role
    user_pipeline = [{"$group": {"_id": "$role", "count": {"$sum": 1}}}]
    user_stats = list(db.users.aggregate(user_pipeline))
    
    html = f"""
    <div class="stats">
        <div class="stat-card">
            <div class="stat-label">Total Users</div>
            <div class="stat-value">{users_count}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Surveys</div>
            <div class="stat-value">{surveys_count}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Respondents</div>
            <div class="stat-value">{respondents_count}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Locations</div>
            <div class="stat-value">{locations_count}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Messages</div>
            <div class="stat-value">{messages_count}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total FAQs</div>
            <div class="stat-value">{faqs_count}</div>
        </div>
    </div>
    
    <h2 style="margin-top: 30px; margin-bottom: 15px;">Respondents by Status</h2>
    <div class="table-container">
        <table>
            <tr><th>Status</th><th>Count</th></tr>
            {"".join([f'<tr><td>{stat["_id"]}</td><td>{stat["count"]}</td></tr>' for stat in resp_stats])}
        </table>
    </div>
    
    <h2 style="margin-top: 30px; margin-bottom: 15px;">Users by Role</h2>
    <div class="table-container">
        <table>
            <tr><th>Role</th><th>Count</th></tr>
            {"".join([f'<tr><td>{stat["_id"]}</td><td>{stat["count"]}</td></tr>' for stat in user_stats])}
        </table>
    </div>
    """
    return HTMLResponse(html)

async def get_users_view():
    """Users view"""
    users = list(db.users.find().limit(100))
    
    html = """
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <input type="text" id="searchInput" class="search-box" placeholder="Search users..." onkeyup="searchTable('searchInput')">
        <button class="export-btn" onclick="exportData('users')">📥 Export JSON</button>
    </div>
    <div class="table-container">
        <table>
            <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
                <th>Created</th>
            </tr>
    """
    
    for user in users:
        is_active = user.get('is_active', True)
        status_badge = '<span class="badge badge-success">Active</span>' if is_active else '<span class="badge badge-danger">Inactive</span>'
        created = user.get('created_at', 'N/A')
        
        html += f"""
            <tr>
                <td>{user.get('username', 'N/A')}</td>
                <td>{user.get('email', 'N/A')}</td>
                <td><span class="badge badge-info">{user.get('role', 'N/A')}</span></td>
                <td>{status_badge}</td>
                <td>{created}</td>
            </tr>
        """
    
    html += """
        </table>
    </div>
    """
    return HTMLResponse(html)

async def get_surveys_view():
    """Surveys view"""
    surveys = list(db.surveys.find().limit(100))
    
    html = """
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <input type="text" id="searchInput" class="search-box" placeholder="Search surveys..." onkeyup="searchTable('searchInput')">
        <button class="export-btn" onclick="exportData('surveys')">📥 Export JSON</button>
    </div>
    <div class="table-container">
        <table>
            <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Target</th>
            </tr>
    """
    
    for survey in surveys:
        html += f"""
            <tr>
                <td><strong>{survey.get('title', 'N/A')}</strong></td>
                <td>{survey.get('description', 'N/A')[:100]}...</td>
                <td><span class="badge badge-info">{survey.get('status', 'N/A')}</span></td>
                <td>{survey.get('start_date', 'N/A')}</td>
                <td>{survey.get('end_date', 'N/A')}</td>
                <td>{survey.get('target_respondents', 0)}</td>
            </tr>
        """
    
    html += """
        </table>
    </div>
    """
    return HTMLResponse(html)

async def get_respondents_view():
    """Respondents view"""
    respondents = list(db.respondents.find().limit(100))
    
    html = """
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <input type="text" id="searchInput" class="search-box" placeholder="Search respondents..." onkeyup="searchTable('searchInput')">
        <button class="export-btn" onclick="exportData('respondents')">📥 Export JSON</button>
    </div>
    <div class="table-container">
        <table>
            <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Survey ID</th>
                <th>Location</th>
                <th>Phone</th>
                <th>Created</th>
            </tr>
    """
    
    for resp in respondents:
        status = resp.get('status', 'pending')
        badge_class = 'badge-success' if status == 'completed' else ('badge-warning' if status == 'in_progress' else 'badge-danger')
        
        location = resp.get('location', {})
        lat = location.get('latitude', 'N/A')
        lon = location.get('longitude', 'N/A')
        
        html += f"""
            <tr>
                <td><strong>{resp.get('name', 'N/A')}</strong></td>
                <td><span class="badge {badge_class}">{status}</span></td>
                <td>{str(resp.get('survey_id', 'N/A'))[:12]}...</td>
                <td>{lat}, {lon}</td>
                <td>{resp.get('phone', 'N/A')}</td>
                <td>{resp.get('created_at', 'N/A')}</td>
            </tr>
        """
    
    html += """
        </table>
    </div>
    """
    return HTMLResponse(html)

async def get_locations_view():
    """Locations view"""
    locations = list(db.locations.find().sort("timestamp", -1).limit(100))
    
    html = """
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button class="export-btn" onclick="exportData('locations')">📥 Export JSON</button>
    </div>
    <div class="table-container">
        <table>
            <tr>
                <th>User ID</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Accuracy (m)</th>
                <th>Timestamp</th>
            </tr>
    """
    
    for loc in locations:
        html += f"""
            <tr>
                <td>{str(loc.get('user_id', 'N/A'))[:12]}...</td>
                <td>{loc.get('latitude', 'N/A')}</td>
                <td>{loc.get('longitude', 'N/A')}</td>
                <td>{loc.get('accuracy', 'N/A')}</td>
                <td>{loc.get('timestamp', 'N/A')}</td>
            </tr>
        """
    
    html += """
        </table>
    </div>
    """
    return HTMLResponse(html)

async def get_messages_view():
    """Messages view"""
    messages = list(db.messages.find().sort("timestamp", -1).limit(100))
    
    html = """
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button class="export-btn" onclick="exportData('messages')">📥 Export JSON</button>
    </div>
    <div class="table-container">
        <table>
            <tr>
                <th>Type</th>
                <th>Sender</th>
                <th>Content</th>
                <th>Answered</th>
                <th>Timestamp</th>
            </tr>
    """
    
    for msg in messages:
        msg_type = msg.get('message_type', 'N/A')
        answered = msg.get('answered', False)
        badge = '<span class="badge badge-success">Yes</span>' if answered else '<span class="badge badge-warning">No</span>'
        
        html += f"""
            <tr>
                <td><span class="badge badge-info">{msg_type}</span></td>
                <td>{str(msg.get('sender_id', 'N/A'))[:12]}...</td>
                <td>{msg.get('content', 'N/A')[:100]}...</td>
                <td>{badge}</td>
                <td>{msg.get('timestamp', 'N/A')}</td>
            </tr>
        """
    
    html += """
        </table>
    </div>
    """
    return HTMLResponse(html)

async def get_faqs_view():
    """FAQs view"""
    faqs = list(db.faqs.find())
    
    html = """
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button class="export-btn" onclick="exportData('faqs')">📥 Export JSON</button>
    </div>
    <div class="table-container">
        <table>
            <tr>
                <th>Question</th>
                <th>Answer</th>
                <th>Category</th>
            </tr>
    """
    
    for faq in faqs:
        html += f"""
            <tr>
                <td><strong>{faq.get('question', 'N/A')}</strong></td>
                <td>{faq.get('answer', 'N/A')[:150]}...</td>
                <td><span class="badge badge-info">{faq.get('category', 'N/A')}</span></td>
            </tr>
        """
    
    html += """
        </table>
    </div>
    """
    return HTMLResponse(html)

@app.get("/api/export/{collection}")
async def export_collection(collection: str):
    """Export collection as JSON"""
    try:
        if collection not in ["users", "surveys", "respondents", "locations", "messages", "faqs"]:
            return JSONResponse({"error": "Invalid collection"}, status_code=400)
        
        data = list(db[collection].find().limit(1000))
        serialized_data = [serialize_doc(doc) for doc in data]
        
        return JSONResponse(serialized_data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
