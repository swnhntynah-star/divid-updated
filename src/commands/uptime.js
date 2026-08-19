/**
 * SAIYAN — /uptime
 * Copyright © 2026 Magnus
 * عرض مدة تشغيل البوت وإحصائيات النظام
 */

"use strict";

const os = require("os");

function formatDuration(ms) {
  let seconds = Math.floor(ms / 1000);

  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts = [];

  if (days) parts.push(`${days} يوم`);
  if (hours) parts.push(`${hours} ساعة`);
  if (minutes) parts.push(`${minutes} دقيقة`);
  if (seconds || !parts.length) parts.push(`${seconds} ثانية`);

  return parts.join("، ");
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "تشغيل", "مدة"],
    version: "5.0",
    author: "Magnus",
    countDown: 3,
    role: 0,
    category: "info",

    description: "عرض مدة تشغيل Saiyan وإحصائيات النظام",

    guide: {
      en: "{pn} — عرض مدة تشغيل البوت وإحصائياته"
    }
  },

  onStart: async function ({ message }) {
    try {
      const uptime = process.uptime() * 1000;

      const memory = process.memoryUsage();
      const usedMemory = formatBytes(memory.rss);
      const heapUsed = formatBytes(memory.heapUsed);
      const heapTotal = formatBytes(memory.heapTotal);

      const cpu = os.cpus();
      const cpuModel = cpu?.[0]?.model || "غير معروف";

      const platform = `${os.type()} ${os.release()}`;

      const botName =
        global.GoatBot?.config?.name ||
        "Saiyan";

      const now = new Date();

      const text =
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        ⚡ S A I Y A N  •  U P T I M E
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🤖 البوت       : ${botName}

  ⏳ مدة التشغيل :
     ${formatDuration(uptime)}

  🟢 الحالة      : متصل ويعمل

  💾 الذاكرة المستخدمة :
     ${usedMemory}

  🧠 Heap :
     ${heapUsed} / ${heapTotal}

  📱 النظام      :
     ${platform}

  ⚙️ المعالج     :
     ${cpuModel}

  🕐 الوقت       :
     ${now.toLocaleString("ar-LY")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👑 المطور : Magnus
  ⚡ Saiyan Messenger Bot
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      return message.reply(text);

    } catch (error) {
      console.error("UPTIME ERROR:", error);

      return message.reply(
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ❌ حدث خطأ أثناء قراءة حالة Saiyan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  السبب:
  ${String(error.message || error).slice(0, 150)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );
    }
  }
};
