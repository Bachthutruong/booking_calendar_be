const axios = require('axios');

// Test the cron endpoints
async function testCronEndpoints() {
  const baseURL = 'http://localhost:5004/api';
  
  try {
    console.log('Testing cron endpoints...');
    
    // Test reminder emails endpoint
    console.log('\n1. Testing send reminder emails...');
    try {
      const response = await axios.post(`${baseURL}/cron/send-reminders`, {}, {
        headers: {
          'Authorization': 'Bearer your-admin-token-here', // Replace with actual admin token
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Send reminders response:', response.data);
    } catch (error) {
      console.log('❌ Send reminders error:', error.response?.data || error.message);
    }
    
    // Test reminder emails endpoint
    console.log('\n2. Testing test reminder emails...');
    try {
      const response = await axios.post(`${baseURL}/cron/test-reminders`, {}, {
        headers: {
          'Authorization': 'Bearer your-admin-token-here', // Replace with actual admin token
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Test reminders response:', response.data);
    } catch (error) {
      console.log('❌ Test reminders error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testCronEndpoints();
