#!/usr/bin/env python3
"""
Debug specific failing endpoints
"""

import requests
import json

BASE_URL = "https://fieldtrack-15.preview.emergentagent.com/api"

# Login as admin first
login_data = {"email": "admin@fieldtracker.com", "password": "admin123"}
response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=30)
if response.status_code == 200:
    token = response.json()["access_token"]
    print(f"✅ Login successful, token: {token[:20]}...")
else:
    print(f"❌ Login failed: {response.status_code}")
    exit(1)

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Test 1: Registration
print("\n=== Testing Registration ===")
new_user = {
    "username": "debuguser",
    "email": "debuguser@test.com",
    "password": "test123",
    "role": "enumerator"
}

try:
    response = requests.post(f"{BASE_URL}/auth/register", json=new_user, timeout=30)
    print(f"Registration status: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Registration error: {e}")

# Test 2: Create location
print("\n=== Testing Create Location ===")
location_data = {
    "user_id": "test_user_id",
    "latitude": 40.7128,
    "longitude": -74.0060
}

try:
    response = requests.post(f"{BASE_URL}/locations", json=location_data, headers=headers, timeout=30)
    print(f"Create location status: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Create location error: {e}")

# Test 3: Create AI message
print("\n=== Testing Create AI Message ===")
ai_message = {
    "message_type": "ai",
    "content": "Test AI message"
}

try:
    response = requests.post(f"{BASE_URL}/messages", json=ai_message, headers=headers, timeout=30)
    print(f"Create AI message status: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Create AI message error: {e}")

# Test 4: Create FAQ
print("\n=== Testing Create FAQ ===")
faq_data = {
    "question": "Test question?",
    "answer": "Test answer",
    "category": "test"
}

try:
    response = requests.post(f"{BASE_URL}/faqs", json=faq_data, headers=headers, timeout=30)
    print(f"Create FAQ status: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Create FAQ error: {e}")

# Test 5: Unauthorized request
print("\n=== Testing Unauthorized Request ===")
try:
    response = requests.get(f"{BASE_URL}/auth/me", timeout=30)  # No token
    print(f"Unauthorized status: {response.status_code}")
    if response.status_code != 401:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Unauthorized request error: {e}")