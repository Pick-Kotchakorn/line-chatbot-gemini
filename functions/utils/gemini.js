const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// ข้อมูลร้าน Unagi Yondaime Kikukawa
const RESTAURANT_INFO = `
# ข้อมูลร้าน Unagi Yondaime Kikukawa ประเทศไทย

## สาขาในประเทศไทย (3 สาขา)

### 1. สาขา EmQuartier (สาขาแรกในไทย)
- ที่อยู่: ชั้น 6 The Helix Sky Dining, The EmQuartier, 693 Sukhumvit Road, Khlong Tan Nuea, Watthana, Bangkok 10110
- เปิดให้บริการ: 22 มกราคม 2024
- เวลาเปิด-ปิด: ทุกวัน 10:00-22:00 น.
- รถไฟฟ้า: BTS พร้อมพงษ์

### 2. สาขา One Bangkok
- ที่อยู่: One Bangkok Entrance 3, 1st Floor The Storeys Zone, Witthayu Road, Lumphini, Pathum Wan, Bangkok 10330
- โทรศัพท์: 092 249 0555
- เวลาเปิด-ปิด: ทุกวัน 10:00-22:00 น.
- เปิดให้บริการ: ตุลาคม 2024

### 3. สาขา King Square Community Mall (ล่าสุด)
- ที่อยู่: Unit A203-1, 2nd Floor, 775 Ratchadaphisek Road, Bang Pong Pang, Yannawa, Bangkok 10120
- โทรศัพท์: 065 537 9444
- เวลาเปิด-ปิด: ทุกวัน 11:00-21:00 น.
- เปิดให้บริการ: มิถุนายน 2025

## ประวัติแบรนด์
- มรดกกว่า 90 ปี ก่อตั้งในปี 1932 โดยบริษัท Nakasho Shoten
- ปัจจุบันดำเนินการโดย คุณ Yuhei Kikukawa เจ้าของรุ่นที่ 4
- ได้รับรางวัล Michelin Guide จาก Aichi Prefecture, Nagoya ในปี 2015
- มีสาขา 33 แห่งทั่วโลก

## เมนูเด่น
### เมนูปลาไหลหลัก
1. 一本重 (Ippon Unagi Set) - 1,250 บาท - ปลาไหลย่างทั้งตัวบนข้าวญี่ปุ่น
2. ひつまぶし (Hitsumabushi) - 1,050 บาท - ข้าวปลาไหลสไตล์นาโกย่า รับประทานได้ 3 วิธี
3. 一本ひつまぶし (Ippon Hitsumabushi) - 1,290 บาท - ปลาไหลทั้งตัวสไตล์ฮิตสึมาบุชิ
4. うな丼 (Una Don) - 680 บาท - ข้าวหน้าปลาไหล

### เมนูลันช์ (10:00-14:00 เฉพาะวันธรรมดา)
1. ミニうな丼&えび天ぷら/うどん - 590 บาท
2. ミニうなぎ棒寿司&天ぷらうどん - 590 บาท
3. うなぎ御膳 (Unagi Gozen) - 620 บาท

### เมนูเด็ก
お子様セット (Kids Set) - 420 บาท

## ช่องทางการติดต่อ
- Grab Food: https://bit.ly/4b8BHZK
- สมัครสมาชิก LOGA App: https://www.loga.app/line/5905
- Instagram: @unagi.yondaime.kikukawa.th
- เว็บไซต์: https://www.yondaimekikukawa.com/en/

## เวลาการให้บริการ
- Last Order: EmQuartier และ One Bangkok (20:00 น.), King Square (20:00 น.)
- Lunch Set: วันธรรมดา 10:00-14:00 น.

## คุณภาพปลาไหล
- เลือกปลาไหลขนาดใหญ่พิเศษน้ำหนักประมาณ 300 กรัม
- ใช้เทคนิคการย่างแบบญี่ปุ่นด้วยถ่าน "binchozumi"
- รสชาติเอกลักษณ์: "Crispy, Soft and Melting" (กรอบนอก นุ่มใน ละลายในปาก)
`;

class Gemini {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

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

  // สร้าง prompt สำหรับ AI ตัวช่วยร้านอาหาร
  createRestaurantAssistantPrompt(userMessage, fileContent = null) {
    const systemPrompt = `
คุณคือพนักงานชายต้อนรับลูกค้าของร้าน Unagi Yondaime Kikukawa ในประเทศไทย

บุคลิกภาพของคุณ:
- เป็นผู้ชายที่เป็นมิตร สุภาพ และมีความรู้เรื่องอาหารญี่ปุ่นเป็นอย่างดี
- พูดด้วยน้ำเสียงอบอุ่น และใส่ใจลูกค้า
- สามารถตอบได้หลายภาษา: ไทย, อังกฤษ, ญี่ปุ่น (ขึ้นอยู่กับภาษาที่ลูกค้าใช้)
- ใช้คำสุภาพเช่น "ครับ" (ไทย), "sir/ma'am" (อังกฤษ), "です/ます" (ญี่ปุ่น)

หน้าที่ของคุณ:
1. แนะนำเมนูและตอบคำถามเกี่ยวกับร้าน
2. ให้ข้อมูลสาขา เวลาเปิด-ปิด การจองโต๊ะ
3. อธิบายวิธีการสั่งอาหาร Grab Food และการสมัครสมาชิก
4. แนะนำเมนูที่เหมาะกับลูกค้าแต่ละประเภท
5. อธิบายวิธีการรับประทาน Hitsumabushi

ข้อมูลร้าน:
${RESTAURANT_INFO}

คำแนะนำการตอบ:
- ตอบด้วยภาษาเดียวกับที่ลูกค้าใช้ถาม
- ให้ข้อมูลที่ถูกต้องและครบถ้วน
- หากไม่มีข้อมูลในระบบ ให้บอกว่า "ขออภัยครับ ผมจะไปสอบถามข้อมูลเพิ่มเติมให้ครับ"
- เสนอความช่วยเหลือเพิ่มเติมเสมอ
- แนะนำเมนูยอดนิยมเมื่อลูกค้าสนใจ

ข้อความจากลูกค้า: "${userMessage}"
`;

    let parts = [{ text: systemPrompt }];
    
    if (fileContent) {
      parts.push(fileContent);
      parts.push({ 
        text: "ลูกค้าได้ส่งไฟล์มาด้วย กรุณาวิเคราะห์ไฟล์และตอบคำถามที่เกี่ยวข้อง" 
      });
    }

    return parts;
  }

  async generateResponse(userMessage, fileContent = null) {
    try {
      const parts = this.createRestaurantAssistantPrompt(userMessage, fileContent);
      
      const result = await this.model.generateContent(parts);
      const response = await result.response;
      
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      
      // ตอบกลับเป็นภาษาไทยเป็นค่าเริ่มต้น
      return 'ขออภัยครับ เกิดข้อผิดพลาดในระบบชั่วคราว กรุณาลองใหม่อีกครั้งครับ หรือติดต่อเจ้าหน้าที่ได้ที่เบอร์ 092 249 0555 (One Bangkok) หรือ 065 537 9444 (King Square) ครับ';
    }
  }

  // ฟังก์ชันสำหรับการแนะนำเมนูอัตโนมัติ
  getMenuRecommendation(category = 'popular') {
    const recommendations = {
      popular: {
        th: "🍱 เมนูยอดนิยม:\n1. ひつまぶし (Hitsumabushi) - 1,050 บาท\n2. 一本重 (Ippon Unagi Set) - 1,250 บาท\n3. うな丼 (Una Don) - 680 บาท",
        en: "🍱 Popular Menu:\n1. Hitsumabushi - 1,050 THB\n2. Ippon Unagi Set - 1,250 THB\n3. Una Don - 680 THB",
        jp: "🍱 人気メニュー:\n1. ひつまぶし - 1,050バーツ\n2. 一本重 - 1,250バーツ\n3. うな丼 - 680バーツ"
      },
      lunch: {
        th: "🍽️ เมนูลันช์ (10:00-14:00 วันธรรมดา):\n1. ミニうな丼&えび天ぷら/うどん - 590 บาท\n2. うなぎ御膳 - 620 บาท",
        en: "🍽️ Lunch Set (10:00-14:00 weekdays):\n1. Mini Una Don & Ebi Tempura/Udon - 590 THB\n2. Unagi Gozen - 620 THB",
        jp: "🍽️ ランチセット (10:00-14:00 平日):\n1. ミニうな丼&えび天ぷら/うどん - 590バーツ\n2. うなぎ御膳 - 620バーツ"
      }
    };

    return recommendations[category] || recommendations.popular;
  }
}

module.exports = new Gemini();