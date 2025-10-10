import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import axios from 'axios';

const ApiTest = () => {
  const [testResults, setTestResults] = useState([]);

  const runTests = async () => {
    const results = [];
    
    // Test 1: Check API configuration
    results.push({
      test: 'API Configuration',
      result: `Base URL: ${API_ENDPOINTS.BASE_URL}`,
      status: 'info'
    });

    results.push({
      test: 'Users Endpoint',
      result: `${API_ENDPOINTS.USERS}`,
      status: 'info'
    });

    // Test 2: Test backend health
    try {
      const healthResponse = await axios.get(`${API_ENDPOINTS.BASE_URL}/api/test`);
      results.push({
        test: 'Backend Health',
        result: `✅ ${healthResponse.data.message}`,
        status: 'success'
      });
    } catch (error) {
      results.push({
        test: 'Backend Health',
        result: `❌ ${error.message}`,
        status: 'error'
      });
    }

    // Test 3: Test registration endpoint
    try {
      const regResponse = await axios.post(`${API_ENDPOINTS.USERS}/register`, {
        name: 'API Test User',
        email: 'apitest@example.com',
        password: 'test123',
        role: 'client'
      });
      results.push({
        test: 'Registration Endpoint',
        result: `✅ Registration works`,
        status: 'success'
      });
    } catch (error) {
      results.push({
        test: 'Registration Endpoint',
        result: `❌ ${error.response?.status} - ${error.response?.data?.message || error.message}`,
        status: 'error'
      });
    }

    setTestResults(results);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h3>API Connection Test</h3>
      <button onClick={runTests} style={{ padding: '10px', marginBottom: '20px' }}>
        Run API Tests
      </button>
      
      <div>
        {testResults.map((result, index) => (
          <div key={index} style={{ 
            margin: '10px 0', 
            padding: '10px', 
            backgroundColor: result.status === 'error' ? '#ffebee' : 
                           result.status === 'success' ? '#e8f5e8' : '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            <strong>{result.test}:</strong> {result.result}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApiTest;