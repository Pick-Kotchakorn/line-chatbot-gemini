const { onRequest } = require("firebase-functions/v2/https");
const request = require("./utils/request");
const NodeCache = require("node-cache");
const cache = new NodeCache();
const gemini = require("./utils/gemini");

exports.webhook = onRequest(async (req, res) => {
  if (req.method !== "POST") { return res.send(req.method); }

  const events = req.body.events;
  if (events.length === 0) { return res.end(); }

  for (const event of events) {
    const userId = event.source.userId;
    switch (event.type) {
      case "postback":
        const response = await request.getBinary(event.postback.data);
        if (response.status === 200) {
          await getReady(response, userId, event.replyToken);
        }
        break;

      case "message":
        const messageType = event.message.type;
        if (["image", "video", "audio"].includes(messageType)) {
          const response = await request.getBinary(event.message.id);

          if (response.status === 202) {
            await request.reply(event.replyToken, [{
              type: "text",
              text: `ระบบกำลังประมวลผลไฟล์ กรุณากดปุ่ม "ตรวจสอบสถานะ" ด้านล่างอีกครั้งครับ?`,
              quickReply: {
                items: [{
                  type: "action",
                  action: { type: "postback", label: "ตรวจสอบสถานะ", data: `${event.message.id}` }
                }]
              }
            }]);
            break;
          }
          
          if (response.status === 200) {
            await getReady(response, userId, event.replyToken);
            break;
          }
        }

        if (messageType === "text") {
          const prompt = event.message.text.trim();
          
          if (gemini.isUrl(prompt)) {
            try {
              const response = await request.curl(prompt);
              await getReady(response, userId, event.replyToken);
            } catch (error) {
              await request.reply(event.replyToken, [{ type: "text", text: "ขออภัย ฉันไม่สามารถเปิด URL นี้ได้ครับ" }]);
            }
            break;
          }

          const data = cache.get(userId);
          if (data) {
            await request.loading(userId);
            const response = await gemini.multimodal([
              "ตอบคำถามผู้ใช้เฉพาะเนื้อหาที่อยู่ในไฟล์เท่านั้น",
              { inlineData: data },
              prompt
            ]);
            await request.reply(event.replyToken, [{ type: "text", text: `${response.text}` }]);
            console.log("TotalToken:", response.usageMetadata.totalTokenCount);
          }
        }
        break;
    }
  }
  res.end();
});

const getReady = async (response, userId, replyToken) => {
  let message = "ปัจจุบันฉันสามารถเข้าใจไฟล์ PDF, JPEG, PNG, WAV, MP3, MP4, และ MOV ได้เท่านั้น";
  const mimeType = gemini.getMimeType(response);
  if (gemini.isAllowedMimes(mimeType)) {
    const base64 = Buffer.from(response.data).toString('base64');
    cache.set(`${userId}`, { data: base64, mimeType });
    message = "คุณอยากรุ้เรื่องอะไรจากไฟล์ที่คุณส่งมาครับ?";
  }
  await request.reply(replyToken, [{ type: "text", text: message }]);
}