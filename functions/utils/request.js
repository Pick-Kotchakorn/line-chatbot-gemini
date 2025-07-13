const axios = require('axios');

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
};

// แสดง Loading Animation
async function showLoadingAnimation(chatId) {
  try {
    const url = 'https://api.line.me/v2/bot/chat/loading/start';
    const data = {
      chatId: chatId,
      loadingSeconds: 20 // แสดง loading สูงสุด 20 วินาที
    };

    await axios.post(url, data, { headers });
    console.log('Loading animation started');
  } catch (error) {
    console.error('Loading animation error:', error.response?.data || error.message);
    // ถ้า loading ไม่ได้ ไม่ต้อง throw error เพราะไม่ส่งผลต่อการทำงานหลัก
  }
}

// แสดง Typing Indicator (เลือกใช้แทน Loading Animation ได้)
async function showTypingIndicator(chatId) {
  try {
    const url = 'https://api.line.me/v2/bot/chat/typing';
    const data = {
      chatId: chatId
    };

    await axios.post(url, data, { headers });
    console.log('Typing indicator started');
  } catch (error) {
    console.error('Typing indicator error:', error.response?.data || error.message);
  }
}

// ส่งข้อความตอบกลับ
async function replyMessage(replyToken, message) {
  try {
    const url = 'https://api.line.me/v2/bot/message/reply';
    const data = {
      replyToken: replyToken,
      messages: [{ 
        type: 'text', 
        text: message 
      }]
    };

    const response = await axios.post(url, data, { headers });
    console.log('Message sent successfully');
    return response.data;
  } catch (error) {
    console.error('Reply message error:', error.response?.data || error.message);
    throw error;
  }
}

// ส่งข้อความแบบ Push
async function pushMessage(userId, message) {
  try {
    const url = 'https://api.line.me/v2/bot/message/push';
    const data = {
      to: userId,
      messages: [{ 
        type: 'text', 
        text: message 
      }]
    };

    const response = await axios.post(url, data, { headers });
    console.log('Push message sent successfully');
    return response.data;
  } catch (error) {
    console.error('Push message error:', error.response?.data || error.message);
    throw error;
  }
}

// ดาวน์โหลดไฟล์จาก LINE
async function getFileContent(messageId) {
  try {
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const response = await axios.get(url, { 
      headers,
      responseType: 'arraybuffer'
    });
    
    // แปลง buffer เป็น base64 สำหรับ Gemini API
    const base64Data = Buffer.from(response.data).toString('base64');
    const mimeType = response.headers['content-type'] || 'application/octet-stream';
    
    return {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };
  } catch (error) {
    console.error('Get file content error:', error.response?.data || error.message);
    return null;
  }
}

module.exports = {
  showLoadingAnimation,
  showTypingIndicator,
  replyMessage,
  pushMessage,
  getFileContent
};