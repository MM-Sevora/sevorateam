"""
Marketing Budget Management Routes

Handles:
- Budget allocation and tracking
- Budget line items by category
- Expense tracking and approval
- Budget analytics and reporting
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, date, timedelta
import uuid
import os

from models.marketing_budget import (
    BudgetPeriod, BudgetStatus, BudgetCategory, ExpenseStatus, ExpenseType,
    BudgetCreate, BudgetUpdate, BudgetResponse,
    BudgetItemCreate, BudgetItemUpdate, BudgetItemResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    BudgetOverview, CategoryBreakdown, BudgetAnalytics,
    CATEGORY_DISPLAY
)

router = APIRouter(prefix="/budgets", tags=["Marketing - Budget Management"])


def get_db():
    """Get database connection"""
    from pymongo import MongoClient
    client = MongoClient(os.environ.get("MONGO_URL"))
    return client[os.environ.get("DB_NAME", "sevora_production")]


def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document for JSON response"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", doc.get("id", "")))
    return doc


def calculate_budget_amounts(db, budget_id: str) -> dict:
    """Calculate allocated, spent, and remaining amounts for a budget"""
    # Sum allocated from line items
    item_pipeline = [
        {"$match": {"budget_id": budget_id}},
        {"$group": {"_id": None, "total": {"$sum": "$allocated_amount"}}}
    ]
    item_result = list(db.marketing_budget_items.aggregate(item_pipeline))
    allocated = item_result[0]["total"] if item_result else 0
    
    # Sum spent from approved expenses
    expense_pipeline = [
        {"$match": {"budget_id": budget_id, "status": {"$in": ["approved", "paid"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    expense_result = list(db.marketing_expenses.aggregate(expense_pipeline))
    spent = expense_result[0]["total"] if expense_result else 0
    
    return {
        "allocated_amount": allocated,
        "spent_amount": spent,
        "remaining_amount": allocated - spent,
        "utilization_percentage": (spent / allocated * 100) if allocated > 0 else 0
    }


# ============== BUDGETS ==============

@router.get("", response_model=List[BudgetResponse])
async def list_budgets(
    status: Optional[BudgetStatus] = None,
    period: Optional[BudgetPeriod] = None,
    fiscal_year: Optional[int] = None,
    campaign_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List marketing budgets with filters"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status.value
    if period:
        query["period"] = period.value
    if fiscal_year:
        query["fiscal_year"] = fiscal_year
    if campaign_id:
        query["campaign_id"] = campaign_id
    
    budgets = list(
        db.marketing_budgets.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    # Enrich with calculated amounts
    for budget in budgets:
        amounts = calculate_budget_amounts(db, str(budget["_id"]))
        budget.update(amounts)
    
    return [serialize_doc(b) for b in budgets]


@router.post("", response_model=BudgetResponse)
async def create_budget(budget: BudgetCreate, user_id: Optional[str] = None):
    """Create a new marketing budget"""
    db = get_db()
    
    budget_doc = budget.model_dump()
    budget_doc["_id"] = str(uuid.uuid4())
    budget_doc["period"] = budget.period.value
    budget_doc["status"] = budget.status.value
    
    # Convert dates
    budget_doc["start_date"] = budget_doc["start_date"].isoformat()
    budget_doc["end_date"] = budget_doc["end_date"].isoformat()
    
    budget_doc["created_by"] = user_id
    budget_doc["created_at"] = datetime.utcnow()
    
    # Initialize calculated fields
    budget_doc["allocated_amount"] = 0
    budget_doc["spent_amount"] = 0
    budget_doc["remaining_amount"] = budget.total_budget
    budget_doc["utilization_percentage"] = 0
    
    db.marketing_budgets.insert_one(budget_doc)
    
    return serialize_doc(budget_doc)


@router.get("/overview", response_model=BudgetOverview)
async def get_budget_overview(fiscal_year: Optional[int] = None):
    """Get overall budget statistics"""
    db = get_db()
    
    query = {}
    if fiscal_year:
        query["fiscal_year"] = fiscal_year
    else:
        query["fiscal_year"] = datetime.utcnow().year
    
    budgets = list(db.marketing_budgets.find(query))
    
    total_allocated = 0
    total_spent = 0
    active_count = 0
    overspent_count = 0
    
    for budget in budgets:
        amounts = calculate_budget_amounts(db, str(budget["_id"]))
        total_allocated += budget.get("total_budget", 0)
        total_spent += amounts["spent_amount"]
        
        if budget.get("status") == "active":
            active_count += 1
        if amounts["spent_amount"] > amounts["allocated_amount"] and amounts["allocated_amount"] > 0:
            overspent_count += 1
    
    return BudgetOverview(
        total_budgets=len(budgets),
        total_allocated=total_allocated,
        total_spent=total_spent,
        total_remaining=total_allocated - total_spent,
        overall_utilization=(total_spent / total_allocated * 100) if total_allocated > 0 else 0,
        active_budgets=active_count,
        overspent_budgets=overspent_count
    )


@router.get("/analytics", response_model=BudgetAnalytics)
async def get_budget_analytics(fiscal_year: Optional[int] = None):
    """Get detailed budget analytics"""
    db = get_db()
    
    year = fiscal_year or datetime.utcnow().year
    
    # Overview
    overview = await get_budget_overview(year)
    
    # By category
    category_pipeline = [
        {"$match": {"fiscal_year": year}},
        {"$lookup": {
            "from": "marketing_budget_items",
            "localField": "_id",
            "foreignField": "budget_id",
            "as": "items"
        }},
        {"$unwind": {"path": "$items", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": "$items.category",
            "allocated": {"$sum": "$items.allocated_amount"}
        }}
    ]
    category_results = list(db.marketing_budgets.aggregate(category_pipeline))
    
    # Get spent by category from expenses
    expense_category_pipeline = [
        {"$match": {"status": {"$in": ["approved", "paid"]}}},
        {"$lookup": {
            "from": "marketing_budgets",
            "localField": "budget_id",
            "foreignField": "_id",
            "as": "budget"
        }},
        {"$match": {"budget.fiscal_year": year}},
        {"$group": {
            "_id": "$category",
            "spent": {"$sum": "$amount"}
        }}
    ]
    expense_results = list(db.marketing_expenses.aggregate(expense_category_pipeline))
    expense_by_cat = {r["_id"]: r["spent"] for r in expense_results}
    
    by_category = []
    total_cat_allocated = sum(r["allocated"] for r in category_results if r["_id"])
    
    for cat_result in category_results:
        if cat_result["_id"]:
            cat = cat_result["_id"]
            allocated = cat_result["allocated"]
            spent = expense_by_cat.get(cat, 0)
            by_category.append(CategoryBreakdown(
                category=CATEGORY_DISPLAY.get(cat, cat) if cat else "Unallocated",
                allocated=allocated,
                spent=spent,
                remaining=allocated - spent,
                percentage_of_total=(allocated / total_cat_allocated * 100) if total_cat_allocated > 0 else 0
            ))
    
    # Top expenses
    top_expenses = list(
        db.marketing_expenses.find({"status": {"$in": ["approved", "paid"]}})
        .sort("amount", -1)
        .limit(10)
    )
    top_expenses = [serialize_doc(e) for e in top_expenses]
    
    # Spending trend (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    trend_pipeline = [
        {"$match": {
            "status": {"$in": ["approved", "paid"]},
            "created_at": {"$gte": six_months_ago}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
            "total": {"$sum": "$amount"}
        }},
        {"$sort": {"_id": 1}}
    ]
    trend_results = list(db.marketing_expenses.aggregate(trend_pipeline))
    spending_trend = [{"month": r["_id"], "amount": r["total"]} for r in trend_results]
    
    return BudgetAnalytics(
        overview=overview,
        by_category=by_category,
        by_period={},
        top_expenses=top_expenses,
        spending_trend=spending_trend
    )


@router.get("/{budget_id}", response_model=BudgetResponse)
async def get_budget(budget_id: str):
    """Get a specific budget with calculated amounts"""
    db = get_db()
    
    budget = db.marketing_budgets.find_one({"_id": budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    amounts = calculate_budget_amounts(db, budget_id)
    budget.update(amounts)
    
    return serialize_doc(budget)


@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(budget_id: str, update: BudgetUpdate):
    """Update a budget"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Convert enums
    if "period" in update_data:
        update_data["period"] = update_data["period"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    
    # Convert dates
    for date_field in ["start_date", "end_date"]:
        if date_field in update_data:
            update_data[date_field] = update_data[date_field].isoformat()
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_budgets.find_one_and_update(
        {"_id": budget_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    amounts = calculate_budget_amounts(db, budget_id)
    result.update(amounts)
    
    return serialize_doc(result)


@router.post("/{budget_id}/approve")
async def approve_budget(budget_id: str, user_id: Optional[str] = None):
    """Approve a budget"""
    db = get_db()
    
    result = db.marketing_budgets.find_one_and_update(
        {"_id": budget_id, "status": {"$in": ["draft", "pending_approval"]}},
        {"$set": {
            "status": "approved",
            "approved_by": user_id,
            "approved_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Budget not found or already approved")
    
    return {"message": "Budget approved", "budget_id": budget_id}


@router.post("/{budget_id}/activate")
async def activate_budget(budget_id: str):
    """Activate an approved budget"""
    db = get_db()
    
    result = db.marketing_budgets.find_one_and_update(
        {"_id": budget_id, "status": "approved"},
        {"$set": {"status": "active", "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Budget not found or not approved")
    
    return {"message": "Budget activated", "budget_id": budget_id}


@router.delete("/{budget_id}")
async def delete_budget(budget_id: str):
    """Delete a budget (only drafts)"""
    db = get_db()
    
    budget = db.marketing_budgets.find_one({"_id": budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    if budget.get("status") not in ["draft"]:
        raise HTTPException(status_code=400, detail="Only draft budgets can be deleted")
    
    # Delete associated items and expenses
    db.marketing_budget_items.delete_many({"budget_id": budget_id})
    db.marketing_expenses.delete_many({"budget_id": budget_id})
    db.marketing_budgets.delete_one({"_id": budget_id})
    
    return {"message": "Budget deleted"}


# ============== BUDGET ITEMS ==============

@router.get("/{budget_id}/items", response_model=List[BudgetItemResponse])
async def list_budget_items(budget_id: str, category: Optional[BudgetCategory] = None):
    """List line items for a budget"""
    db = get_db()
    
    query = {"budget_id": budget_id}
    if category:
        query["category"] = category.value
    
    items = list(db.marketing_budget_items.find(query).sort("created_at", -1))
    
    # Calculate spent for each item
    for item in items:
        expense_pipeline = [
            {"$match": {"budget_item_id": str(item["_id"]), "status": {"$in": ["approved", "paid"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = list(db.marketing_expenses.aggregate(expense_pipeline))
        spent = result[0]["total"] if result else 0
        item["spent_amount"] = spent
        item["remaining_amount"] = item.get("allocated_amount", 0) - spent
    
    return [serialize_doc(i) for i in items]


@router.post("/{budget_id}/items", response_model=BudgetItemResponse)
async def create_budget_item(budget_id: str, item: BudgetItemCreate):
    """Create a budget line item"""
    db = get_db()
    
    # Verify budget exists
    budget = db.marketing_budgets.find_one({"_id": budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    item_doc = item.model_dump()
    item_doc["_id"] = str(uuid.uuid4())
    item_doc["budget_id"] = budget_id
    item_doc["category"] = item.category.value
    item_doc["created_at"] = datetime.utcnow()
    item_doc["spent_amount"] = 0
    item_doc["remaining_amount"] = item.allocated_amount
    
    db.marketing_budget_items.insert_one(item_doc)
    
    return serialize_doc(item_doc)


@router.put("/items/{item_id}", response_model=BudgetItemResponse)
async def update_budget_item(item_id: str, update: BudgetItemUpdate):
    """Update a budget line item"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "category" in update_data:
        update_data["category"] = update_data["category"].value
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_budget_items.find_one_and_update(
        {"_id": item_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Budget item not found")
    
    return serialize_doc(result)


@router.delete("/items/{item_id}")
async def delete_budget_item(item_id: str):
    """Delete a budget line item"""
    db = get_db()
    
    # Check if any expenses are linked
    expense_count = db.marketing_expenses.count_documents({"budget_item_id": item_id})
    if expense_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {expense_count} expenses linked")
    
    result = db.marketing_budget_items.delete_one({"_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget item not found")
    
    return {"message": "Budget item deleted"}


# ============== EXPENSES ==============

@router.get("/expenses/all", response_model=List[ExpenseResponse])
async def list_all_expenses(
    status: Optional[ExpenseStatus] = None,
    category: Optional[BudgetCategory] = None,
    expense_type: Optional[ExpenseType] = None,
    budget_id: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List all expenses across budgets"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status.value
    if category:
        query["category"] = category.value
    if expense_type:
        query["expense_type"] = expense_type.value
    if budget_id:
        query["budget_id"] = budget_id
    if from_date:
        query["expense_date"] = {"$gte": from_date.isoformat()}
    if to_date:
        query.setdefault("expense_date", {})["$lte"] = to_date.isoformat()
    
    expenses = list(
        db.marketing_expenses.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    return [serialize_doc(e) for e in expenses]


@router.get("/{budget_id}/expenses", response_model=List[ExpenseResponse])
async def list_budget_expenses(
    budget_id: str,
    status: Optional[ExpenseStatus] = None
):
    """List expenses for a specific budget"""
    db = get_db()
    
    query = {"budget_id": budget_id}
    if status:
        query["status"] = status.value
    
    expenses = list(db.marketing_expenses.find(query).sort("expense_date", -1))
    
    return [serialize_doc(e) for e in expenses]


@router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(expense: ExpenseCreate, user_id: Optional[str] = None):
    """Record a new expense"""
    db = get_db()
    
    # Verify budget exists
    budget = db.marketing_budgets.find_one({"_id": expense.budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    expense_doc = expense.model_dump()
    expense_doc["_id"] = str(uuid.uuid4())
    expense_doc["expense_type"] = expense.expense_type.value
    expense_doc["category"] = expense.category.value
    expense_doc["status"] = expense.status.value
    expense_doc["expense_date"] = expense_doc["expense_date"].isoformat()
    expense_doc["created_by"] = user_id
    expense_doc["created_at"] = datetime.utcnow()
    
    db.marketing_expenses.insert_one(expense_doc)
    
    return serialize_doc(expense_doc)


@router.get("/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: str):
    """Get a specific expense"""
    db = get_db()
    
    expense = db.marketing_expenses.find_one({"_id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return serialize_doc(expense)


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: str, update: ExpenseUpdate):
    """Update an expense"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Convert enums
    if "expense_type" in update_data:
        update_data["expense_type"] = update_data["expense_type"].value
    if "category" in update_data:
        update_data["category"] = update_data["category"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    if "expense_date" in update_data:
        update_data["expense_date"] = update_data["expense_date"].isoformat()
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_expenses.find_one_and_update(
        {"_id": expense_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return serialize_doc(result)


@router.post("/expenses/{expense_id}/approve")
async def approve_expense(expense_id: str, user_id: Optional[str] = None):
    """Approve an expense"""
    db = get_db()
    
    result = db.marketing_expenses.find_one_and_update(
        {"_id": expense_id, "status": "pending"},
        {"$set": {
            "status": "approved",
            "approved_by": user_id,
            "approved_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found or not pending")
    
    return {"message": "Expense approved", "expense_id": expense_id}


@router.post("/expenses/{expense_id}/reject")
async def reject_expense(expense_id: str, reason: Optional[str] = None):
    """Reject an expense"""
    db = get_db()
    
    update_data = {
        "status": "rejected",
        "updated_at": datetime.utcnow()
    }
    if reason:
        update_data["rejection_reason"] = reason
    
    result = db.marketing_expenses.find_one_and_update(
        {"_id": expense_id, "status": "pending"},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found or not pending")
    
    return {"message": "Expense rejected", "expense_id": expense_id}


@router.post("/expenses/{expense_id}/mark-paid")
async def mark_expense_paid(expense_id: str):
    """Mark an approved expense as paid"""
    db = get_db()
    
    result = db.marketing_expenses.find_one_and_update(
        {"_id": expense_id, "status": "approved"},
        {"$set": {"status": "paid", "paid_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found or not approved")
    
    return {"message": "Expense marked as paid", "expense_id": expense_id}


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    """Delete an expense (only pending)"""
    db = get_db()
    
    expense = db.marketing_expenses.find_one({"_id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.get("status") not in ["pending"]:
        raise HTTPException(status_code=400, detail="Only pending expenses can be deleted")
    
    db.marketing_expenses.delete_one({"_id": expense_id})
    
    return {"message": "Expense deleted"}
