#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Field Data Collection Tracker
Tests all backend APIs with role-based access control verification
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://field-monitor-5.preview.emergentagent.com/api"

# Test credentials from seed data (as specified in review request)
TEST_USERS = {
    "admin": {"email": "admin@example.com", "password": "admin123"},
    "supervisor": {"email": "supervisor@example.com", "password": "supervisor123"},
    "enumerator": {"email": "enum1@example.com", "password": "enum123"}
}

class FieldTrackerAPITester:
    def __init__(self):
        self.tokens = {}
        self.users = {}
        self.test_results = []
        self.created_respondents = []
        self.created_messages = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, token: str = None, data: dict = None, params: dict = None):
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request exception: {e}")
            return None
    
    def test_authentication_apis(self):
        """Test authentication endpoints"""
        print("\n=== TESTING AUTHENTICATION APIs ===")
        
        # Test 1: Login with all user roles
        for role, credentials in TEST_USERS.items():
            response = self.make_request("POST", "/auth/login", data=credentials)
            
            if response and response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.tokens[role] = data["access_token"]
                    self.users[role] = data["user"]
                    self.log_result(
                        f"Login {role}",
                        True,
                        f"Successfully logged in as {role}",
                        f"User ID: {data['user']['id']}, Role: {data['user']['role']}"
                    )
                else:
                    self.log_result(f"Login {role}", False, "Invalid response format", str(data))
            else:
                error_msg = response.json() if response else "No response"
                self.log_result(f"Login {role}", False, f"Login failed", str(error_msg))
        
        # Test 2: Test /auth/me endpoint
        for role in self.tokens:
            response = self.make_request("GET", "/auth/me", token=self.tokens[role])
            
            if response and response.status_code == 200:
                user_data = response.json()
                if user_data.get("id") == self.users[role]["id"]:
                    self.log_result(f"Auth/me {role}", True, "Token validation successful")
                else:
                    self.log_result(f"Auth/me {role}", False, "User data mismatch")
            else:
                self.log_result(f"Auth/me {role}", False, "Token validation failed")
        
        # Test 3: Test registration (create new test user)
        new_user_data = {
            "username": "testuser",
            "email": "testuser@fieldtracker.com",
            "password": "testpass123",
            "role": "enumerator"
        }
        
        response = self.make_request("POST", "/auth/register", data=new_user_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.log_result("Registration", True, "New user registration successful")
            else:
                self.log_result("Registration", False, "Registration response invalid")
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Registration", False, "Registration failed", str(error_msg))
    
    def test_user_management_apis(self):
        """Test user management endpoints"""
        print("\n=== TESTING USER MANAGEMENT APIs ===")
        
        # Test 1: Get users with different roles
        for role in ["admin", "supervisor", "enumerator1"]:
            if role not in self.tokens:
                continue
                
            response = self.make_request("GET", "/users", token=self.tokens[role])
            
            if response and response.status_code == 200:
                users = response.json()
                self.log_result(
                    f"Get users ({role})",
                    True,
                    f"Retrieved {len(users)} users",
                    f"Role-based filtering applied for {role}"
                )
            else:
                self.log_result(f"Get users ({role})", False, "Failed to get users")
        
        # Test 2: Get enumerators
        for role in ["admin", "supervisor"]:
            if role not in self.tokens:
                continue
                
            response = self.make_request("GET", "/users/enumerators", token=self.tokens[role])
            
            if response and response.status_code == 200:
                enumerators = response.json()
                self.log_result(
                    f"Get enumerators ({role})",
                    True,
                    f"Retrieved {len(enumerators)} enumerators"
                )
            else:
                self.log_result(f"Get enumerators ({role})", False, "Failed to get enumerators")
    
    def test_respondent_apis(self):
        """Test respondent/survey CRUD operations"""
        print("\n=== TESTING RESPONDENT/SURVEY APIs ===")
        
        # Test 1: Create respondent (as admin)
        if "admin" in self.tokens:
            respondent_data = {
                "name": "John Doe Survey Respondent",
                "location": {
                    "latitude": 40.7128,
                    "longitude": -74.0060
                },
                "enumerator_id": self.users.get("enumerator1", {}).get("id")
            }
            
            response = self.make_request("POST", "/respondents", token=self.tokens["admin"], data=respondent_data)
            
            if response and response.status_code == 200:
                respondent = response.json()
                self.created_respondents.append(respondent["id"])
                self.log_result(
                    "Create respondent",
                    True,
                    f"Created respondent: {respondent['name']}",
                    f"ID: {respondent['id']}, Status: {respondent['status']}"
                )
            else:
                error_msg = response.json() if response else "No response"
                self.log_result("Create respondent", False, "Failed to create respondent", str(error_msg))
        
        # Test 2: Get respondents with different roles
        for role in ["admin", "supervisor", "enumerator1"]:
            if role not in self.tokens:
                continue
                
            response = self.make_request("GET", "/respondents", token=self.tokens[role])
            
            if response and response.status_code == 200:
                respondents = response.json()
                self.log_result(
                    f"Get respondents ({role})",
                    True,
                    f"Retrieved {len(respondents)} respondents",
                    f"Role-based filtering for {role}"
                )
            else:
                self.log_result(f"Get respondents ({role})", False, "Failed to get respondents")
        
        # Test 3: Get single respondent
        if self.created_respondents and "admin" in self.tokens:
            respondent_id = self.created_respondents[0]
            response = self.make_request("GET", f"/respondents/{respondent_id}", token=self.tokens["admin"])
            
            if response and response.status_code == 200:
                respondent = response.json()
                self.log_result("Get single respondent", True, f"Retrieved respondent: {respondent['name']}")
            else:
                self.log_result("Get single respondent", False, "Failed to get respondent")
        
        # Test 4: Update respondent status
        if self.created_respondents and "admin" in self.tokens:
            respondent_id = self.created_respondents[0]
            update_data = {
                "status": "in_progress",
                "survey_data": {"question1": "answer1", "question2": "answer2"}
            }
            
            response = self.make_request("PUT", f"/respondents/{respondent_id}", token=self.tokens["admin"], data=update_data)
            
            if response and response.status_code == 200:
                respondent = response.json()
                self.log_result(
                    "Update respondent",
                    True,
                    f"Updated respondent status to: {respondent['status']}"
                )
            else:
                self.log_result("Update respondent", False, "Failed to update respondent")
    
    def test_location_tracking_apis(self):
        """Test location tracking endpoints"""
        print("\n=== TESTING LOCATION TRACKING APIs ===")
        
        # Test 1: Create single location
        if "enumerator1" in self.tokens:
            location_data = {
                "user_id": self.users["enumerator1"]["id"],
                "latitude": 40.7589,
                "longitude": -73.9851,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = self.make_request("POST", "/locations", token=self.tokens["enumerator1"], data=location_data)
            
            if response and response.status_code == 200:
                location = response.json()
                self.log_result(
                    "Create location",
                    True,
                    f"Created location for user {location['user_id']}",
                    f"Lat: {location['latitude']}, Lng: {location['longitude']}"
                )
            else:
                error_msg = response.json() if response else "No response"
                self.log_result("Create location", False, "Failed to create location", str(error_msg))
        
        # Test 2: Batch location upload
        if "enumerator1" in self.tokens:
            batch_data = {
                "locations": [
                    {
                        "user_id": self.users["enumerator1"]["id"],
                        "latitude": 40.7505,
                        "longitude": -73.9934,
                        "timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat()
                    },
                    {
                        "user_id": self.users["enumerator1"]["id"],
                        "latitude": 40.7614,
                        "longitude": -73.9776,
                        "timestamp": (datetime.utcnow() - timedelta(minutes=10)).isoformat()
                    }
                ]
            }
            
            response = self.make_request("POST", "/locations/batch", token=self.tokens["enumerator1"], data=batch_data)
            
            if response and response.status_code == 200:
                result = response.json()
                self.log_result(
                    "Batch location upload",
                    True,
                    f"Uploaded {result['count']} locations"
                )
            else:
                self.log_result("Batch location upload", False, "Failed to upload batch locations")
        
        # Test 3: Get locations with role-based filtering
        for role in ["admin", "supervisor", "enumerator1"]:
            if role not in self.tokens:
                continue
                
            response = self.make_request("GET", "/locations", token=self.tokens[role])
            
            if response and response.status_code == 200:
                locations = response.json()
                self.log_result(
                    f"Get locations ({role})",
                    True,
                    f"Retrieved {len(locations)} locations",
                    f"Role-based filtering for {role}"
                )
            else:
                self.log_result(f"Get locations ({role})", False, "Failed to get locations")
        
        # Test 4: Get latest locations
        if "admin" in self.tokens:
            response = self.make_request("GET", "/locations/latest", token=self.tokens["admin"])
            
            if response and response.status_code == 200:
                latest_locations = response.json()
                self.log_result(
                    "Get latest locations",
                    True,
                    f"Retrieved {len(latest_locations)} latest locations"
                )
            else:
                self.log_result("Get latest locations", False, "Failed to get latest locations")
    
    def test_message_chat_apis(self):
        """Test message/chat endpoints including AI integration"""
        print("\n=== TESTING MESSAGE/CHAT APIs ===")
        
        # Test 1: Create AI message (should get Gemini response)
        if "enumerator1" in self.tokens:
            ai_message_data = {
                "message_type": "ai",
                "content": "How do I handle GPS issues during field data collection?"
            }
            
            response = self.make_request("POST", "/messages", token=self.tokens["enumerator1"], data=ai_message_data)
            
            if response and response.status_code == 200:
                message = response.json()
                has_ai_response = message.get("response") and message.get("answered")
                self.created_messages.append(message["id"])
                
                self.log_result(
                    "Create AI message",
                    has_ai_response,
                    f"AI message created with {'Gemini response' if has_ai_response else 'no response'}",
                    f"Response: {message.get('response', 'None')[:100]}..." if has_ai_response else "No AI response received"
                )
            else:
                error_msg = response.json() if response else "No response"
                self.log_result("Create AI message", False, "Failed to create AI message", str(error_msg))
        
        # Test 2: Create supervisor message
        if "enumerator1" in self.tokens and "supervisor" in self.users:
            supervisor_message_data = {
                "message_type": "supervisor",
                "receiver_id": self.users["supervisor"]["id"],
                "content": "I need help with survey completion procedures for difficult respondents."
            }
            
            response = self.make_request("POST", "/messages", token=self.tokens["enumerator1"], data=supervisor_message_data)
            
            if response and response.status_code == 200:
                message = response.json()
                self.created_messages.append(message["id"])
                self.log_result(
                    "Create supervisor message",
                    True,
                    f"Supervisor message sent to {message['receiver_id']}"
                )
            else:
                self.log_result("Create supervisor message", False, "Failed to create supervisor message")
        
        # Test 3: Get messages with filtering
        for role in ["enumerator1", "supervisor"]:
            if role not in self.tokens:
                continue
            
            # Get AI messages
            response = self.make_request("GET", "/messages", token=self.tokens[role], params={"message_type": "ai"})
            if response and response.status_code == 200:
                ai_messages = response.json()
                self.log_result(
                    f"Get AI messages ({role})",
                    True,
                    f"Retrieved {len(ai_messages)} AI messages"
                )
            else:
                self.log_result(f"Get AI messages ({role})", False, "Failed to get AI messages")
            
            # Get supervisor messages
            response = self.make_request("GET", "/messages", token=self.tokens[role], params={"message_type": "supervisor"})
            if response and response.status_code == 200:
                supervisor_messages = response.json()
                self.log_result(
                    f"Get supervisor messages ({role})",
                    True,
                    f"Retrieved {len(supervisor_messages)} supervisor messages"
                )
            else:
                self.log_result(f"Get supervisor messages ({role})", False, "Failed to get supervisor messages")
        
        # Test 4: Supervisor responds to message
        if self.created_messages and "supervisor" in self.tokens:
            # Find a supervisor message to respond to
            response = self.make_request("GET", "/messages", token=self.tokens["supervisor"], params={"message_type": "supervisor"})
            if response and response.status_code == 200:
                messages = response.json()
                if messages:
                    message_id = messages[0]["id"]
                    response_data = {
                        "response": "Please follow the standard protocol outlined in section 3.2 of the field manual. If the respondent continues to be uncooperative, document the interaction and move to the next respondent."
                    }
                    
                    response = self.make_request("PUT", f"/messages/{message_id}/respond", token=self.tokens["supervisor"], data=response_data)
                    
                    if response and response.status_code == 200:
                        self.log_result("Supervisor respond", True, "Supervisor response sent successfully")
                    else:
                        self.log_result("Supervisor respond", False, "Failed to send supervisor response")
        
        # Test 5: Batch message upload
        if "enumerator1" in self.tokens:
            batch_messages = {
                "messages": [
                    {
                        "sender_id": self.users["enumerator1"]["id"],
                        "message_type": "ai",
                        "content": "What should I do if my tablet battery is low?",
                        "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat()
                    },
                    {
                        "sender_id": self.users["enumerator1"]["id"],
                        "message_type": "ai", 
                        "content": "How to handle incomplete surveys?",
                        "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat()
                    }
                ]
            }
            
            response = self.make_request("POST", "/messages/batch", token=self.tokens["enumerator1"], data=batch_messages)
            
            if response and response.status_code == 200:
                result = response.json()
                self.log_result(
                    "Batch message upload",
                    True,
                    f"Uploaded {result['count']} messages"
                )
            else:
                self.log_result("Batch message upload", False, "Failed to upload batch messages")
    
    def test_faq_apis(self):
        """Test FAQ endpoints"""
        print("\n=== TESTING FAQ APIs ===")
        
        # Test 1: Get FAQs (should work without authentication)
        response = self.make_request("GET", "/faqs")
        
        if response and response.status_code == 200:
            faqs = response.json()
            self.log_result(
                "Get FAQs (no auth)",
                True,
                f"Retrieved {len(faqs)} FAQs without authentication"
            )
        else:
            self.log_result("Get FAQs (no auth)", False, "Failed to get FAQs")
        
        # Test 2: Create FAQ (admin only)
        if "admin" in self.tokens:
            faq_data = {
                "question": "How do I sync data when back online?",
                "answer": "The app will automatically sync all pending data when you reconnect to the internet. You can also manually trigger sync from the profile screen.",
                "category": "technical"
            }
            
            response = self.make_request("POST", "/faqs", token=self.tokens["admin"], data=faq_data)
            
            if response and response.status_code == 200:
                faq = response.json()
                self.log_result(
                    "Create FAQ (admin)",
                    True,
                    f"Created FAQ: {faq['question'][:50]}..."
                )
            else:
                self.log_result("Create FAQ (admin)", False, "Failed to create FAQ")
        
        # Test 3: Try to create FAQ as non-admin (should fail)
        if "enumerator1" in self.tokens:
            faq_data = {
                "question": "Test question",
                "answer": "Test answer",
                "category": "test"
            }
            
            response = self.make_request("POST", "/faqs", token=self.tokens["enumerator1"], data=faq_data)
            
            if response and response.status_code == 403:
                self.log_result(
                    "Create FAQ (non-admin)",
                    True,
                    "Correctly blocked non-admin from creating FAQ"
                )
            else:
                self.log_result("Create FAQ (non-admin)", False, "Should have blocked non-admin access")
    
    def test_dashboard_stats_api(self):
        """Test dashboard statistics endpoint"""
        print("\n=== TESTING DASHBOARD STATS API ===")
        
        # Test with different roles
        for role in ["admin", "supervisor", "enumerator1"]:
            if role not in self.tokens:
                continue
                
            response = self.make_request("GET", "/dashboard/stats", token=self.tokens[role])
            
            if response and response.status_code == 200:
                stats = response.json()
                required_fields = ["total_respondents", "pending", "in_progress", "completed", "active_enumerators", "total_enumerators"]
                
                has_all_fields = all(field in stats for field in required_fields)
                
                self.log_result(
                    f"Dashboard stats ({role})",
                    has_all_fields,
                    f"Retrieved stats for {role}",
                    f"Stats: {json.dumps(stats, indent=2)}"
                )
            else:
                self.log_result(f"Dashboard stats ({role})", False, "Failed to get dashboard stats")
    
    def test_unauthorized_access(self):
        """Test that unauthorized requests are properly blocked"""
        print("\n=== TESTING UNAUTHORIZED ACCESS ===")
        
        protected_endpoints = [
            ("GET", "/auth/me"),
            ("GET", "/users"),
            ("GET", "/respondents"),
            ("POST", "/respondents"),
            ("GET", "/locations"),
            ("POST", "/locations"),
            ("GET", "/messages"),
            ("POST", "/messages"),
            ("GET", "/dashboard/stats")
        ]
        
        for method, endpoint in protected_endpoints:
            response = self.make_request(method, endpoint)  # No token
            
            if response and response.status_code == 401:
                self.log_result(
                    f"Unauthorized {method} {endpoint}",
                    True,
                    "Correctly blocked unauthorized access"
                )
            else:
                status_code = response.status_code if response else "No response"
                self.log_result(
                    f"Unauthorized {method} {endpoint}",
                    False,
                    f"Should have returned 401, got {status_code}"
                )
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Field Data Collection Tracker Backend API Tests")
        print(f"Testing against: {BASE_URL}")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run test suites in order
        self.test_authentication_apis()
        self.test_user_management_apis()
        self.test_respondent_apis()
        self.test_location_tracking_apis()
        self.test_message_chat_apis()
        self.test_faq_apis()
        self.test_dashboard_stats_api()
        self.test_unauthorized_access()
        
        end_time = time.time()
        
        # Summary
        print("\n" + "=" * 80)
        print("🏁 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r["status"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print(f"Execution Time: {end_time - start_time:.2f} seconds")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print("\n" + "=" * 80)
        return failed_tests == 0

if __name__ == "__main__":
    tester = FieldTrackerAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)