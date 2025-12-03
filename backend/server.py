from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Request, Query, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
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
import uuid

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

class DeviceInfo(BaseModel):
    device_model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    device_id: Optional[str] = None
    is_device_rooted: bool = False
    is_emulator: bool = False
    is_mock_location_enabled: bool = False
    
    class Config:
        extra = "ignore" # Mengabaikan field tambahan jika ada perbedaan versi

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
    device_info: Optional[DeviceInfo] = None

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
    geojson_path: Optional[str] = None
    geojson_filter_field: Optional[str] = None
    geojson_filter_field: Optional[str] = None

class SurveyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    region_level: str
    region_name: str
    supervisor_ids: List[str] = []
    enumerator_ids: List[str] = []
    geojson_path: Optional[str] = None
    geojson_filter_field: Optional[str] = None

class RespondentLocation(BaseModel):
    latitude: float
    longitude: float

class Respondent(BaseModel):
    id: Optional[str] = None
    name: str
    phone: str
    address: str
    location: RespondentLocation
    status: str = SurveyStatus.PENDING
    survey_id: str  # Link to survey
    enumerator_id: Optional[str] = None
    assigned_by: Optional[str] = None
    survey_data: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    region_code: str

class RespondentCreate(BaseModel):
    name: str
    phone: str
    address: str
    location: RespondentLocation
    survey_id: str
    enumerator_id: Optional[str] = None
    region_code: str

class RespondentUpdate(BaseModel):
    status: Optional[str] = None
    survey_data: Optional[Dict[str, Any]] = None
    enumerator_id: Optional[str] = None
    
    class Config:
        # Allow any status value without strict validation
        extra = "forbid"

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

class Wilkerstat(BaseModel):
    id: Optional[str] = None
    name: str
    filter_field: str
    uploadedAt: datetime = Field(default_factory=datetime.utcnow)

class WilkerstatUpdate(BaseModel):
    name: Optional[str] = None
    # alias="filterField" memungkinkan frontend mengirim JSON key "filterField"
    filterField: Optional[str] = None
    filter_field: Optional[str] = None 

    class Config:
        allow_population_by_field_name = True

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
        token_id: str = payload.get("jti") # Ambil ID dari token user
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        current_db_token = user.get("current_token_id")
        if current_db_token and token_id != current_db_token:
             raise HTTPException(
                 status_code=401, 
                 detail="Session expired. You have logged in on another device."
             )
        
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
    # 1. Cek User & Password
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    new_token_id = str(uuid.uuid4())

    fields_to_set = {
        "last_login_at": datetime.utcnow(),
        "current_token_id": new_token_id 
    }

    if credentials.device_info:
        fields_to_set["last_device_info"] = credentials.device_info.dict()
        
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": fields_to_set}
    )
    
    access_token = create_access_token(data={
        "sub": user_id, 
        "jti": new_token_id 
    })
    
    # 7. Bersihkan objek user sebelum dikembalikan
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

@api_router.post("/auth/device-sync")
async def sync_device_info(
    device_info: DeviceInfo,
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint khusus untuk Auto-login.
    Memperbarui data device tanpa perlu login ulang (hanya butuh Token).
    """
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "last_active_at": datetime.utcnow(), # Menandakan user aktif sekarang
            "last_device_info": device_info.dict()
        }}
    )
    
    # Opsional: Log history jika perlu
    # await db.users.update_one(...)
    
    return {"status": "synced", "device": device_info.device_model}

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

@api_router.post("/wilkerstats/upload")
async def upload_wilkerstat(
    file: UploadFile = File(...),
    name: str = Form(...),
    filter_field: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload GeoJSON file dan simpan ke database.
    Hanya Admin dan Supervisor yang boleh upload.
    """
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Validasi ekstensi file
    if not file.filename.endswith(('.json', '.geojson')):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be JSON or GeoJSON.")

    try:
        # Baca isi file
        content = await file.read()
        geojson_data = json.loads(content.decode("utf-8"))

        # Validasi dasar GeoJSON
        if geojson_data.get("type") != "FeatureCollection" or not geojson_data.get("features"):
             raise HTTPException(status_code=400, detail="Invalid GeoJSON format")

        # Siapkan dokumen untuk disimpan
        wilkerstat_doc = {
            "name": name,
            "filter_field": filter_field,
            "uploadedAt": datetime.utcnow(),
            "uploadedBy": current_user["id"],
            "geojson": geojson_data  # Simpan seluruh data peta di sini
        }

        result = await db.wilkerstats.insert_one(wilkerstat_doc)
        
        return {
            "success": True, 
            "id": str(result.inserted_id), 
            "message": "Wilkerstat uploaded successfully"
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file content")
    except Exception as e:
        logging.error(f"Error uploading wilkerstat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.get("/wilkerstats", response_model=List[Wilkerstat])
async def get_wilkerstats(current_user: dict = Depends(get_current_user)):
    """
    Ambil daftar Wilkerstat.
    PENTING: Kita menggunakan projection {"geojson": 0} agar tidak meload 
    data peta yang besar saat hanya menampilkan daftar tabel.
    """
    wilkerstats = await db.wilkerstats.find({}, {"geojson": 0}).sort("uploadedAt", -1).to_list(1000)
    return [serialize_doc(w) for w in wilkerstats]

@api_router.get("/wilkerstats/{wilkerstat_id}/geojson")
async def get_wilkerstat_geojson(wilkerstat_id: str, current_user: dict = Depends(get_current_user)):
    """
    Endpoint khusus untuk mengambil data map (GeoJSON) secara penuh
    Digunakan saat peta akan dirender di frontend.
    """
    wilkerstat = await db.wilkerstats.find_one({"_id": ObjectId(wilkerstat_id)})
    if not wilkerstat:
        raise HTTPException(status_code=404, detail="Wilkerstat not found")
    
    return wilkerstat.get("geojson", {})

@api_router.put("/wilkerstats/{wilkerstat_id}")
async def update_wilkerstat(
    wilkerstat_id: str, 
    update_data: WilkerstatUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """
    Update metadata Wilkerstat (Nama dan Filter Field).
    """
    # 1. Cek Permission
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Permission denied")

    # 2. Debugging: Print data yang diterima server di terminal
    print(f"DEBUG: Menerima update untuk ID {wilkerstat_id}")
    print(f"DEBUG: Data Raw: {update_data}")

    # 3. Manual Mapping (Cara Paling Aman)
    # Kita susun manual dictionary untuk MongoDB agar key-nya pasti benar ("filter_field")
    # dan tidak tergantungan pada setting alias Pydantic.
    update_query = {}
    
    if update_data.name:
        update_query["name"] = update_data.name

    incoming_filter = update_data.filterField or update_data.filter_field
    if update_data.filter_field:
        update_query["filter_field"] = incoming_filter

    # Jika tidak ada data yang valid untuk diupdate
    if not update_query:
        raise HTTPException(status_code=400, detail="No valid data provided for update")

    print(f"DEBUG: Query MongoDB: {update_query}")

    # 4. Eksekusi Update
    try:
        result = await db.wilkerstats.update_one(
            {"_id": ObjectId(wilkerstat_id)},
            {"$set": update_query}
        )
        
        # Cek apakah ID ditemukan
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Wilkerstat not found")

        # 5. Ambil data terbaru (tanpa geojson agar respon cepat)
        updated_wilkerstat = await db.wilkerstats.find_one(
            {"_id": ObjectId(wilkerstat_id)}, 
            {"geojson": 0} 
        )

        return serialize_doc(updated_wilkerstat)
        
    except Exception as e:
        print(f"ERROR Update: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@api_router.delete("/wilkerstats/{wilkerstat_id}")
async def delete_wilkerstat(wilkerstat_id: str, current_user: dict = Depends(get_current_user)):
    """Hapus data wilkerstat"""
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.wilkerstats.delete_one({"_id": ObjectId(wilkerstat_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Wilkerstat not found")
        
    return {"success": True, "message": "Wilkerstat deleted"}

# Bulk upload and assignment endpoints
class BulkUserData(BaseModel):
    location: str
    supervisor_email: str
    enumerator_email: str

class BulkUploadRequest(BaseModel):
    survey_id: str
    users: List[BulkUserData]

class AssignmentRequest(BaseModel):
    survey_id: str
    supervisor_ids: List[str]
    enumerator_ids: List[str]

@api_router.post("/surveys/{survey_id}/bulk-upload")
async def bulk_upload_users(survey_id: str, data: BulkUploadRequest, current_user: dict = Depends(get_current_user)):
    """Bulk upload supervisors and enumerators for a survey"""
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Only admins and supervisors can bulk upload")
    
    created_users = []
    errors = []
    
    for idx, user_data in enumerate(data.users):
        try:
            # Create supervisor if doesn't exist
            supervisor = await db.users.find_one({"email": user_data.supervisor_email})
            if not supervisor:
                supervisor_doc = {
                    "username": user_data.supervisor_email.split('@')[0],
                    "email": user_data.supervisor_email,
                    "password": get_password_hash("password123"),  # Default password
                    "role": UserRole.SUPERVISOR,
                    "created_at": datetime.utcnow()
                }
                result = await db.users.insert_one(supervisor_doc)
                supervisor_id = str(result.inserted_id)
                created_users.append({"email": user_data.supervisor_email, "role": "supervisor", "id": supervisor_id})
            else:
                supervisor_id = str(supervisor["_id"])
            
            # Create enumerator if doesn't exist
            enumerator = await db.users.find_one({"email": user_data.enumerator_email})
            if not enumerator:
                enumerator_doc = {
                    "username": user_data.enumerator_email.split('@')[0],
                    "email": user_data.enumerator_email,
                    "password": get_password_hash("password123"),  # Default password
                    "role": UserRole.ENUMERATOR,
                    "supervisor_id": supervisor_id,
                    "created_at": datetime.utcnow()
                }
                result = await db.users.insert_one(enumerator_doc)
                enumerator_id = str(result.inserted_id)
                created_users.append({"email": user_data.enumerator_email, "role": "enumerator", "id": enumerator_id})
            else:
                enumerator_id = str(enumerator["_id"])
                # Update supervisor assignment
                await db.users.update_one(
                    {"_id": ObjectId(enumerator_id)},
                    {"$set": {"supervisor_id": supervisor_id}}
                )
            
            # Add to survey
            await db.surveys.update_one(
                {"_id": ObjectId(survey_id)},
                {
                    "$addToSet": {
                        "supervisor_ids": supervisor_id,
                        "enumerator_ids": enumerator_id
                    }
                }
            )
            
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})
    
    return {
        "success": True,
        "created_users": created_users,
        "errors": errors,
        "message": f"Created {len(created_users)} users with {len(errors)} errors"
    }

@api_router.post("/surveys/{survey_id}/assign")
async def assign_users_to_survey(survey_id: str, data: AssignmentRequest, current_user: dict = Depends(get_current_user)):
    """Manually assign existing users to a survey"""
    if current_user["role"] not in [UserRole.ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Only admins and supervisors can assign users")
    
    # Update survey with assigned users
    await db.surveys.update_one(
        {"_id": ObjectId(survey_id)},
        {
            "$addToSet": {
                "supervisor_ids": {"$each": data.supervisor_ids},
                "enumerator_ids": {"$each": data.enumerator_ids}
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Assigned {len(data.supervisor_ids)} supervisors and {len(data.enumerator_ids)} enumerators"
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
    message_dict["_id"] = result.inserted_id
    
    # Serialize the document to convert ObjectId to string
    serialized_message = serialize_doc(message_dict)
    
    # Notify receiver if supervisor message
    if message.message_type == MessageType.SUPERVISOR and message.receiver_id:
        await manager.send_personal_message({
            "type": "new_message",
            "data": serialized_message
        }, message.receiver_id)
    
    return serialized_message

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

# Serve web dashboard through API router
@api_router.get("/web-dashboard")
async def serve_dashboard():
    dashboard_path = Path(__file__).parent.parent / "web-dashboard" / "index.html"
    if not dashboard_path.exists():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return FileResponse(dashboard_path, media_type="text/html")

# Public endpoints for web dashboard (no authentication required)
@api_router.get("/public/dashboard-stats")
async def get_public_dashboard_stats():
    """Public endpoint for leadership dashboard - no auth required"""
    try:
        total_respondents = await db.respondents.count_documents({})
        pending = await db.respondents.count_documents({"status": SurveyStatus.PENDING})
        in_progress = await db.respondents.count_documents({"status": SurveyStatus.IN_PROGRESS})
        completed = await db.respondents.count_documents({"status": SurveyStatus.COMPLETED})
        
        # Count active enumerators (those with recent location updates)
        five_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
        active_locations = await db.locations.distinct("user_id", {"timestamp": {"$gte": five_minutes_ago}})
        total_enumerators = await db.users.count_documents({"role": UserRole.ENUMERATOR})
        
        return {
            "total_respondents": total_respondents,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "active_enumerators": len(active_locations),
            "total_enumerators": total_enumerators
        }
    except Exception as e:
        logger.error(f"Error fetching public dashboard stats: {e}")
        return {
            "total_respondents": 0,
            "pending": 0,
            "in_progress": 0,
            "completed": 0,
            "active_enumerators": 0,
            "total_enumerators": 0
        }

@api_router.get("/public/respondents")
async def get_public_respondents():
    """Public endpoint for leadership dashboard - no auth required"""
    try:
        respondents = await db.respondents.find({}).to_list(1000)
        return [serialize_doc(r) for r in respondents]
    except Exception as e:
        logger.error(f"Error fetching public respondents: {e}")
        return []

@api_router.get("/public/locations")
async def get_public_locations():
    """Public endpoint for leadership dashboard - no auth required"""
    try:
        pipeline = [
            {"$sort": {"timestamp": -1}},
            {"$group": {
                "_id": "$user_id",
                "latest": {"$first": "$$ROOT"}
            }},
            {"$replaceRoot": {"newRoot": "$latest"}}
        ]
        locations = await db.locations.aggregate(pipeline).to_list(1000)
        return [serialize_doc(loc) for loc in locations]
    except Exception as e:
        logger.error(f"Error fetching public locations: {e}")
        return []

@api_router.get("/public/surveys")
async def get_public_surveys():
    """Public endpoint for leadership dashboard - no auth required"""
    try:
        surveys = await db.surveys.find({}).to_list(1000)
        return [serialize_doc(s) for s in surveys]
    except Exception as e:
        logger.error(f"Error fetching public surveys: {e}")
        return []

# Database Web Viewer Endpoint - must be before include_router
@app.get("/database-viewer", response_class=HTMLResponse)
async def database_viewer():
    """Simple web interface for database viewing"""
    return """
<!DOCTYPE html>
<html>
<head>
    <title>Database Viewer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: #2196F3; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin: 10px; display: inline-block; min-width: 200px; }
        .stat-value { font-size: 36px; font-weight: bold; }
        .stat-label { font-size: 14px; opacity: 0.9; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto; }
        .btn { background: #2196F3; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #1976D2; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Field Tracker Database</h1>
            <p>Database Viewer</p>
        </div>
        <div class="content">
            <h2>Quick Stats</h2>
            <div id="stats">Loading...</div>
            
            <h2 style="margin-top: 30px;">Collections</h2>
            <button class="btn" onclick="loadCollection('users')">Users</button>
            <button class="btn" onclick="loadCollection('surveys')">Surveys</button>
            <button class="btn" onclick="loadCollection('respondents')">Respondents</button>
            <button class="btn" onclick="loadCollection('locations')">Locations</button>
            <button class="btn" onclick="loadCollection('messages')">Messages</button>
            <button class="btn" onclick="loadCollection('faqs')">FAQs</button>
            
            <div id="data" style="margin-top: 20px;"></div>
        </div>
    </div>
    
    <script>
        async function loadStats() {
            const res = await fetch('/api/database/stats');
            const data = await res.json();
            document.getElementById('stats').innerHTML = `
                <div class="stat-card"><div class="stat-value">${data.users}</div><div class="stat-label">Users</div></div>
                <div class="stat-card"><div class="stat-value">${data.surveys}</div><div class="stat-label">Surveys</div></div>
                <div class="stat-card"><div class="stat-value">${data.respondents}</div><div class="stat-label">Respondents</div></div>
                <div class="stat-card"><div class="stat-value">${data.locations}</div><div class="stat-label">Locations</div></div>
            `;
        }
        
        async function loadCollection(name) {
            document.getElementById('data').innerHTML = '<p>Loading...</p>';
            const res = await fetch('/api/database/collection/' + name);
            const data = await res.json();
            document.getElementById('data').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
        
        loadStats();
    </script>
</body>
</html>
    """

@app.get("/api/database/stats")
async def get_database_stats():
    """Get database statistics"""
    return {
        "users": await db["users"].count_documents({}),
        "surveys": await db["surveys"].count_documents({}),
        "respondents": await db["respondents"].count_documents({}),
        "locations": await db["locations"].count_documents({}),
        "messages": await db["messages"].count_documents({}),
        "faqs": await db["faqs"].count_documents({})
    }

@app.get("/api/database/collection/{collection_name}")
async def get_collection_data(collection_name: str):
    """Get data from a collection"""
    if collection_name not in ["users", "surveys", "respondents", "locations", "messages", "faqs"]:
        raise HTTPException(status_code=400, detail="Invalid collection")
    
    data = await db[collection_name].find().limit(100).to_list(100)
    
    # Convert ObjectId to string
    for item in data:
        if "_id" in item:
            item["_id"] = str(item["_id"])
    
    return data

# Include API router
app.include_router(api_router)

# Add CORS middleware
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
