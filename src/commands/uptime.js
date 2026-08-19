/**
 * SAIYAN — /uptime
 * Copyright © 2026 Magnus
 *
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

function getStartTime() {
  if (!global._saiyanStartTime) {
    global._saiyanStartTime = Date.now() - process.uptime() * 1000;
  }

  return global._saiyanStartTime;
}

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "تشغيل", "وقت", "مدة"],
    version: "2.0",
    author: "Magnus",
    countDown: 3,
    role: 0,
    category: "system",
    description: "عرض مدة تشغيل Saiyan وإحصائيات النظام",
    guide: {
      en: "{pn} — عرض مدة تشغيل البوت\n{pn} status — عرض معلومات النظام"
    }
  },

  onStart: async function ({ message, args }) {
    const startTime = getStartTime();

    const uptimeMs = Date.now() - startTime;
    const uptime = formatDuration(uptimeMs);

    const memory = process.memoryUsage();
    const usedMemory = formatBytes(memory.rss);
    const heapUsed = formatBytes(memory.heapUsed);
    const heapTotal = formatBytes(memory.heapTotal);

    const cpu = os.cpus()?.[0]?.model || "غير معروف";
    const platform = `${os.type()} ${os.release()}`;
    const node = process.version;

    const botName = "Saiyan";
    const developer = "Magnus";

    const startDate = new Date(startTime);

    const pad = n => String(n).padStart(2, "0");

    const startFormatted =
      `${startDate.getFullYear()}-` +
      `${pad(startDate.getMonth() + 1)}-` +
      `${pad(startDate.getDate())} ` +
      `${pad(startDate.getHours())}:` +
      `${pad(startDate.getMinutes())}:` +
      `${pad(startDate.getSeconds())}`;

    if ((args[0] || "").toLowerCase() === "status") {
      return message.reply(
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        ⚡ S A I Y A N
        SYSTEM STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 الحالة        : يعمل بشكل طبيعي
⏱️ مدة التشغيل    : ${uptime}

🚀 بدء التشغيل   : ${startFormatted}

💾 الذاكرة
├─ RSS           : ${usedMemory}
├─ Heap مستخدم   : ${heapUsed}
└─ Heap الكلي    : ${heapTotal}

🧩 النظام
├─ Node.js       : ${node}
├─ Platform      : ${platform}
└─ CPU           : ${cpu.slice(0, 42)}

🤖 البوت         : ${botName}
👑 المطور        : ${developer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );
    }

    return message.reply(
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        ⚡ S A I Y A N
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 الحالة       : متصل ويعمل

⏱️ مدة التشغيل
   ${uptime}

🚀 بدأ التشغيل
   ${startFormatted}

💾 استخدام الذاكرة
   ${usedMemory}

📡 Node.js
   ${node}

🤖 النظام
   Saiyan Messenger Bot

👑 المطور
   Magnus

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${global.GoatBot?.config?.prefix || "/"}uptime status
   لعرض معلومات النظام الكاملة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
  }
};
