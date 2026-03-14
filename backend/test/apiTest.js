#!/usr/bin/env node
/**
 * Backend API Test Suite - Safe verification only
 * Tests public endpoints and expected auth failures
 * NO production code modification
 */

const BASE_URL = 'http://localhost:5000';

const tests = [
  {
    name: 'Health Check',
    method: 'GET',
    url: '/api/health',
    expectedStatus: 200,
    check: (res) => res.database === 'connected'
  },
  {
    name: 'Auth Login (invalid creds)',
    method: 'POST', 
    url: '/api/auth/login',
    body: { email: 'test@invalid.com', password: 'wrong' },
    expectedStatus: [400, 401, 422],
    check: (res) => res.message || res.error // expect error response
  },
  {
    name: 'Products List',
    method: 'GET',
    url: '/api/products',
    expectedStatus: 200,
    check: (res) => Array.isArray(res) && res.length >= 0
  },
  {
    name: 'Orders List (auth required)',
    method: 'GET',
    url: '/api/orders', 
    expectedStatus: 401,
    check: (res) => res.message?.includes('auth') || res.success === false
  }
];

async function testEndpoint(test) {
  try {
    const options = {
      method: test.method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (test.body) {
      options.body = JSON.stringify(test.body);
    }
    
    const response = await fetch(`${BASE_URL}${test.url}`, options);
    const data = await response.json();
    
    const statusMatch = test.expectedStatus.includes ? 
      test.expectedStatus.includes(response.status) : 
      response.status === test.expectedStatus;
    
    const result = statusMatch && (!test.check || test.check(data));
    
    console.log(`[TEST] ${test.name} → ${result ? 'PASS' : 'FAIL'} (status: ${response.status})`);
    return result ? 1 : 0;
    
  } catch (error) {
    console.log(`[TEST] ${test.name} → FAIL (connection error: ${error.message})`);
    return 0;
  }
}

async function runTests() {
  console.log('🧪 Starting Backend API Tests...\n');
  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log('Make sure server is running: cd backend && npm start\n');
  
  const results = await Promise.all(tests.map(testEndpoint));
  const passed = results.filter(Boolean).length;
  const total = tests.length;
  
  console.log('\n' + '='.repeat(50));
  console.log('## API TEST SUMMARY');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  console.log('='.repeat(50));
  
  process.exit(passed === total ? 0 : 1);
}

runTests();
