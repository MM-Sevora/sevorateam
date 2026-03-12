"""
Module Categories - CRUD for custom module categories
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/module-categories", tags=["Module Categories"])

# Database reference
db = None

def set_database(database):
    global db
    db = database


def require_admin():
    from server import require_department
    return require_department(["admin"])


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# Default categories (seed data)
DEFAULT_CATEGORIES = [
    {
        "id": "general",
        "code": "general",
        "name": "General",
        "description": "Everyone gets access",
        "color": "green",
        "icon": "Users",
        "access_type": "everyone",
        "is_system": True,
        "order": 1
    },
    {
        "id": "operations",
        "code": "operations", 
        "name": "Operations",
        "description": "Team-based access",
        "color": "yellow",
        "icon": "Settings",
        "access_type": "team",
        "is_system": True,
        "order": 2
    },
    {
        "id": "business",
        "code": "business",
        "name": "Business",
        "description": "Department-based access",
        "color": "orange",
        "icon": "Briefcase",
        "access_type": "department",
        "is_system": True,
        "order": 3
    },
    {
        "id": "admin",
        "code": "admin",
        "name": "Administration",
        "description": "Admin-only access",
        "color": "red",
        "icon": "Shield",
        "access_type": "admin",
        "is_system": True,
        "order": 4
    }
]


# Pydantic Models
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: str = "blue"  # green, yellow, orange, red, blue, purple, pink, indigo, cyan, teal
    icon: Optional[str] = "Folder"
    access_type: str = "department"  # everyone, team, department, admin


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    access_type: Optional[str] = None
    order: Optional[int] = None


class CategoryResponse(BaseModel):
    id: str
    code: str
    name: str
    description: str
    color: str
    icon: str
    access_type: str
    is_system: bool
    order: int
    module_count: Optional[int] = 0


# ============== ENDPOINTS ==============

@router.get("/", response_model=List[CategoryResponse])
async def get_all_categories(user: dict = Depends(get_current_user_dep())):
    """Get all module categories (system + custom)"""
    # Check if categories exist in DB, if not seed defaults
    existing = await db.module_categories.count_documents({})
    if existing == 0:
        # Seed default categories
        for cat in DEFAULT_CATEGORIES:
            cat["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.module_categories.insert_one(cat)
    
    # Get all categories
    categories = await db.module_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Get module counts per category
    for cat in categories:
        # Count from system_module_config (custom assignments)
        custom_count = await db.system_module_config.count_documents({"category": cat["code"]})
        cat["module_count"] = custom_count
    
    return categories


@router.post("/", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, user: dict = Depends(require_admin())):
    """Create a new custom category"""
    # Generate code from name
    code = data.name.lower().replace(" ", "_").replace("-", "_")
    
    # Check if code already exists
    existing = await db.module_categories.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Category with code '{code}' already exists")
    
    # Get max order
    max_order_cat = await db.module_categories.find_one(sort=[("order", -1)])
    next_order = (max_order_cat.get("order", 0) if max_order_cat else 0) + 1
    
    category = {
        "id": str(uuid.uuid4()),
        "code": code,
        "name": data.name,
        "description": data.description or "",
        "color": data.color,
        "icon": data.icon or "Folder",
        "access_type": data.access_type,
        "is_system": False,
        "order": next_order,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    
    await db.module_categories.insert_one(category)
    category.pop("_id", None)
    category["module_count"] = 0
    
    return category


@router.get("/{category_id}")
async def get_category(category_id: str, user: dict = Depends(get_current_user_dep())):
    """Get a specific category"""
    category = await db.module_categories.find_one(
        {"$or": [{"id": category_id}, {"code": category_id}]},
        {"_id": 0}
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get module count
    custom_count = await db.system_module_config.count_documents({"category": category["code"]})
    category["module_count"] = custom_count
    
    return category


@router.put("/{category_id}")
async def update_category(category_id: str, data: CategoryUpdate, user: dict = Depends(require_admin())):
    """Update a category"""
    category = await db.module_categories.find_one(
        {"$or": [{"id": category_id}, {"code": category_id}]}
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # System categories can only have limited updates
    if category.get("is_system"):
        # Only allow description, color, icon updates for system categories
        update_data = {}
        if data.description is not None:
            update_data["description"] = data.description
        if data.color is not None:
            update_data["color"] = data.color
        if data.icon is not None:
            update_data["icon"] = data.icon
    else:
        update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["updated_by"] = user.get("id")
        
        await db.module_categories.update_one(
            {"$or": [{"id": category_id}, {"code": category_id}]},
            {"$set": update_data}
        )
    
    return {"success": True, "message": "Category updated"}


@router.delete("/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require_admin())):
    """Delete a custom category (system categories cannot be deleted)"""
    category = await db.module_categories.find_one(
        {"$or": [{"id": category_id}, {"code": category_id}]}
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if category.get("is_system"):
        raise HTTPException(status_code=400, detail="System categories cannot be deleted")
    
    # Check if any modules are using this category
    module_count = await db.system_module_config.count_documents({"category": category["code"]})
    if module_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete category with {module_count} modules assigned. Move modules first."
        )
    
    await db.module_categories.delete_one({"$or": [{"id": category_id}, {"code": category_id}]})
    
    return {"success": True, "message": "Category deleted"}


@router.put("/{category_id}/reorder")
async def reorder_category(category_id: str, new_order: int, user: dict = Depends(require_admin())):
    """Change category order"""
    category = await db.module_categories.find_one(
        {"$or": [{"id": category_id}, {"code": category_id}]}
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    old_order = category.get("order", 0)
    
    if new_order > old_order:
        # Moving down - decrease order of items in between
        await db.module_categories.update_many(
            {"order": {"$gt": old_order, "$lte": new_order}},
            {"$inc": {"order": -1}}
        )
    else:
        # Moving up - increase order of items in between
        await db.module_categories.update_many(
            {"order": {"$gte": new_order, "$lt": old_order}},
            {"$inc": {"order": 1}}
        )
    
    await db.module_categories.update_one(
        {"$or": [{"id": category_id}, {"code": category_id}]},
        {"$set": {"order": new_order}}
    )
    
    return {"success": True, "message": "Category reordered"}


@router.get("/colors/available")
async def get_available_colors():
    """Get list of available colors for categories"""
    return {
        "colors": [
            {"value": "green", "label": "Green", "class": "bg-green-500"},
            {"value": "yellow", "label": "Yellow", "class": "bg-yellow-500"},
            {"value": "orange", "label": "Orange", "class": "bg-orange-500"},
            {"value": "red", "label": "Red", "class": "bg-red-500"},
            {"value": "blue", "label": "Blue", "class": "bg-blue-500"},
            {"value": "purple", "label": "Purple", "class": "bg-purple-500"},
            {"value": "pink", "label": "Pink", "class": "bg-pink-500"},
            {"value": "indigo", "label": "Indigo", "class": "bg-indigo-500"},
            {"value": "cyan", "label": "Cyan", "class": "bg-cyan-500"},
            {"value": "teal", "label": "Teal", "class": "bg-teal-500"},
        ]
    }
