import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import axios from 'axios';

const ApiTest = () => {
  const [status, setStatus] = useState('Testing...');
  const [therapists, setTherapists] = useState([]);

  useEffect(() => {
    testApi();
  }, []);

  const testApi = async () => {
    try {
      console.log('🧪 Testing API connection to:', API_ENDPOINTS.PSYCHOLOGISTS);
      
      const response = await axios.get(API_ENDPOINTS.PSYCHOLOGISTS);
      console.log('✅ API Response:', response.data);
      
      setStatus('✅ API Connected Successfully');
      setTherapists(response.data.slice(0, 3));
    } catch (error) {
      console.error('❌ API Error:', error);
      setStatus(`❌ API Error: ${error.message}`);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'white', 
      padding: '10px', 
      border: '1px solid #ccc',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>API Status:</strong> {status}</div>
      <div><strong>Therapists Found:</strong> {therapists.length}</div>
      {therapists.map((t, i) => (
        <div key={i}>• {t.name}</div>
      ))}
    </div>
  );
};

export default ApiTest;