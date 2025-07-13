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
const { showLoadingAnimation, replyMessage, getFileContent } = require('./utils/request');
const gemini = require('./utils/gemini');

// ข้อความต้อนรับเมื่อเพิ่มเพื่อน
const WELCOME_MESSAGE = `สวัสดีครับ! ยินดีต้อนรับร้าน Unagi Yondaime Kikukawa 🍱

มีอะไรให้ช่วยไหมครับ?
• ดูเมนู → พิมพ์ "เมนู"
• ข้อมูลสาขา → พิมพ์ "สาขา"  
• สั่งอาหาร → พิมพ์ "สั่งอาหาร"

ถามอะไรมาได้เลยครับ! 😊`;

// คำสั่งพิเศษ
const SPECIAL_COMMANDS = {
  'เมนู': () => `🍱 เมนูยอดนิยม:
• ひつまぶし (ฮิตสึมาบุชิ) - 1,050฿
• 一本重 (อิปปง อุนางิ) - 1,250฿  
• うな丼 (อุนาดง) - 680฿

ต้องการดูเมนูอื่นไหมครับ?`,

  'สาขา': () => `📍 สาขาทั้ง 3 แห่ง:

🏪 EmQuartier ชั้น 6 (BTS พร้อมพงษ์)
เวลา: 10:00-22:00 น.

🏪 One Bangkok ชั้น 1 (BTS ชิดลม)  
เวลา: 10:00-22:00 น. | Tel: 092-249-0555

🏪 King Square ชั้น 2 (MRT ศูนย์วัฒนธรรม)
เวลา: 11:00-21:00 น. | Tel: 065-537-9444`,

  'สั่งอาหาร': () => `🚗 สั่งอาหาร Grab: https://bit.ly/4b8BHZK
👥 สมัครสมาชิก: https://www.loga.app/line/5905`,

  'menu': () => `🍱 Popular Menu:
• Hitsumabushi - 1,050 THB
• Ippon Unagi Set - 1,250 THB
• Una Don - 680 THB`,

  'order': () => `🚗 Grab Food: https://bit.ly/4b8BHZK
👥 Membership: https://www.loga.app/line/5905`
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
  const chatId = source.type === 'group' ? source.groupId : 
                 source.type === 'room' ? source.roomId : userId;

  try {
    let responseText = '';
    let needsAI = false; // ตัวแปรเช็คว่าต้องใช้ AI หรือไม่

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
          // ต้องใช้ AI - แสดง Loading
          needsAI = true;
          await showLoadingAnimation(chatId);
          
          const cachedFile = cache.get(userId);
          responseText = await gemini.generateResponse(userText, cachedFile);
        }
        break;

      case 'image':
      case 'video':
      case 'audio':
        // แสดง Loading เพราะต้องประมวลผลไฟล์
        await showLoadingAnimation(chatId);
        
        try {
          const fileContent = await getFileContent(message.id);
          if (fileContent) {
            cache.set(userId, fileContent);
            responseText = 'ได้รับไฟล์แล้วครับ! มีอะไรให้ช่วยเกี่ยวกับไฟล์นี้ไหมครับ? 😊';
          } else {
            responseText = 'ขออภัยครับ ไม่สามารถอ่านไฟล์ได้ มีอะไรให้ช่วยเรื่องร้านไหมครับ?';
          }
        } catch (error) {
          console.error('File processing error:', error);
          responseText = 'ขออภัยครับ เกิดปัญหาในการประมวลผลไฟล์ครับ มีคำถามอื่นเกี่ยวกับร้านไหมครับ?';
        }
        break;

      case 'sticker':
        responseText = 'ขอบคุณ sticker ครับ! 😊 มีอะไรให้ช่วยไหมครับ?';
        break;

      case 'location':
        responseText = `ขอบคุณที่แชร์ location ครับ! 📍

สาขาใกล้คุณ:
🏪 EmQuartier - BTS พร้อมพงษ์
🏪 One Bangkok - BTS ชิดลม  
🏪 King Square - MRT ศูนย์วัฒนธรรม

อยากทราบข้อมูลสาขาไหนครับ?`;
        break;

      default:
        responseText = 'ขออภัยครับ ไม่เข้าใจข้อความนี้ พิมพ์ "เมนู" ดูเมนูได้ครับ! 😊';
    }

    if (responseText) {
      await replyMessage(replyToken, responseText);
    }

  } catch (error) {
    console.error('Handle message error:', error);
    await replyMessage(replyToken, 'ขออภัยครับ เกิดข้อผิดพลาดชั่วคราว ลองใหม่อีกครั้งนะครับ หรือโทร 092-249-0555 ครับ');
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
      <h1>🍱 Unagi Yondaime Kikukawa LINE Bot</h1>
      <p>ระบบ AI ช่วยตอบคำถามลูกค้า พร้อมให้บริการ! 🤖</p>
      <p>Powered by Gemini AI 😊</p>
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
  console.log(`🤖 AI Assistant is ready to help customers!`);
});