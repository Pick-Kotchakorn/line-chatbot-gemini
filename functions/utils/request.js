const axios = require('axios');

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
};

// ตรวจสอบประเภทแชทและส่งคืน Chat ID ที่ถูกต้อง
function getChatId(source) {
  if (source.type === 'group') {
    return source.groupId;
  } else if (source.type === 'room') {
    return source.roomId;
  } else {
    return source.userId; // user หรือ 1:1 chat
  }
}

// แสดง Loading Indicator (วงกลมหมุน)
async function showLoadingIndicator(source, duration = 10) {
  try {
    const chatId = getChatId(source);
    const url = 'https://api.line.me/v2/bot/chat/loading/start';
    const data = {
      chatId: chatId,
      loadingSeconds: duration
    };

    await axios.post(url, data, { headers });
    console.log(`Loading indicator started for ${source.type}:`, chatId, `(${duration}s)`);
    return true;
  } catch (error) {
    console.error('Loading indicator error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.details
    });
    return false;
  }
}

// แสดง Typing Indicator (กำลังพิมพ์...)
async function showTypingIndicator(source) {
  try {
    const chatId = getChatId(source);
    const url = 'https://api.line.me/v2/bot/chat/typing';
    const data = {
      chatId: chatId
    };

    await axios.post(url, data, { headers });
    console.log(`Typing indicator started for ${source.type}:`, chatId);
    return true;
  } catch (error) {
    console.error('Typing indicator error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.details
    });
    return false;
  }
}

// แสดง Loading/Typing ตามลำดับความสำคัญ
async function showProcessingIndicator(source, preferLoading = false, duration = 10) {
  const startTime = Date.now();
  
  try {
    // ลองใช้ Loading Indicator ก่อน (ถ้าต้องการ)
    if (preferLoading) {
      const loadingSuccess = await showLoadingIndicator(source, duration);
      if (loadingSuccess) {
        return { type: 'loading', duration, success: true };
      }
    }
    
    // ถ้า Loading ไม่ได้หรือไม่ต้องการ ใช้ Typing
    const typingSuccess = await showTypingIndicator(source);
    if (typingSuccess) {
      return { type: 'typing', success: true };
    }
    
    // ถ้าทั้งสองไม่ได้
    console.warn('Both loading and typing indicators failed');
    return { type: 'none', success: false };
    
  } catch (error) {
    console.error('Processing indicator error:', error);
    return { type: 'error', success: false };
  } finally {
    const endTime = Date.now();
    console.log(`Indicator setup took: ${endTime - startTime}ms`);
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
    console.error('Reply message error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      replyToken: replyToken ? 'exists' : 'missing'
    });
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
    console.error('Push message error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw error;
  }
}

// ดาวน์โหลดไฟล์จาก LINE
async function getFileContent(messageId) {
  try {
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const response = await axios.get(url, { 
      headers,
      responseType: 'arraybuffer',
      timeout: 30000 // 30 วินาที
    });
    
    // แปลง buffer เป็น base64 สำหรับ Gemini API
    const base64Data = Buffer.from(response.data).toString('base64');
    const mimeType = response.headers['content-type'] || 'application/octet-stream';
    
    console.log(`File downloaded: ${mimeType}, size: ${response.data.length} bytes`);
    
    return {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };
  } catch (error) {
    console.error('Get file content error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      messageId: messageId
    });
    return null;
  }
}

module.exports = {
  getChatId,
  showLoadingIndicator,
  showTypingIndicator,
  showProcessingIndicator,
  replyMessage,
  pushMessage,
  getFileContent
};