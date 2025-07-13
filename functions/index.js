require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const port = process.env.PORT || 3000;
const cache = new NodeCache({ stdTTL: 600 });

// Middleware
app.use(express.json());

// Import utility functions
const { replyMessage, getFileContent } = require('./utils/request');
const gemini = require('./utils/gemini');

// ข้อความต้อนรับเมื่อเพิ่มเพื่อน
const WELCOME_MESSAGE = `สวัสดีครับ! ยินดีต้อนรับสู่ Unagi Yondaime Kikukawa 🍱

ผมทาโร่ครับ พร้อมให้บริการและตอบคำถามเกี่ยวกับ:
🍽️ เมนูอาหารและราคา
📍 ข้อมูลสาขาทั้ง 3 แห่ง
⏰ เวลาเปิด-ปิด การจองโต๊ะ
🚗 การสั่งอาหาร Grab Food
👥 การสมัครสมาชิก

พิมพ์ "เมนู" เพื่อดูเมนูยอดนิยม หรือถามอะไรก็ได้เลยครับ! 😊`;

// คำสั่งพิเศษ
const SPECIAL_COMMANDS = {
  'เมนู': () => gemini.getMenuRecommendation('popular').th,
  'menu': () => gemini.getMenuRecommendation('popular').en,
  'メニュー': () => gemini.getMenuRecommendation('popular').jp,
  'ลันช์': () => gemini.getMenuRecommendation('lunch').th,
  'lunch': () => gemini.getMenuRecommendation('lunch').en,
  'ランチ': () => gemini.getMenuRecommendation('lunch').jp,
  'สาขา': () => `📍 สาขาทั้ง 3 แห่ง:

1. EmQuartier (ชั้น 6) - BTS พร้อมพงษ์
   เวลา: 10:00-22:00 น.

2. One Bangkok (ชั้น 1) - BTS ชิดลม  
   เวลา: 10:00-22:00 น.
   Tel: 092 249 0555

3. King Square (ชั้น 2) - MRT ศูนย์วัฒนธรรม
   เวลา: 11:00-21:00 น.
   Tel: 065 537 9444`,
  'สั่งอาหาร': () => `🚗 สั่งอาหารผ่าน Grab Food:
https://bit.ly/4b8BHZK

👥 สมัครสมาชิก LOGA App:
https://www.loga.app/line/5905`,
  'order': () => `🚗 Order via Grab Food:
https://bit.ly/4b8BHZK

👥 Join membership LOGA App:
https://www.loga.app/line/5905`
};

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }

    for (const event of events) {
      await handleEvent(event);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function handleEvent(event) {
  const { type, replyToken, message, source } = event;
  
  try {
    if (type === 'follow') {
      // ลูกค้าเพิ่มเพื่อน
      await replyMessage(replyToken, WELCOME_MESSAGE);
      return;
    }
    
    if (type === 'message') {
      await handleMessage(event);
    }
  } catch (error) {
    console.error('Handle event error:', error);
  }
}

async function handleMessage(event) {
  const { replyToken, message, source } = event;
  const userId = source.userId;

  try {
    let responseText = '';

    switch (message.type) {
      case 'text':
        const userText = message.text.trim();
        
        // ตรวจสอบคำสั่งพิเศษ
        const lowerText = userText.toLowerCase();
        if (SPECIAL_COMMANDS[userText] || SPECIAL_COMMANDS[lowerText]) {
          responseText = SPECIAL_COMMANDS[userText] || SPECIAL_COMMANDS[lowerText];
          if (typeof responseText === 'function') {
            responseText = responseText();
          }
        } else {
          // ใช้ AI ตอบคำถาม
          const cachedFile = cache.get(userId);
          responseText = await gemini.generateResponse(userText, cachedFile);
        }
        break;

      case 'image':
      case 'video':
      case 'audio':
        try {
          const fileContent = await getFileContent(message.id);
          if (fileContent) {
            cache.set(userId, fileContent);
            responseText = 'ได้รับไฟล์แล้วครับ! คุณอยากให้ผมช่วยอะไรเกี่ยวกับไฟล์นี้ไหมครับ? หรือมีคำถามอื่นเกี่ยวกับร้าน Unagi Yondaime Kikukawa ไหมครับ? 😊';
          } else {
            responseText = 'ขออภัยครับ ไม่สามารถประมวลผลไฟล์ได้ในขณะนี้ครับ มีอะไรให้ผมช่วยเรื่องร้านอาหารไหมครับ?';
          }
        } catch (error) {
          console.error('File processing error:', error);
          responseText = 'ขออภัยครับ เกิดปัญหาในการประมวลผลไฟล์ครับ มีคำถามอื่นเกี่ยวกับร้านไหมครับ?';
        }
        break;

      case 'sticker':
        responseText = 'ขอบคุณสำหรับ sticker ครับ! 😊 มีอะไรให้ผมช่วยเรื่องร้าน Unagi Yondaime Kikukawa ไหมครับ?';
        break;

      case 'location':
        responseText = `ขอบคุณที่แชร์ location ครับ! 📍

สาขาใกล้คุณ:
1. EmQuartier (ชั้น 6) - BTS พร้อมพงษ์
2. One Bangkok (ชั้น 1) - BTS ชิดลม
3. King Square (ชั้น 2) - MRT ศูนย์วัฒนธรรม

ต้องการทราบข้อมูลสาขาไหนเพิ่มเติมครับ?`;
        break;

      default:
        responseText = 'ขออภัยครับ ผมยังไม่เข้าใจข้อความนี้ครับ มีคำถามเกี่ยวกับร้าน Unagi Yondaime Kikukawa ไหมครับ? พิมพ์ "เมนู" เพื่อดูเมนูยอดนิยมครับ! 😊';
    }

    if (responseText) {
      await replyMessage(replyToken, responseText);
    }

  } catch (error) {
    console.error('Handle message error:', error);
    await replyMessage(replyToken, 'ขออภัยครับ เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งครับ หรือติดต่อเจ้าหน้าที่ได้ที่ 092 249 0555 ครับ');
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
      <h1>🍱 Unagi Yondaime Kikukawa LINE Bot</h1>
      <p>ระบบ AI ช่วยตอบคำถามลูกค้า พร้อมให้บริการ! 🤖</p>
      <p>Powered by Gemini AI & ทาโร่ 😊</p>
    </div>
  `);
});

// Webhook verification endpoint
app.get('/webhook', (req, res) => {
  res.send('Unagi Yondaime Kikukawa Webhook endpoint is ready! 🍱');
});

app.listen(port, () => {
  console.log(`🚀 Unagi Yondaime Kikukawa Bot Server running on port ${port}`);
  console.log(`📱 Webhook URL: https://your-app-name.onrender.com/webhook`);
  console.log(`🤖 AI Assistant "ทาโร่" is ready to help customers!`);
});