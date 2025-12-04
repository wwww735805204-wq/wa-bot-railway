// المكتبات المطلوبة
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
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
  }
};

// تشغيل البوت
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  // عند استلام QR
  sock.ev.on('connection.update', ({ qr, connection }) => {
    if (qr) {
      console.log('📱 امسح هذا الكود بواسطة واتساب:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log('✅ تم الاتصال! البوت جاهز.');
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
  // عند استلام رسالة
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    
    const messageText = m.message.conversation?.toLowerCase() || '';
    
    console.log(`📩 رسالة: ${messageText}`);
    
    let reply = null;
    
    // البحث عن رد مطابق
    for (const [keyword, response] of Object.entries(autoReplies)) {
      if (messageText.includes(keyword.toLowerCase())) {
        reply = typeof response === 'function' ? response() : response;
        break;
      }
    }
    
    // إرسال الرد
    if (reply) {
      await sock.sendMessage(m.key.remoteJid, { text: reply });
      console.log(`✅ تم الرد: ${reply}`);
    }
  });
}

startBot();

// صفحة الويب الرئيسية
app.get('/', (req, res) => {
  res.send('<h1>🤖 بوت الواتساب يعمل!</h1>');
});

app.listen(PORT, () => {
  console.log(`🌐 الموقع شغال`);
});

// لمنع البوت من النوم
setInterval(() => {
  console.log('💓 البوت شغال...');
}, 300000);
