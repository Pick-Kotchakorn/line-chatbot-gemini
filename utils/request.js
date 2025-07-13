const axios = require('axios');

const LINE_API_URL = 'https://api.line.me/v2/bot';
const headers = {
  'Authorization': `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

async function replyMessage(replyToken, text) {
  try {
    const body = {
      replyToken: replyToken,
      messages: [
        {
          type: 'text',
          text: text,
        },
      ],
    };

    await axios.post(`${LINE_API_URL}/message/reply`, body, { headers });
    console.log('Reply sent successfully');
  } catch (error) {
    console.error('Error sending reply:', error.response?.data || error.message);
  }
}

async function getFileContent(messageId) {
  try {
    const response = await axios.get(`${LINE_API_URL}/message/${messageId}/content`, {
      headers,
      responseType: 'arraybuffer',
    });

    return {
      data: response.data,
      mimeType: response.headers['content-type'],
    };
  } catch (error) {
    console.error('Error getting file content:', error.response?.data || error.message);
    return null;
  }
}

async function getUserProfile(userId) {
  try {
    const response = await axios.get(`${LINE_API_URL}/profile/${userId}`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error.response?.data || error.message);
    return null;
  }
}

module.exports = {
  replyMessage,
  getFileContent,
  getUserProfile,
};