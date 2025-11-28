#!/usr/bin/env python3
"""
Priority Backend API Testing Script for Field Data Collection App
Focuses on the specific APIs mentioned in the review request
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://field-monitor-5.preview.emergentagent.com/api"

# Test credentials from seed data (as specified in review request)
TEST_USERS = {
    "admin": {"email": "admin@example.com", "password": "admin123"},
    "supervisor": {"email": "supervisor@example.com", "password": "supervisor123"},
    "enumerator": {"email": "enum1@example.com", "password": "enum123"}
}

class PriorityAPITester:
    def __init__(self):
        self.tokens = {}
        self.users = {}
        self.test_results = []
        self.survey_id = None
        
    def log_result(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
        if not success and details:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None, params: Dict = None) -> Dict:
        """Make HTTP request with error handling"""
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
            else:
                return {"error": f"Unsupported method: {method}"}
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": 200 <= response.status_code < 300
            }
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "success": False}
        except json.JSONDecodeError as e:
            return {"error": f"JSON decode error: {e}", "success": False}
    
    def test_authentication_api(self):
        """Test Authentication API (/api/auth/login, /api/auth/register)"""
        print("\n=== PRIORITY TEST 1: Authentication API ===")
        
        # Test login with correct credentials
        for role, creds in TEST_USERS.items():
            result = self.make_request("POST", "/auth/login", creds)
            
            if result.get("success") and "access_token" in result.get("data", {}):
                self.tokens[role] = result["data"]["access_token"]
                user_data = result["data"].get("user", {})
                self.users[role] = user_data
                self.log_result(
                    f"Login {role} (correct credentials)",
                    True,
                    f"Successfully logged in as {role}",
                    f"User ID: {user_data.get('id')}, Role: {user_data.get('role')}"
                )
            else:
                self.log_result(
                    f"Login {role} (correct credentials)",
                    False,
                    f"Failed to login as {role}",
                    result.get("error") or result.get("data")
                )
        
        # Test login with incorrect credentials
        invalid_creds = {"email": "admin@example.com", "password": "wrongpassword"}
        result = self.make_request("POST", "/auth/login", invalid_creds)
        
        if result.get("status_code") == 401:
            self.log_result("Login (incorrect credentials)", True, "Correctly rejected invalid credentials")
        else:
            self.log_result("Login (incorrect credentials)", False, "Should reject invalid credentials", result)
        
        # Test register new user
        new_user = {
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "testpass123",
            "role": "enumerator"
        }
        result = self.make_request("POST", "/auth/register", new_user)
        
        if result.get("success") and "access_token" in result.get("data", {}):
            self.log_result("Register new user", True, "Successfully registered new user")
        else:
            self.log_result("Register new user", False, "Failed to register new user", result)
        
        # Test JWT token generation
        if "admin" in self.tokens:
            result = self.make_request("GET", "/auth/me", token=self.tokens["admin"])
            if result.get("success"):
                self.log_result("JWT token generation", True, "JWT token validation working")
            else:
                self.log_result("JWT token generation", False, "JWT token validation failed", result)
    
    def test_survey_detail_api(self):
        """Test Survey Detail API (/api/surveys/{survey_id})"""
        print("\n=== PRIORITY TEST 2: Survey Detail API ===")
        
        if "admin" not in self.tokens:
            self.log_result("Survey Detail Tests", False, "No admin token available")
            return
        
        admin_token = self.tokens["admin"]
        
        # First get list of surveys to find a valid survey_id
        result = self.make_request("GET", "/surveys", token=admin_token)
        if result.get("success"):
            surveys = result.get("data", [])
            if surveys:
                self.survey_id = surveys[0].get("id")
                self.log_result("Get surveys list", True, f"Found {len(surveys)} surveys")
            else:
                self.log_result("Get surveys list", False, "No surveys found in database")
                return
        else:
            self.log_result("Get surveys list", False, "Failed to retrieve surveys", result)
            return
        
        # Test get survey details with valid survey_id
        result = self.make_request("GET", f"/surveys/{self.survey_id}", token=admin_token)
        if result.get("success"):
            survey_data = result.get("data", {})
            required_fields = ["id", "title", "description", "region_level", "region_name", "start_date", "end_date"]
            missing_fields = [field for field in required_fields if field not in survey_data]
            
            if not missing_fields:
                self.log_result(
                    "Survey detail (valid ID)",
                    True,
                    "Survey detail contains all required fields",
                    f"Survey: {survey_data.get('title')}, Region: {survey_data.get('region_name')}"
                )
            else:
                self.log_result(
                    "Survey detail (valid ID)",
                    False,
                    f"Missing required fields: {missing_fields}",
                    survey_data
                )
        else:
            self.log_result("Survey detail (valid ID)", False, "Failed to get survey details", result)
        
        # Test get survey details with invalid survey_id
        result = self.make_request("GET", "/surveys/invalid_survey_id_123", token=admin_token)
        if result.get("status_code") == 404:
            self.log_result("Survey detail (invalid ID)", True, "Correctly returned 404 for invalid survey ID")
        else:
            self.log_result("Survey detail (invalid ID)", False, "Should return 404 for invalid survey ID", result)
    
    def test_survey_stats_api(self):
        """Test Survey Stats API (/api/surveys/{survey_id}/stats)"""
        print("\n=== PRIORITY TEST 3: Survey Stats API ===")
        
        if not self.survey_id:
            self.log_result("Survey Stats Tests", False, "No survey ID available for testing")
            return
        
        # Test with different user roles
        for role, token in self.tokens.items():
            if not token:
                continue
                
            result = self.make_request("GET", f"/surveys/{self.survey_id}/stats", token=token)
            
            if result.get("success"):
                stats_data = result.get("data", {})
                required_fields = ["survey_id", "total_respondents", "pending", "in_progress", "completed", "completion_rate"]
                missing_fields = [field for field in required_fields if field not in stats_data]
                
                if not missing_fields:
                    self.log_result(
                        f"Survey stats ({role})",
                        True,
                        f"Stats retrieved successfully for {role}",
                        f"Total: {stats_data.get('total_respondents')}, Completed: {stats_data.get('completed')}, Rate: {stats_data.get('completion_rate')}%"
                    )
                else:
                    self.log_result(
                        f"Survey stats ({role})",
                        False,
                        f"Missing required fields: {missing_fields}",
                        stats_data
                    )
            else:
                self.log_result(f"Survey stats ({role})", False, f"Failed to get stats for {role}", result)
        
        # Test with invalid survey ID
        if "admin" in self.tokens:
            result = self.make_request("GET", "/surveys/invalid_id_123/stats", token=self.tokens["admin"])
            # Should either return 404 or return stats with 0 values
            if result.get("status_code") == 404 or (result.get("success") and result.get("data", {}).get("total_respondents") == 0):
                self.log_result("Survey stats (invalid ID)", True, "Handled invalid survey ID correctly")
            else:
                self.log_result("Survey stats (invalid ID)", False, "Should handle invalid survey ID", result)
    
    def test_chat_message_apis(self):
        """Test Chat/Message APIs (/api/messages/create, /api/messages)"""
        print("\n=== PRIORITY TEST 4: Chat/Message APIs ===")
        
        if "enumerator" not in self.tokens:
            self.log_result("Message Tests", False, "No enumerator token available")
            return
        
        enum_token = self.tokens["enumerator"]
        
        # Test create message with message_type='ai'
        ai_message = {
            "message_type": "ai",
            "content": "How do I handle GPS issues during data collection?"
        }
        result = self.make_request("POST", "/messages", ai_message, token=enum_token)
        
        if result.get("success"):
            message_data = result.get("data", {})
            # Check for ObjectId serialization issues
            has_objectid_error = any(
                str(value).startswith("ObjectId(") for value in message_data.values() 
                if isinstance(value, str)
            )
            
            if has_objectid_error:
                self.log_result(
                    "Create AI message",
                    False,
                    "ObjectId serialization error detected",
                    "Found ObjectId strings in response"
                )
            else:
                has_response = message_data.get("response") and message_data.get("answered")
                self.log_result(
                    "Create AI message",
                    True,
                    f"AI message created successfully {'with Gemini response' if has_response else '(no AI response)'}",
                    f"Response: {message_data.get('response', 'None')[:100]}..." if has_response else None
                )
        else:
            self.log_result("Create AI message", False, "Failed to create AI message", result)
        
        # Test create message with message_type='supervisor'
        supervisor_message = {
            "message_type": "supervisor",
            "content": "Need assistance with respondent assignment",
            "receiver_id": self.users.get("supervisor", {}).get("id")
        }
        result = self.make_request("POST", "/messages", supervisor_message, token=enum_token)
        
        if result.get("success"):
            message_data = result.get("data", {})
            # Check for ObjectId serialization issues
            has_objectid_error = any(
                str(value).startswith("ObjectId(") for value in message_data.values() 
                if isinstance(value, str)
            )
            
            if has_objectid_error:
                self.log_result(
                    "Create supervisor message",
                    False,
                    "ObjectId serialization error detected",
                    "Found ObjectId strings in response"
                )
            else:
                self.log_result("Create supervisor message", True, "Supervisor message created successfully")
        else:
            self.log_result("Create supervisor message", False, "Failed to create supervisor message", result)
        
        # Test get messages filtered by message_type
        for message_type in ["ai", "supervisor"]:
            result = self.make_request("GET", "/messages", token=enum_token, params={"message_type": message_type})
            
            if result.get("success"):
                messages = result.get("data", [])
                # Check for ObjectId serialization issues
                serialization_ok = True
                for msg in messages:
                    if any(str(value).startswith("ObjectId(") for value in msg.values() if isinstance(value, str)):
                        serialization_ok = False
                        break
                
                if serialization_ok:
                    self.log_result(
                        f"Get messages ({message_type})",
                        True,
                        f"Retrieved {len(messages)} {message_type} messages without serialization errors"
                    )
                else:
                    self.log_result(
                        f"Get messages ({message_type})",
                        False,
                        "ObjectId serialization error detected",
                        "Found ObjectId strings in response"
                    )
            else:
                self.log_result(f"Get messages ({message_type})", False, f"Failed to get {message_type} messages", result)
    
    def run_priority_tests(self):
        """Run all priority tests"""
        print("🚀 Starting Priority Backend API Tests")
        print(f"Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Run priority tests in order
        self.test_authentication_api()
        self.test_survey_detail_api()
        self.test_survey_stats_api()
        self.test_chat_message_apis()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 PRIORITY TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)
        return failed_tests == 0

if __name__ == "__main__":
    tester = PriorityAPITester()
    success = tester.run_priority_tests()
    sys.exit(0 if success else 1)