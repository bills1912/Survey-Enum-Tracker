from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import google.generativeai as genai
from bson import ObjectId
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Gemini AI Configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()

# Models
class UserRole:
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    ENUMERATOR = "enumerator"

class User(BaseModel):
    id: Optional[str] = None
    username: str
    email: str
    password: Optional[str] = None
    role: str
    supervisor_id: Optional[str] = None
    team_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str
    supervisor_id: Optional[str] = None
    team_id: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class SurveyStatus:
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class Survey(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    region_level: str  # regency, provincial, national
    region_name: str
    supervisor_ids: List[str] = []
    enumerator_ids: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class SurveyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    region_level: str
    region_name: str
    supervisor_ids: List[str] = []
    enumerator_ids: List[str] = []

class RespondentLocation(BaseModel):
    latitude: float
    longitude: float

class Respondent(BaseModel):
    id: Optional[str] = None
    name: str
    location: RespondentLocation
    status: str = SurveyStatus.PENDING
    survey_id: str  # Link to survey
    enumerator_id: Optional[str] = None
    assigned_by: Optional[str] = None
    survey_data: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class RespondentCreate(BaseModel):
    name: str
    location: RespondentLocation
    enumerator_id: Optional[str] = None

class RespondentUpdate(BaseModel):
    status: Optional[str] = None
    survey_data: Optional[Dict[str, Any]] = None
    enumerator_id: Optional[str] = None

class LocationTracking(BaseModel):
    id: Optional[str] = None
    user_id: str
    latitude: float
    longitude: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_synced: bool = True

class LocationTrackingCreate(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    timestamp: Optional[datetime] = None

class LocationTrackingBatch(BaseModel):
    locations: List[LocationTrackingCreate]

class MessageType:
    AI = "ai"
    SUPERVISOR = "supervisor"

class Message(BaseModel):
    id: Optional[str] = None
    sender_id: str
    receiver_id: Optional[str] = None
    message_type: str
    content: str
    response: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_synced: bool = True
    answered: bool = False

class MessageCreate(BaseModel):
    receiver_id: Optional[str] = None
    message_type: str
    content: str

class MessageBatch(BaseModel):
    messages: List[Dict[str, Any]]

class FAQItem(BaseModel):
    id: Optional[str] = None
    question: str
    answer: str
    category: str = "general"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DashboardStats(BaseModel):
    total_respondents: int
    pending: int
    in_progress: int
    completed: int
    active_enumerators: int
    total_enumerators: int

# Helper functions
def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        user["id"] = str(user["_id"])
        del user["_id"]
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def serialize_doc(doc):
    if not doc:
        return doc
    
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    
    if isinstance(doc, dict):
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        
        # Handle nested ObjectIds
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                doc[key] = str(value)
            elif isinstance(value, dict):
                doc[key] = serialize_doc(value)
            elif isinstance(value, list):
                doc[key] = [serialize_doc(item) if isinstance(item, dict) else str(item) if isinstance(item, ObjectId) else item for item in value]
    
    return doc

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user_dict = user_data.dict()
    user_dict["password"] = hashed_password
    user_dict["created_at"] = datetime.utcnow()
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    
    user_dict["id"] = user_id
    del user_dict["password"]
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id})
    
    user["id"] = user_id
    del user["_id"]
    del user["password"]
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# User routes
@api_router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    # Role-based filtering
    query = {}
    if current_user["role"] == UserRole.SUPERVISOR:
        query = {"supervisor_id": current_user["id"]}
    elif current_user["role"] == UserRole.ENUMERATOR:
        return [current_user]
    
    users = await db.users.find(query).to_list(1000)
    return [serialize_doc(user) for user in users]

@api_router.get("/users/enumerators")
async def get_enumerators(current_user: dict = Depends(get_current_user)):
    query = {"role": UserRole.ENUMERATOR}
    if current_user["role"] == UserRole.SUPERVISOR:
        query["supervisor_id"] = current_user["id"]
    
    enumerators = await db.users.find(query).to_list(1000)
    return [serialize_doc(user) for user in enumerators]

# Survey routes
@api_router.post("/surveys", response_model=Survey)
async def create_survey(survey: SurveyCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Only admins and supervisors can create surveys")
    
    survey_dict = survey.dict()
    survey_dict["created_by"] = current_user["id"]
    survey_dict["created_at"] = datetime.utcnow()
    survey_dict["is_active"] = True
    
    result = await db.surveys.insert_one(survey_dict)
    survey_dict["id"] = str(result.inserted_id)
    
    return survey_dict

@api_router.get("/surveys")
async def get_surveys(current_user: dict = Depends(get_current_user)):
    query = {"is_active": True}
    
    if current_user["role"] == UserRole.SUPERVISOR:
        query["supervisor_ids"] = current_user["id"]
    elif current_user["role"] == UserRole.ENUMERATOR:
        query["enumerator_ids"] = current_user["id"]
    
    surveys = await db.surveys.find(query).to_list(1000)
    return [serialize_doc(s) for s in surveys]

@api_router.get("/surveys/{survey_id}")
async def get_survey(survey_id: str, current_user: dict = Depends(get_current_user)):
    survey = await db.surveys.find_one({"_id": ObjectId(survey_id)})
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return serialize_doc(survey)

@api_router.put("/surveys/{survey_id}")
async def update_survey(survey_id: str, survey_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Only admins and supervisors can update surveys")
    
    result = await db.surveys.update_one(
        {"_id": ObjectId(survey_id)},
        {"$set": survey_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    survey = await db.surveys.find_one({"_id": ObjectId(survey_id)})
    return serialize_doc(survey)

# Respondent routes
@api_router.post("/respondents", response_model=Respondent)
async def create_respondent(respondent: RespondentCreate, current_user: dict = Depends(get_current_user)):
    respondent_dict = respondent.dict()
    respondent_dict["status"] = SurveyStatus.PENDING
    respondent_dict["assigned_by"] = current_user["id"]
    respondent_dict["created_at"] = datetime.utcnow()
    respondent_dict["updated_at"] = datetime.utcnow()
    
    result = await db.respondents.insert_one(respondent_dict)
    respondent_dict["id"] = str(result.inserted_id)
    
    return respondent_dict

@api_router.get("/respondents")
async def get_respondents(survey_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if survey_id:
        query["survey_id"] = survey_id
        
    if current_user["role"] == UserRole.ENUMERATOR:
        query["enumerator_id"] = current_user["id"]
    elif current_user["role"] == UserRole.SUPERVISOR:
        # Get enumerators under this supervisor
        enumerators = await db.users.find({"supervisor_id": current_user["id"]}).to_list(1000)
        enumerator_ids = [str(e["_id"]) for e in enumerators]
        query["enumerator_id"] = {"$in": enumerator_ids}
    
    respondents = await db.respondents.find(query).to_list(1000)
    return [serialize_doc(r) for r in respondents]

@api_router.get("/surveys/{survey_id}/stats")
async def get_survey_stats(survey_id: str, current_user: dict = Depends(get_current_user)):
    query = {"survey_id": survey_id}
    
    if current_user["role"] == UserRole.ENUMERATOR:
        query["enumerator_id"] = current_user["id"]
    elif current_user["role"] == UserRole.SUPERVISOR:
        enumerators = await db.users.find({"supervisor_id": current_user["id"]}).to_list(1000)
        enumerator_ids = [str(e["_id"]) for e in enumerators]
        query["enumerator_id"] = {"$in": enumerator_ids}
    
    total = await db.respondents.count_documents(query)
    pending = await db.respondents.count_documents({**query, "status": "pending"})
    in_progress = await db.respondents.count_documents({**query, "status": "in_progress"})
    completed = await db.respondents.count_documents({**query, "status": "completed"})
    
    return {
        "survey_id": survey_id,
        "total_respondents": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "completion_rate": round((completed / total * 100) if total > 0 else 0, 2)
    }

@api_router.get("/respondents/{respondent_id}")
async def get_respondent(respondent_id: str, current_user: dict = Depends(get_current_user)):
    respondent = await db.respondents.find_one({"_id": ObjectId(respondent_id)})
    if not respondent:
        raise HTTPException(status_code=404, detail="Respondent not found")
    return serialize_doc(respondent)

@api_router.put("/respondents/{respondent_id}")
async def update_respondent(respondent_id: str, update_data: RespondentUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.respondents.update_one(
        {"_id": ObjectId(respondent_id)},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Respondent not found")
    
    respondent = await db.respondents.find_one({"_id": ObjectId(respondent_id)})
    
    # Broadcast update to connected clients
    await manager.broadcast({
        "type": "respondent_update",
        "data": serialize_doc(respondent)
    })
    
    return serialize_doc(respondent)

# Location tracking routes
@api_router.post("/locations")
async def create_location(location: LocationTrackingCreate, current_user: dict = Depends(get_current_user)):
    location_dict = location.dict()
    if not location_dict.get("timestamp"):
        location_dict["timestamp"] = datetime.utcnow()
    location_dict["is_synced"] = True
    
    result = await db.locations.insert_one(location_dict)
    location_dict["id"] = str(result.inserted_id)
    
    # Serialize for response
    serialized_location = serialize_doc(location_dict.copy())
    
    # Broadcast location update
    await manager.broadcast({
        "type": "location_update",
        "data": serialized_location
    })
    
    return serialized_location

@api_router.post("/locations/batch")
async def create_locations_batch(batch: LocationTrackingBatch, current_user: dict = Depends(get_current_user)):
    locations = []
    for loc in batch.locations:
        loc_dict = loc.dict()
        if not loc_dict.get("timestamp"):
            loc_dict["timestamp"] = datetime.utcnow()
        loc_dict["is_synced"] = True
        locations.append(loc_dict)
    
    if locations:
        result = await db.locations.insert_many(locations)
        for i, inserted_id in enumerate(result.inserted_ids):
            locations[i]["id"] = str(inserted_id)
    
    return {"success": True, "count": len(locations)}

@api_router.get("/locations")
async def get_locations(user_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    elif current_user["role"] == UserRole.ENUMERATOR:
        query["user_id"] = current_user["id"]
    elif current_user["role"] == UserRole.SUPERVISOR:
        enumerators = await db.users.find({"supervisor_id": current_user["id"]}).to_list(1000)
        enumerator_ids = [str(e["_id"]) for e in enumerators]
        query["user_id"] = {"$in": enumerator_ids}
    
    locations = await db.locations.find(query).sort("timestamp", -1).to_list(1000)
    return [serialize_doc(loc) for loc in locations]

@api_router.get("/locations/latest")
async def get_latest_locations(current_user: dict = Depends(get_current_user)):
    """Get latest location for each user"""
    pipeline = [
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$user_id",
            "latest_location": {"$first": "$$ROOT"}
        }}
    ]
    
    # Apply role-based filtering
    if current_user["role"] == UserRole.SUPERVISOR:
        enumerators = await db.users.find({"supervisor_id": current_user["id"]}).to_list(1000)
        enumerator_ids = [str(e["_id"]) for e in enumerators]
        pipeline.insert(0, {"$match": {"user_id": {"$in": enumerator_ids}}})
    elif current_user["role"] == UserRole.ENUMERATOR:
        pipeline.insert(0, {"$match": {"user_id": current_user["id"]}})
    
    result = await db.locations.aggregate(pipeline).to_list(1000)
    locations = [serialize_doc(item["latest_location"]) for item in result]
    return locations

# Message/Chat routes
@api_router.post("/messages")
async def create_message(message: MessageCreate, current_user: dict = Depends(get_current_user)):
    message_dict = message.dict()
    message_dict["sender_id"] = current_user["id"]
    message_dict["timestamp"] = datetime.utcnow()
    message_dict["is_synced"] = True
    message_dict["answered"] = False
    
    # If it's an AI message, get response from Gemini
    if message.message_type == MessageType.AI and GEMINI_API_KEY:
        try:
            # Context for field data collection
            context = """You are an AI assistant helping field enumerators with data collection issues.
Only answer questions related to:
- Field data collection procedures
- Survey questionnaire guidance
- Technical issues with the app
- Data entry best practices
- Location/GPS troubleshooting

If the question is not related to field data collection, politely decline to answer."""
            
            prompt = f"{context}\n\nQuestion: {message.content}\n\nAnswer:"
            response = model.generate_content(prompt)
            message_dict["response"] = response.text
            message_dict["answered"] = True
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            message_dict["response"] = "Sorry, I'm unable to process your question at the moment. Please try again later."
    
    result = await db.messages.insert_one(message_dict)
    message_dict["id"] = str(result.inserted_id)
    
    # Notify receiver if supervisor message
    if message.message_type == MessageType.SUPERVISOR and message.receiver_id:
        await manager.send_personal_message({
            "type": "new_message",
            "data": message_dict
        }, message.receiver_id)
    
    return message_dict

@api_router.post("/messages/batch")
async def create_messages_batch(batch: MessageBatch, current_user: dict = Depends(get_current_user)):
    messages = []
    for msg in batch.messages:
        msg["timestamp"] = datetime.fromisoformat(msg["timestamp"]) if isinstance(msg.get("timestamp"), str) else msg.get("timestamp", datetime.utcnow())
        msg["is_synced"] = True
        messages.append(msg)
    
    if messages:
        result = await db.messages.insert_many(messages)
        for i, inserted_id in enumerate(result.inserted_ids):
            messages[i]["id"] = str(inserted_id)
    
    return {"success": True, "count": len(messages)}

@api_router.get("/messages")
async def get_messages(message_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {
        "$or": [
            {"sender_id": current_user["id"]},
            {"receiver_id": current_user["id"]}
        ]
    }
    
    if message_type:
        query["message_type"] = message_type
    
    messages = await db.messages.find(query).sort("timestamp", -1).to_list(1000)
    return [serialize_doc(msg) for msg in messages]

@api_router.put("/messages/{message_id}/respond")
async def respond_to_message(message_id: str, response: Dict[str, str], current_user: dict = Depends(get_current_user)):
    """Supervisor responds to enumerator message"""
    result = await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"response": response["response"], "answered": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message = await db.messages.find_one({"_id": ObjectId(message_id)})
    msg_data = serialize_doc(message)
    
    # Notify sender
    await manager.send_personal_message({
        "type": "message_response",
        "data": msg_data
    }, msg_data["sender_id"])
    
    return msg_data

# FAQ routes
@api_router.get("/faqs")
async def get_faqs():
    faqs = await db.faqs.find().to_list(1000)
    return [serialize_doc(faq) for faq in faqs]

@api_router.post("/faqs")
async def create_faq(faq: FAQItem, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create FAQs")
    
    faq_dict = faq.dict()
    faq_dict["created_at"] = datetime.utcnow()
    
    result = await db.faqs.insert_one(faq_dict)
    faq_dict["id"] = str(result.inserted_id)
    
    return serialize_doc(faq_dict)

# Dashboard stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    query = {}
    user_query = {}
    
    if current_user["role"] == UserRole.SUPERVISOR:
        enumerators = await db.users.find({"supervisor_id": current_user["id"]}).to_list(1000)
        enumerator_ids = [str(e["_id"]) for e in enumerators]
        query["enumerator_id"] = {"$in": enumerator_ids}
        user_query["supervisor_id"] = current_user["id"]
    elif current_user["role"] == UserRole.ENUMERATOR:
        query["enumerator_id"] = current_user["id"]
    
    total_respondents = await db.respondents.count_documents(query)
    pending = await db.respondents.count_documents({**query, "status": SurveyStatus.PENDING})
    in_progress = await db.respondents.count_documents({**query, "status": SurveyStatus.IN_PROGRESS})
    completed = await db.respondents.count_documents({**query, "status": SurveyStatus.COMPLETED})
    
    # Count active enumerators (those with recent location updates)
    five_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
    active_locations = await db.locations.distinct("user_id", {"timestamp": {"$gte": five_minutes_ago}})
    
    if current_user["role"] == UserRole.ADMIN:
        total_enumerators = await db.users.count_documents({"role": UserRole.ENUMERATOR})
    elif current_user["role"] == UserRole.SUPERVISOR:
        total_enumerators = len(enumerator_ids) if enumerator_ids else 0
    else:
        total_enumerators = 1
    
    return {
        "total_respondents": total_respondents,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "active_enumerators": len(active_locations),
        "total_enumerators": total_enumerators
    }

# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# Health check
@api_router.get("/")
async def root():
    return {"message": "Field Data Collection API", "status": "online"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
