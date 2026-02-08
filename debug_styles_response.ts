
import fetch from 'node-fetch';

async function checkResponse() {
    try {
        const response = await fetch('http://localhost:3001/api/styles/private?page=1&pageSize=1');
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkResponse();
