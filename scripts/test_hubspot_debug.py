#!/usr/bin/env python3
"""
HubSpot Sync Debugging Script

This script helps you debug HubSpot sync issues by calling the debug API endpoints
and providing detailed information about what's happening during the sync process.

Usage:
    python scripts/test_hubspot_debug.py
"""

import requests
import json
import sys
import time
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:3000"  # Change this to your app URL
API_KEY = None  # Add your API key if using authentication

class HubSpotDebugger:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        
        # Add authentication headers if needed
        if API_KEY:
            self.session.headers.update({"Authorization": f"Bearer {API_KEY}"})
    
    def print_step_results(self, steps: list):
        """Pretty print debug steps"""
        print("\n" + "="*80)
        print("DEBUG STEPS BREAKDOWN")
        print("="*80)
        
        for step in steps:
            status_emoji = {
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'pending': '⏳'
            }.get(step['status'], '❓')
            
            print(f"\n{status_emoji} [{step['step']}] {step['message']}")
            print(f"   Timestamp: {step['timestamp']}")
            if 'duration' in step:
                print(f"   Duration: {step['duration']}ms")
            
            if step.get('data'):
                print(f"   Data: {json.dumps(step['data'], indent=4)}")
    
    def test_debug_endpoint(self, sync_type: str = "companies", limit: int = 3, dry_run: bool = False):
        """Test the main debug endpoint"""
        print(f"\n🔍 Testing {sync_type} sync debug (limit: {limit}, dry_run: {dry_run})")
        
        url = f"{self.base_url}/api/hubspot/debug"
        payload = {
            "testConnection": True,
            "syncType": sync_type,
            "limit": limit,
            "dryRun": dry_run
        }
        
        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('success'):
                print("✅ Debug endpoint successful!")
                self.print_step_results(data.get('debugSteps', []))
                
                summary = data.get('summary', {})
                print(f"\n📊 SUMMARY:")
                print(f"   Total Steps: {summary.get('totalSteps', 0)}")
                print(f"   Success Steps: {summary.get('successSteps', 0)}")
                print(f"   Error Steps: {summary.get('errorSteps', 0)}")
                print(f"   Warning Steps: {summary.get('warningSteps', 0)}")
                print(f"   Total Duration: {summary.get('totalDuration', 0)}ms")
                
            else:
                print("❌ Debug endpoint failed!")
                print(f"Error: {data.get('error', 'Unknown error')}")
                
                if 'debugSteps' in data:
                    self.print_step_results(data['debugSteps'])
                    
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {e}")
            print(f"Response: {response.text}")
            return False
        
        return True
    
    def test_individual_tests(self):
        """Test individual test endpoints"""
        print(f"\n🧪 Running individual tests...")
        
        tests = [
            "api_connection",
            "fetch_raw_data", 
            "parse_data",
            "database_insert",
            "rate_limiting",
            "error_handling"
        ]
        
        url = f"{self.base_url}/api/hubspot/test"
        
        for test_type in tests:
            print(f"\n🔬 Testing: {test_type}")
            
            payload = {
                "testType": test_type,
                "objectType": "companies",
                "limit": 2
            }
            
            try:
                response = self.session.post(url, json=payload)
                response.raise_for_status()
                
                data = response.json()
                
                if data.get('success'):
                    print(f"✅ {test_type} passed")
                    # Print relevant results
                    results = data.get('results', {})
                    for key, value in results.items():
                        if isinstance(value, dict):
                            print(f"   {key}: {json.dumps(value, indent=2)}")
                        else:
                            print(f"   {key}: {value}")
                else:
                    print(f"❌ {test_type} failed: {data.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"❌ {test_type} error: {e}")
    
    def get_current_state(self):
        """Get current HubSpot sync state"""
        print(f"\n📊 Getting current state...")
        
        url = f"{self.base_url}/api/hubspot/debug"
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('success'):
                print("✅ Current state retrieved!")
                
                current_state = data.get('currentState', {})
                print(f"\n📈 DATABASE COUNTS:")
                for key, value in current_state.items():
                    print(f"   {key}: {value}")
                
                environment = data.get('environment', {})
                print(f"\n🔧 ENVIRONMENT:")
                print(f"   Has HubSpot API Key: {environment.get('hasHubSpotApiKey', False)}")
                print(f"   API Key Length: {environment.get('apiKeyLength', 0)}")
                print(f"   Node Environment: {environment.get('nodeEnv', 'unknown')}")
                
            else:
                print(f"❌ Failed to get current state: {data.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"❌ Get state error: {e}")

def main():
    """Main debugging workflow"""
    print("🚀 HubSpot Sync Debugger")
    print("="*50)
    
    debugger = HubSpotDebugger(BASE_URL)
    
    # Step 1: Get current state
    debugger.get_current_state()
    
    # Step 2: Run individual tests
    debugger.test_individual_tests()
    
    # Step 3: Test dry run sync
    debugger.test_debug_endpoint(sync_type="companies", limit=3, dry_run=True)
    
    # Step 4: Test actual sync with small limit
    print(f"\n❓ Do you want to run an actual sync test with 2 companies? (y/N): ", end="")
    user_input = input().strip().lower()
    
    if user_input == 'y':
        debugger.test_debug_endpoint(sync_type="companies", limit=2, dry_run=False)
    else:
        print("Skipping actual sync test.")
    
    print(f"\n✨ Debugging complete!")
    print(f"\nNext steps:")
    print(f"1. Check the debug output above for any errors")
    print(f"2. Look at your app logs for detailed error messages")
    print(f"3. Verify your HubSpot API key and permissions")
    print(f"4. Check your database connection and table structure")

if __name__ == "__main__":
    main() 