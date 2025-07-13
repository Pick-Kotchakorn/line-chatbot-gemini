const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// System prompt สำหรับร้านอาหารญี่ปุ่น
const RESTAURANT_PROMPT = `
คุณเป็น AI Assistant สำหรับร้านอาหารญี่ปุ่น "Unagi Yondaime Kikukawa TH" 
เชี่ยวชาญเรื่อง:
- อาหารญี่ปุ่น โดยเฉพาะปลาไหล (Unagi)
- การบริการลูกค้า
- คำแนะนำเมนู
- การจองโต๊ะ
- ข้อมูลร้าน

ตอบด้วยความสุภาพ เป็นมิตร และให้ข้อมูลที่เป็นประโยชน์
ใช้ภาษาไทยในการตอบ
หากไม่ทราบข้อมูลเฉพาะของร้าน ให้แนะนำให้ติดต่อร้านโดยตรง
`;

class Gemini {
  isUrl(str) {
    return /^(http(s)?:\/\/)?(www\.)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/.test(str);
  }

  getMimeType(response) {
    const contentType = response.headers["content-type"];
    return contentType ? contentType.split(';')[0] : 'application/octet-stream';
  }

  isAllowedMimes(mimeType) {
    return [
      "application/pdf",
      "image/jpeg", 
      "image/png",
      "audio/wav",
      "audio/mp3",
      "audio/x-m4a", 
      "video/mp4",
      "video/mov",
    ].includes(mimeType);
  }

  async generateResponse(prompt, fileContent = null) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // รวม system prompt กับ user prompt
      let fullPrompt = RESTAURANT_PROMPT + "\n\nคำถามจากลูกค้า: " + prompt;
      
      let parts = [{ text: fullPrompt }];
      
      if (fileContent) {
        parts.push(fileContent);
        // เพิ่มคำแนะนำสำหรับการวิเคราะห์รูปอาหาร
        parts.push({ 
          text: "\n\nโปรดวิเคราะห์รูปภาพนี้ในบริบทของร้านอาหารญี่ปุ่น และให้คำแนะนำที่เป็นประโยชน์"
        });
      }

      const result = await model.generateContent(parts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      return 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล กรุณาติดต่อทางร้านโดยตรงครับ';
    }
  }
}

module.exports = new Gemini();