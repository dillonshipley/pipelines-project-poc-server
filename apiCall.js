
import https from 'https';
import axios from 'axios';
import { token } from './token.js';
const agent = new https.Agent({ rejectUnauthorized: false });

export default async function apiCall(url, method = "get"){
    try {
        if(method == "get"){
            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                httpsAgent: agent // Pass the agent here
            });
            console.log("Call to " + url + " succeeded!");
            return response.data;
        } else if (method == "post"){
            console.log("Response...?");
            const response = await axios.post(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                httpsAgent: agent // Pass the agent here
            });
            return response.data;
        }
    } catch (error) {
        console.log("Fetching information from " + url + " failed.");
        return "ERROR";
    }

}

