const axios = require("axios");
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
};

class Request {
  getBinary(messageId) {
    return axios({
      method: "get",
      headers: LINE_HEADER,
      url: `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      responseType: "arraybuffer"
    });
  }

  reply(replyToken, payload) {
    return axios({
      method: "post",
      url: "https://api.line.me/v2/bot/message/reply",
      headers: LINE_HEADER,
      data: { replyToken, messages: payload }
    });
  }

  loading(userId) {
    return axios({
      method: "post",
      url: "https://api.line.me/v2/bot/chat/loading/start",
      headers: LINE_HEADER,
      data: { chatId: userId }
    });
  }

  async curl(url) {
    try {
      return axios({ method: "get", url, responseType: "arraybuffer" });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new Request()