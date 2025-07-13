require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;
const cache = new NodeCache({ stdTTL: 600 });

// Middleware
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Import utility functions
const { replyMessage, getFileContent } = require('./utils/request');
const { generateResponse } = require('./utils/gemini');

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }

    for (const event of events) {
      if (event.type === 'message') {
        await handleMessage(event);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function handleMessage(event) {
  const { replyToken, message, source } = event;
  const userId = source.userId;

  try {
    let responseText = '';

    switch (message.type) {
      case 'text':
        const userText = message.text;
        const cachedFile = cache.get(userId);
        
        if (cachedFile) {
          responseText = await generateResponse(userText, cachedFile);
        } else {
          responseText = await generateResponse(userText);
        }
        break;

      case 'image':
      case 'video':
      case 'audio':
        const fileContent = await getFileContent(message.id);
        if (fileContent) {
          cache.set(userId, fileContent);
          responseText = 'คุณอยากรู้เรื่องอะไรจากไฟล์ที่คุณส่งมาครับ?';
        } else {
          responseText = 'ขออภัยครับ ไม่สามารถประมวลผลไฟล์ได้';
        }
        break;

      case 'file':
        responseText = 'ขออภัยครับ ยังไม่รองรับไฟล์ประเภทนี้';
        break;

      default:
        responseText = 'ขออภัยครับ ยังไม่รองรับข้อความประเภทนี้';
    }

    await replyMessage(replyToken, responseText);
  } catch (error) {
    console.error('Handle message error:', error);
    await replyMessage(replyToken, 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล');
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send('LINE Chatbot with Gemini AI is running! 🤖');
});

// Webhook verification endpoint
app.get('/webhook', (req, res) => {
  res.send('Webhook endpoint is ready!');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📱 Webhook URL: https://your-app-name.onrender.com/webhook`);
});