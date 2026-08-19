/**
 * SAIYAN — /song — البحث وتنزيل الأغاني من YouTube Music
 * Copyright © 2026 Magnus — All rights reserved
 *
 * Saiyan Messenger Bot
 * Developer: Magnus
 *
 * التعديلات:
 *  - الهوية أصبحت Saiyan
 *  - المطور أصبح Magnus
 *  - النتائج تستخدم روابط YouTube Music
 *  - دعم اختيار الأغنية بالرقم
 *  - تنزيل الصوت عبر API الخارجي
 */

"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const ytsr = require("yt-search");

const TMP = path.join(os.tmpdir(), "saiyan_song");
fs.ensureDirSync(TMP);

// ─────────────────────────────────────────────────────────────────────────────
// APIs الاحتياطية
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_APIS = [
  "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json",
];

// ─────────────────────────────────────────────────────────────────────────────
// أدوات
// ─────────────────────────────────────────────────────────────────────────────

function fmtN(n) {
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

// تحويل رابط فيديو YouTube إلى رابط YouTube Music
function toYouTubeMusicUrl(video) {
  if (!video) return null;

  const videoId =
    video.videoId ||
    video.videoID ||
    String(video.url || "").match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/
    )?.[1];

  if (!videoId) return video.url;

  return `https://music.youtube.com/watch?v=${videoId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// جلب API
// ─────────────────────────────────────────────────────────────────────────────

async function getApiBase() {
  for (const url of FALLBACK_APIS) {
    try {
      const res = await axios.get(url, {
        timeout: 7000,
      });

      if (res.data?.api) {
        return String(res.data.api).replace(/\/+$/, "");
      }
    } catch (_) {}
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// تنزيل الصوت
// ─────────────────────────────────────────────────────────────────────────────

async function downloadViaApi(videoUrl, outPath) {
  const base = await getApiBase();

  if (!base) {
    throw new Error(
      "تعذّر الوصول إلى خدمة تنزيل الأغاني حالياً."
    );
  }

  let downloadUrl = "";
  let songTitle = "Saiyan Song";

  try {
    const res = await axios.get(`${base}/ytdl`, {
      params: {
        url: videoUrl,
        type: "audio",
      },
      timeout: 20000,
    });

    if (res.data?.status && res.data?.downloadUrl) {
      downloadUrl = res.data.downloadUrl;
      songTitle = res.data.title || "Saiyan Song";
    }
  } catch (err) {
    throw new Error(
      `خدمة التنزيل الخارجية غير متاحة حالياً ` +
      `(Status ${err.response?.status || "unknown"}).`
    );
  }

  if (!downloadUrl) {
    throw new Error(
      "لم يتم الحصول على رابط التنزيل الصوتي."
    );
  }

  const dl = await axios.get(downloadUrl, {
    responseType: "arraybuffer",
    timeout: 90000,
    maxContentLength: 50 * 1024 * 1024,
    maxBodyLength: 50 * 1024 * 1024,
  });

  await fs.outputFile(
    outPath,
    Buffer.from(dl.data)
  );

  return {
    title: songTitle,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// الأمر
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

  config: {
    name: "song",

    aliases: [
      "music",
      "أغنية",
      "موسيقى",
      "ytmusic"
    ],

    version: "5.0",

    author: "Magnus",

    countDown: 10,

    role: 0,

    category: "media",

    description:
      "البحث عن الأغاني عبر YouTube Music وتنزيلها كصوت",

    guide: {
      en:
        "{pn} [اسم الأغنية]\n" +
        "مثال: {pn} يا حبيبي\n" +
        "مثال: {pn} Drake God's Plan",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // تشغيل الأمر
  // ───────────────────────────────────────────────────────────────────────────

  onStart: async function ({
    api,
    event,
    args,
    message,
  }) {

    const query = args.join(" ").trim();

    if (!query) {
      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║       🎵 SAIYAN MUSIC       ║\n" +
        "╠══════════════════════════════╣\n" +
        "║ اكتب اسم الأغنية للبحث.     ║\n" +
        "║                              ║\n" +
        "║ مثال:                        ║\n" +
        "║ /song يا حبيبي              ║\n" +
        "╚══════════════════════════════╝"
      );
    }

    message.react("🔎", event.messageID);

    const wait = await message.reply(
      `🎵 Saiyan Music\n\n🔎 أبحث عن: ${query}`
    );

    try {

      // البحث في YouTube عن النتائج الموسيقية
      const results = await ytsr(query);

      let videos = (results.videos || [])
        .filter(v => v.videoId || v.url)
        .slice(0, 5);

      if (!videos.length) {

        api.unsendMessage(wait.messageID).catch(() => {});

        message.react("❌", event.messageID);

        return message.reply(
          `❌ لم أجد نتائج موسيقية لـ:\n${query}`
        );
      }

      // ───────────────────────────────────────────────────────────────────────
      // تجهيز النتائج
      // ───────────────────────────────────────────────────────────────────────

      let body =
        "╔══════════════════════════════╗\n" +
        "║       🎵 SAIYAN MUSIC       ║\n" +
        "╠══════════════════════════════╣\n" +
        `║ 🔎 البحث: ${query.slice(0, 23)}\n` +
        "╠══════════════════════════════╣\n";

      videos.forEach((v, i) => {

        const title = String(
          v.title || "بدون عنوان"
        ).slice(0, 55);

        const author = String(
          v.author?.name ||
          v.author ||
          "YouTube Music"
        ).slice(0, 28);

        body +=
          `║ ${i + 1}. 🎧 ${title}\n` +
          `║    👤 ${author}\n` +
          `║    ⏱ ${v.timestamp || "?"} | 👁 ${fmtN(v.views)}\n` +
          "║\n";
      });

      body +=
        "╠══════════════════════════════╣\n" +
        `║ أرسل رقم الأغنية من 1 إلى ${videos.length} ║\n` +
        "╚══════════════════════════════╝";

      api.unsendMessage(wait.messageID).catch(() => {});

      const listMsg = await message.reply(body);

      // ───────────────────────────────────────────────────────────────────────
      // انتظار اختيار المستخدم
      // ───────────────────────────────────────────────────────────────────────

      if (!global.GoatBot?.onReply) {
        return message.reply(
          "❌ نظام الردود غير متاح في نسخة البوت الحالية."
        );
      }

      global.GoatBot.onReply.set(
        `song_${listMsg.messageID}`,
        {
          messageID: listMsg.messageID,

          author: event.senderID,

          ts: Date.now(),

          callback: async ({
            api,
            event: re,
            message: rm,
          }) => {

            // حذف حالة الانتظار
            global.GoatBot.onReply.delete(
              `song_${listMsg.messageID}`
            );

            // ───────────────────────────────────────────────────────────────
            // التحقق من المرسل
            // ───────────────────────────────────────────────────────────────

            if (
              String(re.senderID) !==
              String(event.senderID)
            ) {
              return;
            }

            const choice =
              parseInt(
                String(re.body || "").trim(),
                10
              ) - 1;

            if (
              Number.isNaN(choice) ||
              choice < 0 ||
              choice >= videos.length
            ) {
              return rm.reply(
                "❌ رقم غير صالح.\n" +
                `اختر رقماً من 1 إلى ${videos.length}.`
              );
            }

            const video = videos[choice];

            // رابط YouTube الأصلي
            const youtubeUrl =
              video.url ||
              `https://www.youtube.com/watch?v=${video.videoId}`;

            // رابط YouTube Music
            const musicUrl =
              toYouTubeMusicUrl(video);

            const title =
              video.title ||
              "Saiyan Music";

            const dlWait = await rm.reply(
              "╔══════════════════════════════╗\n" +
              "║       ⬇️ SAIYAN MUSIC       ║\n" +
              "╠══════════════════════════════╣\n" +
              `║ 🎵 ${String(title).slice(0, 26)}\n` +
              "║                              ║\n" +
              "║ ⏳ جاري تحميل الصوت...       ║\n" +
              "╚══════════════════════════════╝"
            );

            const outPath = path.join(
              TMP,
              `saiyan_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}.mp3`
            );

            try {

              /*
               * يتم إرسال رابط YouTube Music
               * إلى خدمة التحميل.
               *
               * إذا كانت الخدمة لا تقبل music.youtube.com
               * نستخدم رابط YouTube الأصلي كاحتياط.
               */

              let downloaded;

              try {

                downloaded =
                  await downloadViaApi(
                    musicUrl,
                    outPath
                  );

              } catch (_) {

                // احتياط إذا رفض الـ API رابط YouTube Music
                downloaded =
                  await downloadViaApi(
                    youtubeUrl,
                    outPath
                  );
              }

              api.unsendMessage(
                dlWait.messageID
              ).catch(() => {});

              const finalTitle =
                downloaded?.title ||
                title;

              await api.sendMessage(
                {
                  body:
                    "╔══════════════════════════════╗\n" +
                    "║       🎵 SAIYAN MUSIC       ║\n" +
                    "╠══════════════════════════════╣\n" +
                    `║ 🎧 ${String(finalTitle).slice(0, 26)}\n` +
                    `║ ⏱ ${video.timestamp || "?"}\n` +
                    "║                              ║\n" +
                    "║ 🤖 Saiyan Messenger Bot     ║\n" +
                    "║ 👑 Developed by Magnus      ║\n" +
                    "╚══════════════════════════════╝",

                  attachment:
                    fs.createReadStream(outPath),
                },

                re.threadID
              );

              // تنظيف الملف
              try {
                await fs.remove(outPath);
              } catch (_) {}

            } catch (e) {

              api.unsendMessage(
                dlWait.messageID
              ).catch(() => {});

              if (fs.existsSync(outPath)) {
                try {
                  fs.removeSync(outPath);
                } catch (_) {}
              }

              return rm.reply(
                "╔══════════════════════════════╗\n" +
                "║       ❌ فشل التحميل        ║\n" +
                "╠══════════════════════════════╣\n" +
                `║ ${String(e.message || e).slice(0, 28)}\n` +
                "╠══════════════════════════════╣\n" +
                "║ 🔗 YouTube Music:            ║\n" +
                `║ ${musicUrl}\n` +
                "╚══════════════════════════════╝"
              );
            }
          },
        }
      );

    } catch (e) {

      api.unsendMessage(
        wait.messageID
      ).catch(() => {});

      message.react(
        "❌",
        event.messageID
      );

      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║       ❌ SAIYAN MUSIC       ║\n" +
        "╠══════════════════════════════╣\n" +
        "║ حدث خطأ أثناء البحث.        ║\n" +
        "╠══════════════════════════════╣\n" +
        `║ ${String(e.message || e).slice(0, 30)}\n` +
        "╚══════════════════════════════╝"
      );
    }
  },
};

مهم: الكود يجعل الرابط المستخدم للتعامل مع الأغنية بصيغة "music.youtube.com"، لكن "yt-search" نفسه يعتمد على فهرسة YouTube، وليس API رسميًا خاصًا بـ YouTube Music. كما أن نجاح التنزيل النهائي يعتمد على الـ API الموجود في "apis.json"؛ إذا كان ذلك الـ API متوقفًا فلن يستطيع الأمر التنزيل مهما كان الكود صحيحًا.
