#!/usr/bin/env python3
"""
HubSpot to Supabase Integration Script
=====================================

This script imports HubSpot data into Supabase in the correct order:
1. Companies (organizations)
2. Contacts (linked to companies)
3. Deals (linked to companies)
4. Deal-Contact associations

Requirements:
- Python 3.8+
- supabase-py
- requests
- python-dotenv
- tqdm

Installation:
pip install supabase requests python-dotenv tqdm

Usage:
python hubspot_sync.py --companies 100 --contacts 500 --deals 200
python hubspot_sync.py --test  # Import 50 of each for testing
python hubspot_sync.py --all   # Import everything
"""

import os
import sys
import asyncio
import requests
import time
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

# Third-party imports
from supabase import create_client, Client
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('hubspot_sync.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class SyncStats:
    """Statistics for the sync process."""
    companies: int = 0
    contacts: int = 0
    deals: int = 0
    deal_contact_associations: int = 0
    errors: List[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []

class HubSpotToSupabaseSync:
    """HubSpot to Supabase synchronization service."""
    
    def __init__(self):
        self._validate_environment()
        
        # Initialize Supabase client
        self.supabase: Client = create_client(
            os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role key for admin access
        )
        
        # HubSpot configuration
        self.hubspot_api_key = os.getenv("HUBSPOT_API_KEY")
        self.hubspot_base_url = "https://api.hubapi.com"
        self.hubspot_headers = {
            "Authorization": f"Bearer {self.hubspot_api_key}",
            "Content-Type": "application/json"
        }
        
        # Rate limiting
        self.request_delay = 0.1  # 100ms between requests
        self.max_retries = 3
        
        # ID mappings for relationships
        self.hubspot_to_supabase_ids = {
            "companies": {},  # hubspot_id -> supabase_id
            "contacts": {},   # hubspot_id -> supabase_id
            "deals": {}       # hubspot_id -> supabase_id
        }
        
        self.stats = SyncStats()
        logger.info("✅ HubSpot to Supabase sync initialized")
    
    def _validate_environment(self):
        """Validate required environment variables."""
        required_vars = [
            "NEXT_PUBLIC_SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY", 
            "HUBSPOT_API_KEY"
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            logger.error(f"❌ Missing required environment variables: {missing_vars}")
            logger.error("Create a .env file with:")
            for var in missing_vars:
                logger.error(f"   {var}=your_{var.lower()}_here")
            sys.exit(1)
        
        logger.info("✅ Environment variables validated")
    
    async def _make_hubspot_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make a rate-limited request to HubSpot API."""
        url = f"{self.hubspot_base_url}{endpoint}"
        
        for attempt in range(self.max_retries):
            try:
                await asyncio.sleep(self.request_delay)
                
                response = requests.get(url, headers=self.hubspot_headers, params=params)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:  # Rate limited
                    wait_time = int(response.headers.get('X-HubSpot-RateLimit-Secondly-Remaining', 10))
                    logger.warning(f"⏳ Rate limited, waiting {wait_time} seconds...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    logger.error(f"❌ HubSpot API error: {response.status_code} - {response.text}")
                    if attempt == self.max_retries - 1:
                        raise Exception(f"HubSpot API failed: {response.status_code}")
                    
            except Exception as e:
                logger.error(f"❌ Request failed (attempt {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:
                    raise e
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        return {}
    
    async def _fetch_all_hubspot_data(self, endpoint: str, properties: List[str], limit: int = None) -> List[Dict]:
        """Fetch all data from a HubSpot endpoint with pagination."""
        all_data = []
        after = None
        fetched = 0
        
        while True:
            if limit and fetched >= limit:
                break
            
            batch_size = min(100, (limit - fetched) if limit else 100)
            
            params = {
                "limit": batch_size,
                "properties": ",".join(properties)
            }
            
            if after:
                params["after"] = after
            
            data = await self._make_hubspot_request(endpoint, params)
            
            if not data or "results" not in data:
                break
            
            results = data["results"]
            all_data.extend(results)
            fetched += len(results)
            
            if not data.get("paging", {}).get("next") or not results:
                break
                
            after = data["paging"]["next"]["after"]
        
        return all_data
    
    def _parse_decimal(self, value: Any) -> Optional[float]:
        """Parse decimal value safely."""
        if value is None:
            return None
        try:
            return float(str(value).replace(",", ""))
        except (ValueError, TypeError):
            return None
    
    def _parse_integer(self, value: Any) -> Optional[int]:
        """Parse integer value safely."""
        if value is None:
            return None
        try:
            return int(float(str(value).replace(",", "")))
        except (ValueError, TypeError):
            return None
    
    def _parse_date(self, value: Any) -> Optional[str]:
        """Parse HubSpot date safely."""
        if value is None:
            return None
        try:
            timestamp = int(value) / 1000
            return datetime.fromtimestamp(timestamp).date().isoformat()
        except (ValueError, TypeError):
            return None
    
    def _normalize_company_type(self, hubspot_type: Any) -> str:
        """Normalize HubSpot company type."""
        if not hubspot_type:
            return "prospect"
        
        hubspot_type_lower = str(hubspot_type).lower()
        
        type_mapping = {
            "partner": "partner",
            "customer": "end_customer",
            "prospect": "prospect",
            "vendor": "partner",
            "reseller": "partner",
            "other": "prospect"
        }
        
        return type_mapping.get(hubspot_type_lower, "prospect")
    
    async def sync_companies(self, limit: int = None) -> int:
        """Sync companies from HubSpot to Supabase."""
        logger.info("🏢 Starting companies sync...")
        
        properties = [
            "name", "domain", "website", "industry", "annualrevenue", 
            "numberofemployees", "city", "state", "country", "type", 
            "description", "phone"
        ]
        
        # Fetch companies from HubSpot
        companies = await self._fetch_all_hubspot_data(
            "/crm/v3/objects/companies",
            properties,
            limit
        )
        
        logger.info(f"📥 Fetched {len(companies)} companies from HubSpot")
        
        # Import companies to Supabase
        with tqdm(desc="Importing companies", total=len(companies)) as pbar:
            for company in companies:
                try:
                    props = company.get("properties", {})
                    
                    company_data = {
                        "hubspot_company_id": company["id"],
                        "hubspot_raw_data": company,
                        "name": props.get("name", "Unknown Company"),
                        "domain": props.get("domain") or props.get("website"),
                        "industry": props.get("industry"),
                        "annual_revenue": self._parse_decimal(props.get("annualrevenue")),
                        "employee_count": self._parse_integer(props.get("numberofemployees")),
                        "type": self._normalize_company_type(props.get("type")),
                        "city": props.get("city"),
                        "state": props.get("state"),
                        "country": props.get("country"),
                        "embedding_text": f"{props.get('name', '')} {props.get('industry', '')} {props.get('city', '')} {props.get('state', '')}".strip(),
                        "hubspot_synced_at": datetime.now().isoformat()
                    }
                    
                    # Insert into Supabase
                    result = self.supabase.table("companies").insert(company_data).execute()
                    
                    if result.data:
                        imported_company = result.data[0]
                        # Store ID mapping
                        self.hubspot_to_supabase_ids["companies"][company["id"]] = imported_company["id"]
                        self.stats.companies += 1
                        
                except Exception as e:
                    error_msg = f"Error importing company {company.get('id')}: {e}"
                    logger.error(error_msg)
                    self.stats.errors.append(error_msg)
                
                pbar.update(1)
        
        logger.info(f"✅ Imported {self.stats.companies} companies")
        return self.stats.companies
    
    async def sync_contacts(self, limit: int = None) -> int:
        """Sync contacts from HubSpot to Supabase."""
        logger.info("👥 Starting contacts sync...")
        
        properties = [
            "firstname", "lastname", "email", "phone", "jobtitle",
            "company", "lifecyclestage", "createdate"
        ]
        
        # Fetch contacts from HubSpot
        contacts = await self._fetch_all_hubspot_data(
            "/crm/v3/objects/contacts",
            properties,
            limit
        )
        
        logger.info(f"📥 Fetched {len(contacts)} contacts from HubSpot")
        
        # Import contacts to Supabase
        with tqdm(desc="Importing contacts", total=len(contacts)) as pbar:
            for contact in contacts:
                try:
                    props = contact.get("properties", {})
                    
                    # Skip contacts without email
                    if not props.get("email"):
                        pbar.update(1)
                        continue
                    
                    contact_data = {
                        "company_id": None,  # Will be linked via associations later
                        "hubspot_contact_id": contact["id"],
                        "hubspot_raw_data": contact,
                        "first_name": props.get("firstname"),
                        "last_name": props.get("lastname"),
                        "email": props.get("email"),
                        "phone": props.get("phone"),
                        "job_title": props.get("jobtitle"),
                        "embedding_text": f"{props.get('firstname', '')} {props.get('lastname', '')} {props.get('email', '')} {props.get('jobtitle', '')}".strip(),
                        "hubspot_synced_at": datetime.now().isoformat()
                    }
                    
                    # Insert into Supabase
                    result = self.supabase.table("contacts").insert(contact_data).execute()
                    
                    if result.data:
                        imported_contact = result.data[0]
                        # Store ID mapping
                        self.hubspot_to_supabase_ids["contacts"][contact["id"]] = imported_contact["id"]
                        self.stats.contacts += 1
                        
                except Exception as e:
                    error_msg = f"Error importing contact {contact.get('id')}: {e}"
                    logger.error(error_msg)
                    self.stats.errors.append(error_msg)
                
                pbar.update(1)
        
        logger.info(f"✅ Imported {self.stats.contacts} contacts")
        return self.stats.contacts
    
    async def sync_deals(self, limit: int = None) -> int:
        """Sync deals from HubSpot to Supabase."""
        logger.info("💼 Starting deals sync...")
        
        properties = [
            "dealname", "dealstage", "amount", "closedate", "createdate",
            "pipeline", "dealtype", "description"
        ]
        
        # Fetch deals from HubSpot
        deals = await self._fetch_all_hubspot_data(
            "/crm/v3/objects/deals",
            properties,
            limit
        )
        
        logger.info(f"📥 Fetched {len(deals)} deals from HubSpot")
        
        # Import deals to Supabase
        with tqdm(desc="Importing deals", total=len(deals)) as pbar:
            for deal in deals:
                try:
                    props = deal.get("properties", {})
                    deal_stage = props.get("dealstage", "")
                    
                    deal_data = {
                        "company_id": None,  # Will be linked via associations later
                        "hubspot_deal_id": deal["id"],
                        "hubspot_raw_data": deal,
                        "deal_name": props.get("dealname", "Unnamed Deal"),
                        "deal_stage": deal_stage,
                        "deal_value": self._parse_decimal(props.get("amount")),
                        "currency": "USD",
                        "close_date": self._parse_date(props.get("closedate")),
                        "is_closed": deal_stage.lower() in ["closed-won", "closed-lost"],
                        "is_closed_won": deal_stage.lower() == "closed-won",
                        "embedding_text": f"{props.get('dealname', '')} {deal_stage} {props.get('amount', '')}".strip(),
                        "hubspot_synced_at": datetime.now().isoformat()
                    }
                    
                    # Insert into Supabase
                    result = self.supabase.table("deals").insert(deal_data).execute()
                    
                    if result.data:
                        imported_deal = result.data[0]
                        # Store ID mapping
                        self.hubspot_to_supabase_ids["deals"][deal["id"]] = imported_deal["id"]
                        self.stats.deals += 1
                        
                except Exception as e:
                    error_msg = f"Error importing deal {deal.get('id')}: {e}"
                    logger.error(error_msg)
                    self.stats.errors.append(error_msg)
                
                pbar.update(1)
        
        logger.info(f"✅ Imported {self.stats.deals} deals")
        return self.stats.deals
    
    async def link_contacts_to_companies(self) -> int:
        """Link contacts to companies using HubSpot associations."""
        logger.info("🔗 Linking contacts to companies...")
        
        # Get all contacts that need linking
        contacts_result = self.supabase.table("contacts").select("id, hubspot_contact_id").is_("company_id", "null").execute()
        contacts = contacts_result.data
        
        linked_count = 0
        
        with tqdm(desc="Linking contacts to companies", total=len(contacts)) as pbar:
            for contact in contacts:
                try:
                    # Get company associations from HubSpot
                    associations_url = f"/crm/v4/objects/contacts/{contact['hubspot_contact_id']}/associations/companies"
                    response = requests.get(
                        f"{self.hubspot_base_url}{associations_url}",
                        headers=self.hubspot_headers
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        associations = data.get("results", [])
                        
                        if associations:
                            hubspot_company_id = associations[0]["toObjectId"]
                            
                            # Find our Supabase company ID
                            if hubspot_company_id in self.hubspot_to_supabase_ids["companies"]:
                                supabase_company_id = self.hubspot_to_supabase_ids["companies"][hubspot_company_id]
                                
                                # Update the contact
                                self.supabase.table("contacts").update({
                                    "company_id": supabase_company_id
                                }).eq("id", contact["id"]).execute()
                                
                                linked_count += 1
                    
                    await asyncio.sleep(0.1)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error linking contact {contact['hubspot_contact_id']}: {e}")
                
                pbar.update(1)
        
        logger.info(f"✅ Linked {linked_count} contacts to companies")
        return linked_count
    
    async def link_deals_to_companies(self) -> int:
        """Link deals to companies using HubSpot associations."""
        logger.info("🔗 Linking deals to companies...")
        
        # Get all deals that need linking
        deals_result = self.supabase.table("deals").select("id, hubspot_deal_id").is_("company_id", "null").execute()
        deals = deals_result.data
        
        linked_count = 0
        
        with tqdm(desc="Linking deals to companies", total=len(deals)) as pbar:
            for deal in deals:
                try:
                    # Get company associations from HubSpot
                    associations_url = f"/crm/v4/objects/deals/{deal['hubspot_deal_id']}/associations/companies"
                    response = requests.get(
                        f"{self.hubspot_base_url}{associations_url}",
                        headers=self.hubspot_headers
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        associations = data.get("results", [])
                        
                        if associations:
                            hubspot_company_id = associations[0]["toObjectId"]
                            
                            # Find our Supabase company ID
                            if hubspot_company_id in self.hubspot_to_supabase_ids["companies"]:
                                supabase_company_id = self.hubspot_to_supabase_ids["companies"][hubspot_company_id]
                                
                                # Update the deal
                                self.supabase.table("deals").update({
                                    "company_id": supabase_company_id
                                }).eq("id", deal["id"]).execute()
                                
                                linked_count += 1
                    
                    await asyncio.sleep(0.1)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error linking deal {deal['hubspot_deal_id']}: {e}")
                
                pbar.update(1)
        
        logger.info(f"✅ Linked {linked_count} deals to companies")
        return linked_count
    
    async def create_deal_contact_associations(self) -> int:
        """Create deal-contact associations using HubSpot associations."""
        logger.info("🤝 Creating deal-contact associations...")
        
        # Get all deals
        deals_result = self.supabase.table("deals").select("id, hubspot_deal_id").execute()
        deals = deals_result.data
        
        associations_created = 0
        
        with tqdm(desc="Creating deal-contact associations", total=len(deals)) as pbar:
            for deal in deals:
                try:
                    # Get contact associations from HubSpot
                    associations_url = f"/crm/v4/objects/deals/{deal['hubspot_deal_id']}/associations/contacts"
                    response = requests.get(
                        f"{self.hubspot_base_url}{associations_url}",
                        headers=self.hubspot_headers
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        for association in data.get("results", []):
                            hubspot_contact_id = association["toObjectId"]
                            
                            # Find our Supabase contact ID
                            if hubspot_contact_id in self.hubspot_to_supabase_ids["contacts"]:
                                supabase_contact_id = self.hubspot_to_supabase_ids["contacts"][hubspot_contact_id]
                                
                                # Create association record (ignore duplicates)
                                try:
                                    self.supabase.table("deal_contacts").insert({
                                        "deal_id": deal["id"],
                                        "contact_id": supabase_contact_id,
                                        "hubspot_association_data": association,
                                        "association_type": "deal_contact"
                                    }).execute()
                                    
                                    associations_created += 1
                                    
                                except Exception:
                                    # Ignore duplicate key errors
                                    pass
                    
                    await asyncio.sleep(0.1)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error creating associations for deal {deal['hubspot_deal_id']}: {e}")
                
                pbar.update(1)
        
        self.stats.deal_contact_associations = associations_created
        logger.info(f"✅ Created {associations_created} deal-contact associations")
        return associations_created
    
    async def test_hubspot_connection(self) -> Dict[str, Any]:
        """Test HubSpot API connection."""
        logger.info("🔍 Testing HubSpot API connection...")
        
        try:
            # Test basic API access
            test_response = await self._make_hubspot_request("/crm/v3/objects/companies", {"limit": 1})
            
            if not test_response:
                return {"success": False, "error": "No response from HubSpot API"}
            
            # Get counts for each object type
            companies_response = await self._make_hubspot_request("/crm/v3/objects/companies", {"limit": 1})
            contacts_response = await self._make_hubspot_request("/crm/v3/objects/contacts", {"limit": 1})
            deals_response = await self._make_hubspot_request("/crm/v3/objects/deals", {"limit": 1})
            
            return {
                "success": True,
                "api_key_valid": True,
                "companies_available": "total" in companies_response.get("paging", {}),
                "contacts_available": "total" in contacts_response.get("paging", {}),
                "deals_available": "total" in deals_response.get("paging", {})
            }
            
        except Exception as e:
            logger.error(f"❌ HubSpot API test failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "api_key_valid": False
            }
    
    def verify_sync(self) -> Dict[str, Any]:
        """Verify the synced data and relationships."""
        logger.info("🔍 Verifying sync results...")
        
        verification = {
            "counts": {},
            "relationships": {},
            "quality_score": 0
        }
        
        try:
            # Count records
            companies_result = self.supabase.table("companies").select("id", count="exact").execute()
            contacts_result = self.supabase.table("contacts").select("id", count="exact").execute()
            deals_result = self.supabase.table("deals").select("id", count="exact").execute()
            deal_contacts_result = self.supabase.table("deal_contacts").select("id", count="exact").execute()
            
            verification["counts"] = {
                "companies": companies_result.count,
                "contacts": contacts_result.count,
                "deals": deals_result.count,
                "deal_contacts": deal_contacts_result.count
            }
            
            # Check relationships
            contacts_linked_result = self.supabase.table("contacts").select("id").not_.is_("company_id", "null").execute()
            deals_linked_result = self.supabase.table("deals").select("id").not_.is_("company_id", "null").execute()
            
            verification["relationships"] = {
                "contacts_linked": len(contacts_linked_result.data),
                "deals_linked": len(deals_linked_result.data)
            }
            
            # Calculate quality score
            total_entities = verification["counts"]["contacts"] + verification["counts"]["deals"]
            linked_entities = verification["relationships"]["contacts_linked"] + verification["relationships"]["deals_linked"]
            
            if total_entities > 0:
                verification["quality_score"] = (linked_entities / total_entities) * 100
            
        except Exception as e:
            logger.error(f"Error during verification: {e}")
        
        return verification
    
    async def run_full_sync(
        self,
        companies_limit: int = None,
        contacts_limit: int = None,
        deals_limit: int = None
    ) -> SyncStats:
        """Run the complete sync process."""
        
        self.stats.start_time = datetime.now()
        logger.info("🚀 Starting HubSpot to Supabase sync...")
        
        try:
            # Phase 1: Sync companies
            if companies_limit is not None:
                await self.sync_companies(companies_limit)
            
            # Phase 2: Sync contacts  
            if contacts_limit is not None:
                await self.sync_contacts(contacts_limit)
            
            # Phase 3: Sync deals
            if deals_limit is not None:
                await self.sync_deals(deals_limit)
            
            # Phase 4: Link relationships
            logger.info("🔗 Phase 4: Linking relationships...")
            await self.link_contacts_to_companies()
            await self.link_deals_to_companies()
            await self.create_deal_contact_associations()
            
            # Phase 5: Verify sync
            logger.info("🔍 Phase 5: Verifying sync...")
            verification = self.verify_sync()
            
            self.stats.end_time = datetime.now()
            duration = (self.stats.end_time - self.stats.start_time).total_seconds()
            
            logger.info(f"✅ Sync completed successfully in {duration:.2f} seconds")
            self._print_sync_summary(verification)
            
            return self.stats
            
        except Exception as e:
            self.stats.end_time = datetime.now()
            logger.error(f"❌ Sync failed: {e}")
            self.stats.errors.append(str(e))
            return self.stats
    
    def _print_sync_summary(self, verification: Dict[str, Any]):
        """Print comprehensive sync summary."""
        duration = (self.stats.end_time - self.stats.start_time).total_seconds()
        
        print("\n" + "="*60)
        print("🎉 HUBSPOT TO SUPABASE SYNC SUMMARY")
        print("="*60)
        print(f"⏱️  Duration: {duration:.2f} seconds")
        print(f"🏢 Companies: {self.stats.companies:,}")
        print(f"👥 Contacts: {self.stats.contacts:,}")
        print(f"💼 Deals: {self.stats.deals:,}")
        print(f"🤝 Deal-Contact associations: {self.stats.deal_contact_associations:,}")
        print(f"❌ Errors: {len(self.stats.errors)}")
        
        # Quality score
        quality_score = verification.get("quality_score", 0)
        if quality_score >= 80:
            quality_status = "✅ Excellent"
        elif quality_score >= 60:
            quality_status = "⚠️ Good"
        else:
            quality_status = "❌ Needs improvement"
        
        print(f"📈 Relationship Quality: {quality_score:.1f}% ({quality_status})")
        
        if self.stats.errors:
            print(f"\n🚨 Errors:")
            for error in self.stats.errors[:5]:
                print(f"   - {error}")
            if len(self.stats.errors) > 5:
                print(f"   ... and {len(self.stats.errors) - 5} more errors")
        
        print(f"\n🔍 Verification:")
        print(f"   - Companies in DB: {verification['counts']['companies']:,}")
        print(f"   - Contacts in DB: {verification['counts']['contacts']:,}")
        print(f"   - Deals in DB: {verification['counts']['deals']:,}")
        print(f"   - Deal-Contact links: {verification['counts']['deal_contacts']:,}")
        print(f"   - Contacts linked: {verification['relationships']['contacts_linked']:,}")
        print(f"   - Deals linked: {verification['relationships']['deals_linked']:,}")
        
        print("="*60 + "\n")

def create_env_template():
    """Create environment template file."""
    env_content = """# HubSpot to Supabase Sync Configuration

# Supabase Configuration (already set in your existing .env)
NEXT_PUBLIC_SUPABASE_URL=https://qjvyjnepemhekqnbfmzm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# HubSpot Configuration  
HUBSPOT_API_KEY=your_hubspot_private_app_token_here

# Optional: Logging level
LOG_LEVEL=INFO
"""
    
    if not os.path.exists(".env"):
        with open(".env", "w") as f:
            f.write(env_content)
        print("✅ Created .env file template")
        print("📝 Please add your API keys to the .env file")
        return False
    return True

async def main():
    """Main function for command line usage."""
    parser = argparse.ArgumentParser(description="HubSpot to Supabase sync")
    
    # Individual limits
    parser.add_argument("--companies", type=int, default=None, help="Number of companies to sync")
    parser.add_argument("--contacts", type=int, default=None, help="Number of contacts to sync")
    parser.add_argument("--deals", type=int, default=None, help="Number of deals to sync")
    
    # Preset configurations
    parser.add_argument("--test", action="store_true", help="Test sync (50 of each)")
    parser.add_argument("--medium", action="store_true", help="Medium sync (500/1000/250)")
    parser.add_argument("--all", action="store_true", help="Sync everything")
    
    # Options
    parser.add_argument("--create-env", action="store_true", help="Create sample .env file")
    parser.add_argument("--test-api", action="store_true", help="Test HubSpot API connection only")
    parser.add_argument("--verify-only", action="store_true", help="Only run verification")
    
    args = parser.parse_args()
    
    # Create sample .env file
    if args.create_env:
        create_env_template()
        return
    
    # Check if .env file exists
    if not os.path.exists(".env"):
        print("❌ .env file not found!")
        print("Run: python hubspot_sync.py --create-env")
        print("Then add your API keys to the .env file")
        return
    
    try:
        sync = HubSpotToSupabaseSync()
        
        # Test API connection if requested
        if args.test_api:
            test_result = await sync.test_hubspot_connection()
            print("\n🔍 HUBSPOT API TEST RESULTS")
            print("="*40)
            if test_result["success"]:
                print("✅ HubSpot API connection successful")
                print(f"🏢 Companies endpoint: {'✅' if test_result['companies_available'] else '❌'}")
                print(f"👥 Contacts endpoint: {'✅' if test_result['contacts_available'] else '❌'}")
                print(f"💼 Deals endpoint: {'✅' if test_result['deals_available'] else '❌'}")
            else:
                print("❌ HubSpot API connection failed")
                print(f"Error: {test_result.get('error', 'Unknown error')}")
            return
        
        if args.verify_only:
            verification = sync.verify_sync()
            print("✅ Verification completed")
            return
        
        # Set limits based on presets
        if args.test:
            companies_limit, contacts_limit, deals_limit = 50, 100, 50
        elif args.medium:
            companies_limit, contacts_limit, deals_limit = 500, 1000, 250
        elif args.all:
            companies_limit, contacts_limit, deals_limit = None, None, None
        else:
            companies_limit = args.companies
            contacts_limit = args.contacts
            deals_limit = args.deals
        
        # Ensure at least one entity type is specified
        if all(limit is None for limit in [companies_limit, contacts_limit, deals_limit]):
            print("❌ Please specify at least one entity type to sync")
            print("Examples:")
            print("  python hubspot_sync.py --test")
            print("  python hubspot_sync.py --companies 100 --contacts 200")
            print("  python hubspot_sync.py --all")
            return
        
        # Run sync
        stats = await sync.run_full_sync(
            companies_limit=companies_limit,
            contacts_limit=contacts_limit,
            deals_limit=deals_limit
        )
        
    except KeyboardInterrupt:
        print("\n⏹️  Sync cancelled by user")
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        print(f"\n❌ Sync failed: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 