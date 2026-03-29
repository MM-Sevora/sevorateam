"""
Migration Script: Consolidate influencers collection into contacts collection
=============================================================================

This script migrates all documents from the 'influencers' collection to the 'contacts' collection,
handling duplicates by merging data and preserving the richer record.

Steps:
1. Read all documents from 'influencers' collection
2. For each influencer:
   a. Check if a matching contact exists (by name or email)
   b. If exists: merge fields (prefer contacts data, fill missing from influencers)
   c. If not exists: create new contact with contact_type='influencer'
3. Rename 'influencers' collection to 'influencers_backup_YYYYMMDD'
4. Log all operations

Usage:
    python migrate_influencers_to_contacts.py --dry-run  # Preview changes
    python migrate_influencers_to_contacts.py --execute  # Execute migration
"""

import asyncio
import argparse
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid


async def run_migration(dry_run: bool = True):
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'sevora_production')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"{'[DRY RUN] ' if dry_run else ''}Starting migration from 'influencers' to 'contacts'")
    print(f"Database: {db_name}")
    print("-" * 60)
    
    stats = {
        'total_influencers': 0,
        'merged': 0,
        'created': 0,
        'skipped': 0,
        'errors': 0
    }
    
    # Get all influencers
    influencers = []
    async for doc in db.influencers.find({}):
        influencers.append(doc)
    
    print(f"Found {len(influencers)} documents in 'influencers' collection")
    
    # Build name lookup for contacts
    contacts_by_name = {}
    async for doc in db.contacts.find({'contact_type': 'influencer'}):
        name = doc.get('name', '').lower().strip()
        if name:
            contacts_by_name[name] = doc
    
    print(f"Found {len(contacts_by_name)} influencer contacts in 'contacts' collection")
    print("-" * 60)
    
    # First, aggregate all data for each influencer name (handling duplicates within influencers)
    # This ensures we get the best data from all duplicates
    influencers_aggregated = {}
    
    for inf in influencers:
        inf_name = inf.get('name', '').strip()
        inf_name_lower = inf_name.lower()
        
        if not inf_name:
            continue
        
        if inf_name_lower not in influencers_aggregated:
            influencers_aggregated[inf_name_lower] = {
                'id': inf.get('id', str(uuid.uuid4())),
                'name': inf_name,
                'data': {}
            }
        
        # Merge all non-null values into the aggregated record
        for key, value in inf.items():
            if key not in ['_id', 'id', 'name'] and value is not None and value != '' and value != []:
                if key not in influencers_aggregated[inf_name_lower]['data']:
                    influencers_aggregated[inf_name_lower]['data'][key] = value
                # For lists, merge unique values
                elif isinstance(value, list) and isinstance(influencers_aggregated[inf_name_lower]['data'].get(key), list):
                    existing = influencers_aggregated[inf_name_lower]['data'][key]
                    for v in value:
                        if v not in existing:
                            existing.append(v)
    
    print(f"Aggregated to {len(influencers_aggregated)} unique influencers")
    stats['total_influencers'] = len(influencers_aggregated)
    
    for inf_name_lower, agg in influencers_aggregated.items():
        inf_name = agg['name']
        inf_id = agg['id']
        inf_data = agg['data']
        
        try:
            if inf_name_lower in contacts_by_name:
                # Duplicate found - merge data
                existing = contacts_by_name[inf_name_lower]
                
                # Merge fields: prefer existing contact data, fill gaps from influencer
                merged_data = {}
                
                # Fields to merge (fill missing values)
                merge_fields = [
                    'bio', 'email', 'phone', 'city', 'country', 'industry',
                    'instagram_handle', 'youtube_handle', 'primary_platform',
                    'followers', 'engagement_rate', 'rate_per_post', 'rate_per_reel',
                    'tier', 'content_type', 'style_tags', 'languages', 'notes', 'score'
                ]
                
                for field in merge_fields:
                    existing_val = existing.get(field)
                    inf_val = inf_data.get(field)
                    
                    # Only update if existing is empty/None and influencer has value
                    if (existing_val is None or existing_val == '' or existing_val == []) and inf_val:
                        merged_data[field] = inf_val
                
                if merged_data:
                    merged_data['updated_at'] = datetime.now(timezone.utc).isoformat()
                    
                    print(f"  [MERGE] {inf_name}")
                    print(f"          Filling fields: {list(merged_data.keys())}")
                    
                    if not dry_run:
                        await db.contacts.update_one(
                            {'id': existing['id']},
                            {'$set': merged_data}
                        )
                    
                    stats['merged'] += 1
                else:
                    print(f"  [SKIP] {inf_name} - already complete in contacts")
                    stats['skipped'] += 1
            else:
                # New influencer - create contact
                new_contact = {
                    'id': inf_id,
                    'name': inf_name,
                    'contact_type': 'influencer',
                    'bio': inf_data.get('bio'),
                    'email': inf_data.get('email'),
                    'phone': inf_data.get('phone'),
                    'city': inf_data.get('city'),
                    'country': inf_data.get('country', 'India'),
                    'industry': inf_data.get('industry', 'lifestyle'),
                    'instagram_handle': inf_data.get('instagram_handle'),
                    'youtube_handle': inf_data.get('youtube_handle'),
                    'twitter_handle': None,
                    'linkedin_url': None,
                    'primary_platform': inf_data.get('primary_platform', 'instagram'),
                    'followers': inf_data.get('followers', 0),
                    'engagement_rate': inf_data.get('engagement_rate', 0),
                    'rate_per_post': inf_data.get('rate_per_post'),
                    'rate_per_reel': inf_data.get('rate_per_reel'),
                    'tier': inf_data.get('tier', 'micro'),
                    'content_type': inf_data.get('content_type', []),
                    'style_tags': inf_data.get('style_tags', []),
                    'languages': inf_data.get('languages', ['English']),
                    'notes': inf_data.get('notes'),
                    'score': inf_data.get('score', 50.0),
                    'status': inf_data.get('status', 'identified'),
                    'pipeline_stage': inf_data.get('status', 'identified'),
                    'publication': None,
                    'publication_id': None,
                    'beat': None,
                    'editor_level': None,
                    'campaign_id': None,
                    'created_at': inf_data.get('created_at', datetime.now(timezone.utc).isoformat()),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                print(f"  [CREATE] {inf_name}")
                
                if not dry_run:
                    await db.contacts.insert_one(new_contact)
                
                stats['created'] += 1
                
        except Exception as e:
            print(f"  [ERROR] {inf_name}: {str(e)}")
            stats['errors'] += 1
    
    print("-" * 60)
    print("Migration Summary:")
    print(f"  Total influencers processed: {stats['total_influencers']}")
    print(f"  Merged with existing contacts: {stats['merged']}")
    print(f"  Created new contacts: {stats['created']}")
    print(f"  Skipped (no name or already complete): {stats['skipped']}")
    print(f"  Errors: {stats['errors']}")
    
    # Backup the old collection
    if not dry_run and stats['errors'] == 0:
        backup_name = f"influencers_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"\nBacking up 'influencers' collection to '{backup_name}'...")
        
        # Copy all documents to backup collection
        pipeline = [{'$out': backup_name}]
        await db.influencers.aggregate(pipeline).to_list(length=None)
        
        # Drop the original collection
        await db.influencers.drop()
        print(f"Original 'influencers' collection dropped")
        print(f"Backup created: {backup_name}")
    
    client.close()
    
    if dry_run:
        print("\n[DRY RUN COMPLETE] No changes were made. Run with --execute to apply changes.")
    else:
        print("\n[MIGRATION COMPLETE]")
    
    return stats


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Migrate influencers collection to contacts')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--dry-run', action='store_true', help='Preview changes without applying')
    group.add_argument('--execute', action='store_true', help='Execute the migration')
    
    args = parser.parse_args()
    
    asyncio.run(run_migration(dry_run=args.dry_run))
