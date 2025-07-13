const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

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
      
      let parts = [{ text: prompt }];
      
      if (fileContent) {
        parts.push(fileContent);
      }

      const result = await model.generateContent(parts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      return 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล';
    }
  }
}

module.exports = new Gemini();