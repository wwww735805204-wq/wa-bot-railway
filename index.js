// المكتبات المطلوبة
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// الردود التلقائية
const autoReplies = {
  'مرحبا': 'أهلاً وسهلاً! 🌹',
  'السلام عليكم': 'وعليكم السلام ورحمة الله وبركاته 🙏',
  'كيف الحال': 'الحمدلله تمام، وأنت كيفك؟',
  'شكرا': 'العفو، دايماً تحت الخدمة 🤝',
  '!البوت': '🤖 أنا بوت واتساب يعمل على Railway\nطورني: @أنت',
  '!الوقت': () => {
    const now = new Date();
    return `⏰ الوقت الآن: ${now.toLocaleTimeString('ar-SA')}`;
  },
  '!التاريخ': () => {
    const now = new Date();
    return `📅 التاريخ: ${now.toLocaleDateString('ar-SA')}`;
  }
};

// متغيرات البوت
let qrCodeString = null;
let isConnected = false;

// تشغيل البوت
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  
  const sock = makeWASocket({
    auth: state
  });

  // استقبال QR Code
  sock.ev.on('connection.update', ({ qr, connection }) => {
    if (qr) {
      console.log('\n\n═══════════════════════════════════════════');
      console.log('📱 **QR Code Received**');
      console.log('═══════════════════════════════════════════\n');
      
      qrCodeString = qr;
      
      // عرض QR في الشاشة
      qrcode.generate(qr, { small: true });
      
      console.log('\n═══════════════════════════════════════════');
      console.log('**كيف تمسح الكود:**');
      console.log('1. افتح واتساب في جوالك');
      console.log('2. اضغط ⋮ (النقاط الثلاث)');
      console.log('3. الأجهزة المرتبطة');
      console.log('4. ربط جهاز');
      console.log('5. امسح هذا الكود');
      console.log('═══════════════════════════════════════════\n');
    }
    
    if (connection === 'open') {
      console.log('✅ **تم الاتصال! البوت جاهز الآن.**');
      isConnected = true;
    }
    
    if (connection === 'close') {
      console.log('⚠️  تم قطع الاتصال، إعادة المحاولة...');
      isConnected = false;
      setTimeout(startBot, 5000);
    }
  });

  // حفظ بيانات الاتصال
  sock.ev.on('creds.update', saveCreds);
  
  // استقبال الرسائل والرد التلقائي
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m.message || m.key.fromMe) return;
      
      // استخراج نص الرسالة
      let messageText = '';
      if (m.message.conversation) {
        messageText = m.message.conversation.toLowerCase();
      } else if (m.message.extendedTextMessage?.text) {
        messageText = m.message.extendedTextMessage.text.toLowerCase();
      }
      
      if (!messageText) return;
      
      console.log(`📩 رسالة من ${m.key.remoteJid}: ${messageText}`);
      
      // البحث عن رد مطابق
      let reply = null;
      
      for (const [keyword, response] of Object.entries(autoReplies)) {
        if (messageText.includes(keyword.toLowerCase())) {
          reply = typeof response === 'function' ? response() : response;
          break;
        }
      }
      
      // إذا لم يجد رد، يمكن إضافة رد افتراضي
      if (!reply) {
        reply = 'شكراً على رسالتك! اكتب "!البوت" لمعرفة المزيد عني 🤖';
      }
      
      // إرسال الرد
      if (reply) {
        await sock.sendMessage(m.key.remoteJid, { text: reply });
        console.log(`✅ تم الرد: ${reply.substring(0, 50)}...`);
      }
      
    } catch (error) {
      console.error('❌ خطأ في معالجة الرسالة:', error);
    }
  });
}

// تشغيل البوت
startBot();

// صفحة الويب الرئيسية لعرض QR
app.get('/', (req, res) => {
  if (isConnected) {
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🤖 بوت الواتساب</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: white;
          }
          .container { 
            background: white; 
            color: #333; 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            max-width: 600px;
            margin: 50px auto;
          }
          h1 { color: #25D366; }
          .status { 
            background: #25D366; 
            color: white; 
            padding: 10px; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .steps {
            text-align: right;
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 بوت الواتساب يعمل بنجاح!</h1>
          <div class="status">✅ **الحالة:** متصل ومستعد</div>
          <p>يمكنك إرسال رسالة إلى رقم البوت الآن.</p>
          
          <div class="steps">
            <h3>📱 الردود التلقائية المتاحة:</h3>
            <p>🔹 "مرحبا" - ترحيب</p>
            <p>🔹 "السلام عليكم" - رد السلام</p>
            <p>🔹 "كيف الحال" - سؤال عن الحال</p>
            <p>🔹 "شكرا" - رد الشكر</p>
            <p>🔹 "!البوت" - معلومات عن البوت</p>
            <p>🔹 "!الوقت" - معرفة الوقت الحالي</p>
            <p>🔹 "!التاريخ" - معرفة التاريخ</p>
          </div>
          
          <p style="margin-top: 30px;">
            <strong>تم تطوير البوت بواسطة:</strong><br>
            نظام الرد التلقائي على WhatsApp
          </p>
        </div>
      </body>
      </html>
    `);
  } else if (qrCodeString) {
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>📱 مسح QR Code</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: linear-gradient(135deg, #075E54, #128C7E);
            color: white;
          }
          .container { 
            background: white; 
            color: #333; 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            max-width: 500px;
            margin: 30px auto;
          }
          h1 { color: #075E54; }
          .qr-container { margin: 20px 0; }
          .steps {
            text-align: right;
            margin: 20px 0;
            padding: 15px;
            background: #f0f8ff;
            border-radius: 8px;
          }
          .step { margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 مسح QR Code</h1>
          <p>لربط البوت بواتسابك، امسح هذا الكود:</p>
          
          <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCodeString}" 
                 alt="QR Code" 
                 style="border: 5px solid #25D366; border-radius: 10px;">
          </div>
          
          <div class="steps">
            <h3>🔧 خطوات الربط:</h3>
            <div class="step">1️⃣ افتح <strong>واتساب</strong> في جوالك</div>
            <div class="step">2️⃣ اضغط على <strong>النقاط الثلاث (⋮)</strong></div>
            <div class="step">3️⃣ اختر <strong>الأجهزة المرتبطة</strong></div>
            <div class="step">4️⃣ اضغط <strong>ربط جهاز</strong></div>
            <div class="step">5️⃣ امسح <strong>الكود بالأعلى</strong></div>
          </div>
          
          <p style="color: #666; margin-top: 20px;">
            بعد المسح، ارسل "مرحبا" للتحقق من عمل البوت
          </p>
        </div>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>⏳ جاري التحميل</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f0f0f0;
          }
          .loader {
            border: 8px solid #f3f3f3;
            border-top: 8px solid #25D366;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 2s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <h1>⏳ جاري تحميل البوت...</h1>
        <div class="loader"></div>
        <p>يرجى الانتظار بضع ثوانٍ</p>
      </body>
      </html>
    `);
  }
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`🌐 الخادم يعمل على المنفذ: ${PORT}`);
  console.log(`🔗 يمكنك فتح الرابط في المتصفح`);
});

// لمنع البوت من النوم
setInterval(() => {
  console.log('💓 البوت ما زال يعمل...');
}, 300000);
