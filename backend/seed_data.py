"""
Seed Data Script for Sevora Team
Creates demo data for all departments
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone, timedelta
import random
import os
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Sample data
INFLUENCER_NAMES = [
    ("Priya Sharma", "priya_style", "Mumbai", "fashion"),
    ("Rahul Kapoor", "rahul_fits", "Delhi", "fashion"),
    ("Ananya Gupta", "ananya_beauty", "Bangalore", "beauty"),
    ("Vikram Singh", "vikram_lifestyle", "Hyderabad", "lifestyle"),
    ("Neha Patel", "neha_fashion", "Mumbai", "fashion"),
    ("Arjun Mehta", "arjun_trends", "Delhi", "fashion"),
    ("Kavya Nair", "kavya_glam", "Chennai", "beauty"),
    ("Rohan Das", "rohan_style", "Kolkata", "lifestyle"),
]

LEAD_NAMES = [
    ("Meera Joshi", "+919876543210", "Wedding", "Mumbai"),
    ("Amit Kumar", "+919876543211", "Engagement", "Delhi"),
    ("Sanya Malhotra", "+919876543212", "Reception", "Bangalore"),
    ("Karan Shah", "+919876543213", "Party", "Mumbai"),
    ("Riya Agarwal", "+919876543214", "Wedding", "Pune"),
]

CAMPAIGN_NAMES = [
    ("Spring Collection 2024", "branding", 500000),
    ("Diwali Festive Launch", "sales", 750000),
    ("Summer Essentials", "awareness", 300000),
    ("Bridal Collection", "engagement", 1000000),
]

async def seed_users():
    """Create demo users for each department"""
    users = [
        {
            "id": str(uuid.uuid4()),
            "email": "marketing@sevora.com",
            "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzHfO2.", # admin123
            "name": "Marketing Manager",
            "department": "marketing",
            "role": "marketing_manager",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "sales@sevora.com",
            "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzHfO2.",
            "name": "Sales Manager",
            "department": "sales",
            "role": "sales_manager",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "social@sevora.com",
            "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzHfO2.",
            "name": "Social Media Manager",
            "department": "social",
            "role": "social_manager",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "stylist@sevora.com",
            "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzHfO2.",
            "name": "Priya Stylist",
            "department": "sales",
            "role": "stylist",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    for user in users:
        existing = await db.users.find_one({"email": user["email"]})
        if not existing:
            await db.users.insert_one(user)
            print(f"Created user: {user['email']}")

async def seed_influencers():
    """Create demo influencers"""
    tiers = ["nano", "micro", "macro", "mega"]
    statuses = ["identified", "contacted", "interested", "negotiation", "confirmed"]
    
    for name, handle, city, industry in INFLUENCER_NAMES:
        influencer = {
            "id": str(uuid.uuid4()),
            "name": name,
            "instagram_handle": handle,
            "youtube_handle": f"{handle}_yt" if random.random() > 0.5 else None,
            "email": f"{handle}@gmail.com",
            "phone": f"+91{random.randint(7000000000, 9999999999)}",
            "city": city,
            "country": "India",
            "industry": industry,
            "content_type": random.sample(["reels", "posts", "stories", "videos"], k=2),
            "tier": random.choice(tiers),
            "followers": random.randint(10000, 500000),
            "engagement_rate": round(random.uniform(2.0, 8.0), 2),
            "rate_per_reel": random.randint(5000, 50000),
            "rate_per_post": random.randint(3000, 30000),
            "style_tags": random.sample(["ethnic", "western", "fusion", "bridal", "casual", "formal"], k=3),
            "languages": ["English", "Hindi"],
            "status": random.choice(statuses),
            "score": round(random.uniform(50, 95), 1),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.influencers.insert_one(influencer)
    print(f"Created {len(INFLUENCER_NAMES)} influencers")

async def seed_campaigns():
    """Create demo campaigns"""
    for name, objective, budget in CAMPAIGN_NAMES:
        start_date = datetime.now(timezone.utc) + timedelta(days=random.randint(-30, 30))
        campaign = {
            "id": str(uuid.uuid4()),
            "name": name,
            "objective": objective,
            "budget": budget,
            "spent": random.randint(0, int(budget * 0.6)),
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": (start_date + timedelta(days=random.randint(30, 90))).strftime("%Y-%m-%d"),
            "target_market": random.choice(["Mumbai", "Delhi", "Bangalore", "Pan India"]),
            "status": random.choice(["planning", "active", "paused", "completed"]),
            "influencers": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.marketing_campaigns.insert_one(campaign)
    print(f"Created {len(CAMPAIGN_NAMES)} campaigns")

async def seed_leads():
    """Create demo leads"""
    stages = ["New Lead", "Contacted", "Styling Session Scheduled", "Styling Completed", "Trial / Selection", "Order Confirmed"]
    sources = ["Instagram Ads", "Facebook Ads", "Influencer", "Event", "Website", "Referral"]
    
    for name, phone, occasion, city in LEAD_NAMES:
        lead = {
            "id": str(uuid.uuid4()),
            "name": name,
            "phone": phone,
            "email": f"{name.lower().replace(' ', '.')}@gmail.com",
            "source": random.choice(sources),
            "stage": random.choice(stages),
            "occasion": occasion,
            "city": city,
            "notes": f"Interested in {occasion.lower()} outfit",
            "assigned_to": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.leads.insert_one(lead)
    print(f"Created {len(LEAD_NAMES)} leads")

async def seed_content():
    """Create demo social content"""
    platforms = ["instagram", "facebook", "youtube", "twitter"]
    content_types = ["post", "reel", "story", "video"]
    statuses = ["draft", "scheduled", "published"]
    
    topics = [
        "New collection launch",
        "Behind the scenes",
        "Styling tips",
        "Customer testimonial",
        "Festival special"
    ]
    
    for i, topic in enumerate(topics):
        content = {
            "id": str(uuid.uuid4()),
            "title": topic,
            "content_type": random.choice(content_types),
            "platform": random.choice(platforms),
            "caption": f"Check out our {topic.lower()}! #Sevora #Fashion #Style",
            "hashtags": ["#Sevora", "#Fashion", "#Style", "#Trending"],
            "status": random.choice(statuses),
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=i)).isoformat() if random.random() > 0.5 else None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.content.insert_one(content)
    print(f"Created {len(topics)} content items")

async def seed_partners():
    """Create demo partners"""
    partners = [
        ("Bridal Boutique Mumbai", "Retail", "Mumbai"),
        ("Fashion Week Delhi", "Events", "Delhi"),
        ("Style Studio Bangalore", "Styling", "Bangalore"),
    ]
    
    for name, type_, city in partners:
        partner = {
            "id": str(uuid.uuid4()),
            "name": name,
            "type": type_,
            "contact_person": f"Manager - {name.split()[0]}",
            "phone": f"+91{random.randint(7000000000, 9999999999)}",
            "email": f"contact@{name.lower().replace(' ', '')}.com",
            "city": city,
            "status": "Active",
            "leads_generated": random.randint(5, 50),
            "commission_rate": random.randint(5, 15),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.partners.insert_one(partner)
    print(f"Created {len(partners)} partners")

async def main():
    print("Starting seed data creation...")
    
    # Clear existing data (optional)
    # await db.influencers.delete_many({})
    # await db.marketing_campaigns.delete_many({})
    # await db.leads.delete_many({})
    # await db.content.delete_many({})
    # await db.partners.delete_many({})
    
    await seed_users()
    await seed_influencers()
    await seed_campaigns()
    await seed_leads()
    await seed_content()
    await seed_partners()
    
    print("\nSeed data creation complete!")
    print("\nDemo Accounts:")
    print("  Admin: admin@sevora.com / admin123")
    print("  Marketing: marketing@sevora.com / admin123")
    print("  Sales: sales@sevora.com / admin123")
    print("  Social: social@sevora.com / admin123")

if __name__ == "__main__":
    asyncio.run(main())
