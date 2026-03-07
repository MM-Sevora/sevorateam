from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum
import qrcode
import io
import base64
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from twilio.rest import Client as TwilioClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'sevora_secret_2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Twilio client
twilio_client = None
try:
    twilio_client = TwilioClient(
        os.environ.get('TWILIO_ACCOUNT_SID'),
        os.environ.get('TWILIO_AUTH_TOKEN')
    )
except Exception:
    pass

# SendGrid client
sg_client = None
try:
    sg_client = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
except Exception:
    pass

app = FastAPI(title="Sevora CRM API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    STYLIST = "stylist"
    SALES = "sales"
    CUSTOMER_EXPERIENCE = "customer_experience"

class LeadSource(str, Enum):
    INSTAGRAM_ADS = "Instagram Ads"
    FACEBOOK_ADS = "Facebook Ads"
    INFLUENCER = "Influencer"
    EVENT = "Event"
    QR_CODE = "QR Code"
    SALON = "Salon"
    WEDDING_PLANNER = "Wedding Planner"
    WEBSITE = "Website"
    APP = "App"
    MALL_ACTIVATION = "Mall Activation"
    RESIDENTIAL_POPUP = "Residential Popup"
    BOUTIQUE = "Boutique Partner"
    HOARDING = "Hoarding"
    WHATSAPP_ADS = "WhatsApp Ads"
    REFERRAL = "Referral"

class PipelineStage(str, Enum):
    NEW_LEAD = "New Lead"
    CONTACTED = "Contacted"
    STYLING_SCHEDULED = "Styling Session Scheduled"
    STYLING_COMPLETED = "Styling Completed"
    TRIAL_SELECTION = "Trial / Selection"
    ORDER_CONFIRMED = "Order Confirmed"
    CLOSED_LOST = "Closed Lost"

class WeddingRole(str, Enum):
    BRIDE = "Bride"
    GROOM = "Groom"
    FAMILY = "Family Member"
    GUEST = "Guest"

class WeddingEvent(str, Enum):
    ENGAGEMENT = "Engagement"
    MEHENDI = "Mehendi"
    HALDI = "Haldi"
    SANGEET = "Sangeet"
    WEDDING = "Wedding"
    RECEPTION = "Reception"

class OutfitCategory(str, Enum):
    SAREE = "Saree"
    LEHENGA = "Lehenga"
    ANARKALI = "Anarkali"
    SHERWANI = "Sherwani"
    SUIT = "Suit"
    INDO_WESTERN = "Indo-Western"
    GOWN = "Gown"
    KURTA_SET = "Kurta Set"

class CampaignType(str, Enum):
    MALL_ACTIVATION = "Mall Activation"
    RESIDENTIAL_POPUP = "Residential Popup"
    WEDDING_EXPO = "Wedding Expo"
    FASHION_EVENT = "Fashion Event"
    SALON_PARTNERSHIP = "Salon Partnership"
    BOUTIQUE_PARTNERSHIP = "Boutique Partnership"
    INFLUENCER_CAMPAIGN = "Influencer Campaign"
    DIGITAL_ADS = "Digital Ads"
    HOARDING = "Hoarding"
    OTHER = "Other"

class CampaignStatus(str, Enum):
    PLANNED = "Planned"
    ACTIVE = "Active"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.SALES
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    phone: Optional[str] = None
    created_at: str

class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    source: LeadSource
    source_details: Optional[str] = None
    occasion: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    campaign_id: Optional[str] = None
    influencer_id: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    stage: Optional[PipelineStage] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    city: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    source: str
    source_details: Optional[str] = None
    stage: str
    occasion: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    influencer_id: Optional[str] = None
    created_at: str
    updated_at: str
    whatsapp_sent: bool = False

# Campaign Models
class CampaignCreate(BaseModel):
    name: str
    campaign_type: CampaignType
    location: Optional[str] = None
    venue: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    budget: Optional[float] = None
    target_leads: Optional[int] = None
    description: Optional[str] = None
    status: CampaignStatus = CampaignStatus.PLANNED

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    venue: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None
    target_leads: Optional[int] = None
    description: Optional[str] = None
    status: Optional[CampaignStatus] = None

class CampaignResponse(BaseModel):
    id: str
    name: str
    campaign_type: str
    location: Optional[str] = None
    venue: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    budget: Optional[float] = None
    target_leads: Optional[int] = None
    description: Optional[str] = None
    status: str
    leads_count: int = 0
    conversions: int = 0
    revenue: float = 0
    created_at: str

class CustomerCreate(BaseModel):
    lead_id: Optional[str] = None
    name: str
    phone: str
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    preferred_styles: List[str] = []
    occasion_type: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    lead_id: Optional[str] = None
    name: str
    phone: str
    email: Optional[str] = None
    city: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    preferred_styles: List[str] = []
    occasion_type: Optional[str] = None
    notes: Optional[str] = None
    journey_history: List[dict] = []
    total_orders: int = 0
    total_spent: float = 0
    created_at: str

class OutfitPlan(BaseModel):
    event: WeddingEvent
    category: OutfitCategory
    budget: int
    style_preference: Optional[str] = None
    notes: Optional[str] = None

class WeddingPlanCreate(BaseModel):
    customer_id: str
    wedding_date: str
    wedding_location: Optional[str] = None
    role: WeddingRole
    events: List[WeddingEvent]
    outfit_plans: List[OutfitPlan] = []
    notes: Optional[str] = None

class WeddingPlanResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    wedding_date: str
    wedding_location: Optional[str] = None
    role: str
    events: List[str]
    outfit_plans: List[dict] = []
    notes: Optional[str] = None
    created_at: str

class QRCodeCreate(BaseModel):
    name: str
    source_type: LeadSource
    campaign: Optional[str] = None
    location: Optional[str] = None

class QRCodeResponse(BaseModel):
    id: str
    name: str
    source_type: str
    campaign: Optional[str] = None
    location: Optional[str] = None
    url: str
    qr_image: str
    scan_count: int = 0
    leads_count: int = 0
    created_at: str

class StylistCreate(BaseModel):
    user_id: str
    specializations: List[str] = []
    experience_years: int = 0
    bio: Optional[str] = None

class StylistResponse(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    specializations: List[str] = []
    experience_years: int = 0
    bio: Optional[str] = None
    leads_assigned: int = 0
    conversions: int = 0
    revenue: float = 0
    created_at: str

class WhatsAppMessage(BaseModel):
    lead_id: str
    template: str = "welcome"

class DashboardStats(BaseModel):
    total_leads: int
    leads_by_source: dict
    leads_by_stage: dict
    conversion_rate: float
    total_customers: int
    total_revenue: float
    leads_today: int
    styling_sessions_scheduled: int
    orders_this_month: int

# Auth helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Background tasks
async def send_whatsapp_message(phone: str, name: str, lead_id: str):
    if not twilio_client:
        logger.warning("Twilio client not configured")
        return
    try:
        message_body = f"Hi {name},\nThanks for connecting with Sevora! Our stylists can help you plan outfits for your upcoming event.\n\nBook a styling session or explore our collection at sevora.com"
        twilio_client.messages.create(
            body=message_body,
            from_=f"whatsapp:{os.environ.get('TWILIO_WHATSAPP_NUMBER', '+14155238886')}",
            to=f"whatsapp:{phone}"
        )
        await db.leads.update_one({"id": lead_id}, {"$set": {"whatsapp_sent": True}})
        logger.info(f"WhatsApp sent to {phone}")
    except Exception as e:
        logger.error(f"WhatsApp error: {e}")

async def send_lead_notification_email(lead_name: str, lead_source: str, assigned_to_email: str):
    if not sg_client:
        logger.warning("SendGrid client not configured")
        return
    try:
        message = Mail(
            from_email=os.environ.get('SENDER_EMAIL', 'noreply@sevora.com'),
            to_emails=assigned_to_email,
            subject=f"New Lead Assigned: {lead_name}",
            html_content=f"""
            <h2>New Lead Assigned to You</h2>
            <p><strong>Name:</strong> {lead_name}</p>
            <p><strong>Source:</strong> {lead_source}</p>
            <p>Please follow up within 24 hours.</p>
            <p>Login to Sevora CRM to view details.</p>
            """
        )
        sg_client.send(message)
        logger.info(f"Email notification sent to {assigned_to_email}")
    except Exception as e:
        logger.error(f"Email error: {e}")

# Auth Routes
@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "role": user.role.value,
        "phone": user.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_doc["id"], user_doc["role"])
    return {"token": token, "user": {k: v for k, v in user_doc.items() if k not in ["password", "_id"]}}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password"}}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# Users/Stylists Routes
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.post("/stylists", response_model=StylistResponse)
async def create_stylist(stylist: StylistCreate, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": stylist.user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    stylist_doc = {
        "id": str(uuid.uuid4()),
        "user_id": stylist.user_id,
        "specializations": stylist.specializations,
        "experience_years": stylist.experience_years,
        "bio": stylist.bio,
        "leads_assigned": 0,
        "conversions": 0,
        "revenue": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.stylists.insert_one(stylist_doc)
    return StylistResponse(**{**stylist_doc, "name": user["name"], "email": user["email"]})

@api_router.get("/stylists", response_model=List[StylistResponse])
async def get_stylists(current_user: dict = Depends(get_current_user)):
    stylists = await db.stylists.find({}, {"_id": 0}).to_list(1000)
    result = []
    for s in stylists:
        user = await db.users.find_one({"id": s["user_id"]}, {"_id": 0, "password": 0})
        if user:
            result.append(StylistResponse(**{**s, "name": user["name"], "email": user["email"]}))
    return result

# Lead Routes
@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, background_tasks: BackgroundTasks, qr_code_id: Optional[str] = None):
    # Get campaign name if campaign_id provided
    campaign_name = None
    if lead.campaign_id:
        campaign = await db.campaigns.find_one({"id": lead.campaign_id}, {"_id": 0})
        if campaign:
            campaign_name = campaign.get("name")
    
    lead_doc = {
        "id": str(uuid.uuid4()),
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "source": lead.source.value,
        "source_details": lead.source_details,
        "stage": PipelineStage.NEW_LEAD.value,
        "occasion": lead.occasion,
        "city": lead.city,
        "notes": lead.notes,
        "campaign_id": lead.campaign_id,
        "campaign_name": campaign_name,
        "influencer_id": lead.influencer_id,
        "assigned_to": None,
        "assigned_to_name": None,
        "qr_code_id": qr_code_id,
        "whatsapp_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leads.insert_one(lead_doc)
    
    # Update QR code stats if applicable
    if qr_code_id:
        await db.qrcodes.update_one({"id": qr_code_id}, {"$inc": {"leads_count": 1}})
    
    # Send WhatsApp welcome message
    if lead.phone:
        background_tasks.add_task(send_whatsapp_message, lead.phone, lead.name, lead_doc["id"])
    
    return LeadResponse(**{k: v for k, v in lead_doc.items() if k != "_id"})

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    source: Optional[str] = None,
    stage: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if source:
        query["source"] = source
    if stage:
        query["stage"] = stage
    if assigned_to:
        query["assigned_to"] = assigned_to
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [LeadResponse(**lead) for lead in leads]

@api_router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse(**lead)

@api_router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, update: LeadUpdate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle stage change
    if update.stage:
        update_data["stage"] = update.stage.value
    
    # Handle assignment
    if update.assigned_to:
        user = await db.users.find_one({"id": update.assigned_to}, {"_id": 0, "password": 0})
        if user:
            update_data["assigned_to_name"] = user["name"]
            await db.stylists.update_one({"user_id": update.assigned_to}, {"$inc": {"leads_assigned": 1}})
            background_tasks.add_task(send_lead_notification_email, lead["name"], lead["source"], user["email"])
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return LeadResponse(**updated)

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}

# Customer Routes
@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer_doc = {
        "id": str(uuid.uuid4()),
        "lead_id": customer.lead_id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "city": customer.city,
        "budget_min": customer.budget_min,
        "budget_max": customer.budget_max,
        "preferred_styles": customer.preferred_styles,
        "occasion_type": customer.occasion_type,
        "notes": customer.notes,
        "journey_history": [],
        "total_orders": 0,
        "total_spent": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer_doc)
    return CustomerResponse(**{k: v for k, v in customer_doc.items() if k != "_id"})

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [CustomerResponse(**c) for c in customers]

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse(**customer)

@api_router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, update: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    await db.customers.update_one({"id": customer_id}, {"$set": update_data})
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return CustomerResponse(**updated)

@api_router.post("/customers/{customer_id}/journey")
async def add_journey_entry(customer_id: str, entry: dict, current_user: dict = Depends(get_current_user)):
    entry["timestamp"] = datetime.now(timezone.utc).isoformat()
    await db.customers.update_one({"id": customer_id}, {"$push": {"journey_history": entry}})
    return {"message": "Journey entry added"}

# Wedding Plan Routes
@api_router.post("/wedding-plans", response_model=WeddingPlanResponse)
async def create_wedding_plan(plan: WeddingPlanCreate, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": plan.customer_id}, {"_id": 0})
    plan_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": plan.customer_id,
        "customer_name": customer["name"] if customer else None,
        "wedding_date": plan.wedding_date,
        "wedding_location": plan.wedding_location,
        "role": plan.role.value,
        "events": [e.value for e in plan.events],
        "outfit_plans": [op.model_dump() for op in plan.outfit_plans],
        "notes": plan.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wedding_plans.insert_one(plan_doc)
    return WeddingPlanResponse(**{k: v for k, v in plan_doc.items() if k != "_id"})

@api_router.get("/wedding-plans", response_model=List[WeddingPlanResponse])
async def get_wedding_plans(customer_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    plans = await db.wedding_plans.find(query, {"_id": 0}).sort("wedding_date", 1).to_list(1000)
    return [WeddingPlanResponse(**p) for p in plans]

@api_router.get("/wedding-plans/{plan_id}", response_model=WeddingPlanResponse)
async def get_wedding_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    plan = await db.wedding_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Wedding plan not found")
    return WeddingPlanResponse(**plan)

@api_router.put("/wedding-plans/{plan_id}", response_model=WeddingPlanResponse)
async def update_wedding_plan(plan_id: str, update: WeddingPlanCreate, current_user: dict = Depends(get_current_user)):
    plan = await db.wedding_plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Wedding plan not found")
    
    update_data = {
        "wedding_date": update.wedding_date,
        "wedding_location": update.wedding_location,
        "role": update.role.value,
        "events": [e.value for e in update.events],
        "outfit_plans": [op.model_dump() for op in update.outfit_plans],
        "notes": update.notes
    }
    await db.wedding_plans.update_one({"id": plan_id}, {"$set": update_data})
    updated = await db.wedding_plans.find_one({"id": plan_id}, {"_id": 0})
    return WeddingPlanResponse(**updated)

# Campaign Routes
@api_router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(campaign: CampaignCreate, current_user: dict = Depends(get_current_user)):
    campaign_doc = {
        "id": str(uuid.uuid4()),
        "name": campaign.name,
        "campaign_type": campaign.campaign_type.value,
        "location": campaign.location,
        "venue": campaign.venue,
        "start_date": campaign.start_date,
        "end_date": campaign.end_date,
        "budget": campaign.budget,
        "target_leads": campaign.target_leads,
        "description": campaign.description,
        "status": campaign.status.value,
        "leads_count": 0,
        "conversions": 0,
        "revenue": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.campaigns.insert_one(campaign_doc)
    return CampaignResponse(**{k: v for k, v in campaign_doc.items() if k != "_id"})

@api_router.get("/campaigns", response_model=List[CampaignResponse])
async def get_campaigns(
    status: Optional[str] = None,
    campaign_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if campaign_type:
        query["campaign_type"] = campaign_type
    
    campaigns = await db.campaigns.find(query, {"_id": 0}).sort("start_date", -1).to_list(1000)
    
    # Update leads count and conversions for each campaign
    result = []
    for c in campaigns:
        leads_count = await db.leads.count_documents({"campaign_id": c["id"]})
        conversions = await db.leads.count_documents({"campaign_id": c["id"], "stage": "Order Confirmed"})
        c["leads_count"] = leads_count
        c["conversions"] = conversions
        result.append(CampaignResponse(**c))
    
    return result

@api_router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get real-time stats
    leads_count = await db.leads.count_documents({"campaign_id": campaign_id})
    conversions = await db.leads.count_documents({"campaign_id": campaign_id, "stage": "Order Confirmed"})
    campaign["leads_count"] = leads_count
    campaign["conversions"] = conversions
    
    return CampaignResponse(**campaign)

@api_router.put("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(campaign_id: str, update: CampaignUpdate, current_user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].value if hasattr(update_data["status"], 'value') else update_data["status"]
    
    await db.campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    updated = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    
    # Get real-time stats
    leads_count = await db.leads.count_documents({"campaign_id": campaign_id})
    conversions = await db.leads.count_documents({"campaign_id": campaign_id, "stage": "Order Confirmed"})
    updated["leads_count"] = leads_count
    updated["conversions"] = conversions
    
    return CampaignResponse(**updated)

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}

# QR Code Routes
@api_router.post("/qrcodes", response_model=QRCodeResponse)
async def create_qrcode(qr: QRCodeCreate, current_user: dict = Depends(get_current_user)):
    qr_id = str(uuid.uuid4())
    frontend_url = os.environ.get('FRONTEND_URL', 'https://style-leads.preview.emergentagent.com')
    lead_url = f"{frontend_url}/capture?qr={qr_id}&source={qr.source_type.value}"
    
    # Generate QR code image
    qr_img = qrcode.QRCode(version=1, box_size=10, border=5)
    qr_img.add_data(lead_url)
    qr_img.make(fit=True)
    img = qr_img.make_image(fill_color="#064E3B", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    qr_doc = {
        "id": qr_id,
        "name": qr.name,
        "source_type": qr.source_type.value,
        "campaign": qr.campaign,
        "location": qr.location,
        "url": lead_url,
        "qr_image": f"data:image/png;base64,{qr_base64}",
        "scan_count": 0,
        "leads_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.qrcodes.insert_one(qr_doc)
    return QRCodeResponse(**{k: v for k, v in qr_doc.items() if k != "_id"})

@api_router.get("/qrcodes", response_model=List[QRCodeResponse])
async def get_qrcodes(current_user: dict = Depends(get_current_user)):
    qrcodes = await db.qrcodes.find({}, {"_id": 0}).to_list(1000)
    return [QRCodeResponse(**q) for q in qrcodes]

@api_router.get("/qrcodes/{qr_id}", response_model=QRCodeResponse)
async def get_qrcode(qr_id: str):
    qr = await db.qrcodes.find_one({"id": qr_id}, {"_id": 0})
    if not qr:
        raise HTTPException(status_code=404, detail="QR code not found")
    # Increment scan count
    await db.qrcodes.update_one({"id": qr_id}, {"$inc": {"scan_count": 1}})
    return QRCodeResponse(**qr)

# WhatsApp Routes
@api_router.post("/whatsapp/send")
async def send_whatsapp(message: WhatsAppMessage, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": message.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    background_tasks.add_task(send_whatsapp_message, lead["phone"], lead["name"], lead["id"])
    return {"message": "WhatsApp message queued"}

# Dashboard/Analytics Routes
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_leads = await db.leads.count_documents({})
    total_customers = await db.customers.count_documents({})
    
    # Leads by source
    pipeline_source = [{"$group": {"_id": "$source", "count": {"$sum": 1}}}]
    source_results = await db.leads.aggregate(pipeline_source).to_list(100)
    leads_by_source = {r["_id"]: r["count"] for r in source_results}
    
    # Leads by stage
    pipeline_stage = [{"$group": {"_id": "$stage", "count": {"$sum": 1}}}]
    stage_results = await db.leads.aggregate(pipeline_stage).to_list(100)
    leads_by_stage = {r["_id"]: r["count"] for r in stage_results}
    
    # Conversion rate
    confirmed = leads_by_stage.get(PipelineStage.ORDER_CONFIRMED.value, 0)
    conversion_rate = (confirmed / total_leads * 100) if total_leads > 0 else 0
    
    # Today's leads
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    leads_today = await db.leads.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    
    # Styling sessions scheduled
    styling_scheduled = leads_by_stage.get(PipelineStage.STYLING_SCHEDULED.value, 0)
    
    # Orders this month
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    orders_this_month = await db.leads.count_documents({
        "stage": PipelineStage.ORDER_CONFIRMED.value,
        "updated_at": {"$gte": month_start.isoformat()}
    })
    
    # Total revenue (sum from customers)
    revenue_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total_spent"}}}]
    revenue_result = await db.customers.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return DashboardStats(
        total_leads=total_leads,
        leads_by_source=leads_by_source,
        leads_by_stage=leads_by_stage,
        conversion_rate=round(conversion_rate, 2),
        total_customers=total_customers,
        total_revenue=total_revenue,
        leads_today=leads_today,
        styling_sessions_scheduled=styling_scheduled,
        orders_this_month=orders_this_month
    )

@api_router.get("/dashboard/channel-performance")
async def get_channel_performance(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {
            "_id": "$source",
            "leads": {"$sum": 1},
            "contacted": {"$sum": {"$cond": [{"$ne": ["$stage", PipelineStage.NEW_LEAD.value]}, 1, 0]}},
            "converted": {"$sum": {"$cond": [{"$eq": ["$stage", PipelineStage.ORDER_CONFIRMED.value]}, 1, 0]}}
        }},
        {"$sort": {"leads": -1}}
    ]
    results = await db.leads.aggregate(pipeline).to_list(100)
    return [{"source": r["_id"], "leads": r["leads"], "contacted": r["contacted"], "converted": r["converted"]} for r in results]

@api_router.get("/dashboard/stylist-performance")
async def get_stylist_performance(current_user: dict = Depends(get_current_user)):
    stylists = await db.stylists.find({}, {"_id": 0}).to_list(100)
    result = []
    for s in stylists:
        user = await db.users.find_one({"id": s["user_id"]}, {"_id": 0, "password": 0})
        if user:
            assigned = await db.leads.count_documents({"assigned_to": s["user_id"]})
            converted = await db.leads.count_documents({"assigned_to": s["user_id"], "stage": PipelineStage.ORDER_CONFIRMED.value})
            result.append({
                "id": s["id"],
                "name": user["name"],
                "assigned": assigned,
                "converted": converted,
                "conversion_rate": round((converted / assigned * 100) if assigned > 0 else 0, 2)
            })
    return result

# Public lead capture endpoint (no auth required)
@api_router.post("/public/lead", response_model=LeadResponse)
async def capture_public_lead(lead: LeadCreate, background_tasks: BackgroundTasks, qr_code_id: Optional[str] = None):
    return await create_lead(lead, background_tasks, qr_code_id)

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "sevora-crm"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
