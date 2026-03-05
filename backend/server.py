import os
import uuid
import base64
import hashlib
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from pymongo import MongoClient
from bson import ObjectId
import random

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
JWT_SECRET = os.environ.get("JWT_SECRET")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# MongoDB setup
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

users_col = db["users"]
platforms_col = db["platforms"]
posts_col = db["posts"]
content_ideas_col = db["content_ideas"]
metrics_col = db["metrics"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed some initial metrics data for demo
    if metrics_col.count_documents({}) == 0:
        seed_demo_metrics()
    yield

app = FastAPI(title="SocialFlow AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== Pydantic Models =====

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class PlatformConnect(BaseModel):
    platform: str  # facebook, instagram, twitter, linkedin, youtube
    page_name: str
    page_url: Optional[str] = ""

class ContentIdeaRequest(BaseModel):
    platform: str
    topic: Optional[str] = ""
    tone: Optional[str] = "professional"

class ContentGenerateRequest(BaseModel):
    platform: str
    topic: str
    tone: Optional[str] = "professional"
    content_type: Optional[str] = "post"  # post, story, reel, article

class ImageGenerateRequest(BaseModel):
    prompt: str
    style: Optional[str] = "modern"

class PostCreate(BaseModel):
    platform: str
    content: str
    image_url: Optional[str] = ""
    scheduled_at: Optional[str] = ""
    status: Optional[str] = "draft"  # draft, scheduled, published

class PostUpdate(BaseModel):
    content: Optional[str] = None
    image_url: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None

# ===== Auth Helpers =====

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== Seed Demo Data =====

def seed_demo_metrics():
    platforms = ["facebook", "instagram", "twitter", "linkedin", "youtube"]
    now = datetime.now(timezone.utc)
    for platform in platforms:
        for i in range(30):
            date = (now - timedelta(days=29 - i)).strftime("%Y-%m-%d")
            metrics_col.insert_one({
                "platform": platform,
                "date": date,
                "followers": random.randint(1000, 50000) + i * random.randint(10, 100),
                "engagement": round(random.uniform(1.5, 8.5), 2),
                "reach": random.randint(5000, 100000),
                "impressions": random.randint(10000, 200000),
                "likes": random.randint(100, 5000),
                "comments": random.randint(10, 500),
                "shares": random.randint(5, 200),
                "clicks": random.randint(50, 2000),
            })

# ===== Auth Routes =====

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    if users_col.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    users_col.insert_one({
        "user_id": user_id,
        "name": req.name,
        "email": req.email,
        "password": hash_password(req.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    token = create_token(user_id, req.email)
    return {"token": token, "user": {"user_id": user_id, "name": req.name, "email": req.email}}

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = users_col.find_one({"email": req.email}, {"_id": 0})
    if not user or user["password"] != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["user_id"], user["email"])
    return {"token": token, "user": {"user_id": user["user_id"], "name": user["name"], "email": user["email"]}}

@app.get("/api/auth/me")
async def get_me(auth: dict = Depends(verify_token)):
    user = users_col.find_one({"user_id": auth["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ===== Dashboard/Metrics Routes =====

@app.get("/api/dashboard/metrics")
async def get_dashboard_metrics(auth: dict = Depends(verify_token)):
    platforms = ["facebook", "instagram", "twitter", "linkedin", "youtube"]
    result = {}
    for p in platforms:
        docs = list(metrics_col.find({"platform": p}, {"_id": 0}).sort("date", -1).limit(30))
        docs.reverse()
        if docs:
            latest = docs[-1]
            prev = docs[-2] if len(docs) > 1 else docs[0]
            result[p] = {
                "current": {
                    "followers": latest.get("followers", 0),
                    "engagement": latest.get("engagement", 0),
                    "reach": latest.get("reach", 0),
                    "impressions": latest.get("impressions", 0),
                    "likes": latest.get("likes", 0),
                    "comments": latest.get("comments", 0),
                    "shares": latest.get("shares", 0),
                },
                "change": {
                    "followers": latest.get("followers", 0) - prev.get("followers", 0),
                    "engagement": round(latest.get("engagement", 0) - prev.get("engagement", 0), 2),
                    "reach": latest.get("reach", 0) - prev.get("reach", 0),
                },
                "history": docs
            }
    total_followers = sum(r["current"]["followers"] for r in result.values())
    total_engagement = round(sum(r["current"]["engagement"] for r in result.values()) / max(len(result), 1), 2)
    total_reach = sum(r["current"]["reach"] for r in result.values())
    total_posts = posts_col.count_documents({})
    return {
        "overview": {
            "total_followers": total_followers,
            "avg_engagement": total_engagement,
            "total_reach": total_reach,
            "total_posts": total_posts,
        },
        "platforms": result,
    }

@app.get("/api/dashboard/summary")
async def get_dashboard_summary(auth: dict = Depends(verify_token)):
    total_posts = posts_col.count_documents({})
    scheduled = posts_col.count_documents({"status": "scheduled"})
    published = posts_col.count_documents({"status": "published"})
    drafts = posts_col.count_documents({"status": "draft"})
    platforms_connected = platforms_col.count_documents({"user_id": auth["user_id"]})
    return {
        "total_posts": total_posts,
        "scheduled": scheduled,
        "published": published,
        "drafts": drafts,
        "platforms_connected": platforms_connected,
    }

# ===== Platform Routes =====

@app.get("/api/platforms")
async def get_platforms(auth: dict = Depends(verify_token)):
    docs = list(platforms_col.find({"user_id": auth["user_id"]}, {"_id": 0}))
    return docs

@app.post("/api/platforms/connect")
async def connect_platform(req: PlatformConnect, auth: dict = Depends(verify_token)):
    existing = platforms_col.find_one({
        "user_id": auth["user_id"],
        "platform": req.platform
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"{req.platform} is already connected")
    platform_id = str(uuid.uuid4())
    doc = {
        "platform_id": platform_id,
        "user_id": auth["user_id"],
        "platform": req.platform,
        "page_name": req.page_name,
        "page_url": req.page_url,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "status": "connected",
    }
    platforms_col.insert_one(doc)
    doc.pop("_id", None)
    return doc

@app.delete("/api/platforms/{platform_id}")
async def disconnect_platform(platform_id: str, auth: dict = Depends(verify_token)):
    result = platforms_col.delete_one({"platform_id": platform_id, "user_id": auth["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Platform not found")
    return {"message": "Platform disconnected"}

# ===== AI Content Routes =====

@app.post("/api/content/ideas")
async def generate_content_ideas(req: ContentIdeaRequest, auth: dict = Depends(verify_token)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    session_id = f"ideas-{auth['user_id']}-{uuid.uuid4()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message="""You are an expert social media strategist. Generate creative, engaging content ideas for social media posts. 
Return exactly 5 content ideas as a JSON array. Each idea should have: title, description, hashtags (array), best_time (string), estimated_engagement (string like 'High', 'Medium').
Return ONLY the JSON array, no markdown formatting or code blocks."""
    )
    chat.with_model("openai", "gpt-5.2")
    
    topic_text = f" about '{req.topic}'" if req.topic else ""
    prompt = f"Generate 5 creative {req.tone} content ideas for {req.platform}{topic_text}. Return as JSON array."
    
    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    
    import json
    try:
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        ideas = json.loads(cleaned)
    except json.JSONDecodeError:
        ideas = [{"title": "Content Idea", "description": response, "hashtags": [], "best_time": "10 AM", "estimated_engagement": "Medium"}]
    
    for idea in ideas:
        idea["platform"] = req.platform
        idea["generated_at"] = datetime.now(timezone.utc).isoformat()
    
    return {"ideas": ideas}

@app.post("/api/content/generate")
async def generate_content(req: ContentGenerateRequest, auth: dict = Depends(verify_token)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    session_id = f"content-{auth['user_id']}-{uuid.uuid4()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=f"""You are an expert social media content creator. Create engaging {req.platform} posts.
Return a JSON object with: content (the post text), hashtags (array), call_to_action (string), image_prompt (a detailed prompt to generate an accompanying image).
Return ONLY the JSON object, no markdown formatting or code blocks."""
    )
    chat.with_model("openai", "gpt-5.2")
    
    prompt = f"Create a {req.tone} {req.content_type} for {req.platform} about: {req.topic}"
    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    
    import json
    try:
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        content = json.loads(cleaned)
    except json.JSONDecodeError:
        content = {"content": response, "hashtags": [], "call_to_action": "", "image_prompt": ""}
    
    return content

@app.post("/api/content/generate-image")
async def generate_image(req: ImageGenerateRequest, auth: dict = Depends(verify_token)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    session_id = f"img-{auth['user_id']}-{uuid.uuid4()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message="You are an AI image generator. Create the requested image."
    )
    chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
    
    enhanced_prompt = f"Create a {req.style} social media image: {req.prompt}. Make it visually striking, professional, and suitable for social media posting."
    msg = UserMessage(text=enhanced_prompt)
    
    text, images = await chat.send_message_multimodal_response(msg)
    
    if images and len(images) > 0:
        image_data = images[0]["data"]
        mime_type = images[0].get("mime_type", "image/png")
        return {
            "image_data": f"data:{mime_type};base64,{image_data}",
            "description": text or "Image generated successfully"
        }
    
    raise HTTPException(status_code=500, detail="Failed to generate image")

# ===== Posts Routes =====

@app.get("/api/posts")
async def get_posts(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    auth: dict = Depends(verify_token)
):
    query = {"user_id": auth["user_id"]}
    if status:
        query["status"] = status
    if platform:
        query["platform"] = platform
    docs = list(posts_col.find(query, {"_id": 0}).sort("created_at", -1))
    return docs

@app.post("/api/posts")
async def create_post(req: PostCreate, auth: dict = Depends(verify_token)):
    post_id = str(uuid.uuid4())
    doc = {
        "post_id": post_id,
        "user_id": auth["user_id"],
        "platform": req.platform,
        "content": req.content,
        "image_url": req.image_url,
        "scheduled_at": req.scheduled_at,
        "status": req.status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "likes": 0,
            "comments": 0,
            "shares": 0,
            "reach": 0,
        }
    }
    posts_col.insert_one(doc)
    doc.pop("_id", None)
    return doc

@app.put("/api/posts/{post_id}")
async def update_post(post_id: str, req: PostUpdate, auth: dict = Depends(verify_token)):
    update_data = {}
    if req.content is not None:
        update_data["content"] = req.content
    if req.image_url is not None:
        update_data["image_url"] = req.image_url
    if req.scheduled_at is not None:
        update_data["scheduled_at"] = req.scheduled_at
    if req.status is not None:
        update_data["status"] = req.status
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = posts_col.update_one(
        {"post_id": post_id, "user_id": auth["user_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    updated = posts_col.find_one({"post_id": post_id}, {"_id": 0})
    return updated

@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str, auth: dict = Depends(verify_token)):
    result = posts_col.delete_one({"post_id": post_id, "user_id": auth["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted"}

@app.post("/api/posts/{post_id}/publish")
async def publish_post(post_id: str, auth: dict = Depends(verify_token)):
    result = posts_col.update_one(
        {"post_id": post_id, "user_id": auth["user_id"]},
        {"$set": {
            "status": "published",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "metrics": {
                "likes": random.randint(50, 500),
                "comments": random.randint(5, 100),
                "shares": random.randint(2, 50),
                "reach": random.randint(500, 10000),
            }
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    updated = posts_col.find_one({"post_id": post_id}, {"_id": 0})
    return updated

# ===== Health Check =====

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "SocialFlow AI"}
