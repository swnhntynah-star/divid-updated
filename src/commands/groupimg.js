/**
 * SAIYAN — /groupimg
 * تغيير وقفل صورة الغروب
 *
 * Copyright © 2026 Magnus
 * Saiyan Messenger Bot
 *
 * Features:
 *  - تغيير صورة الغروب
 *  - قفل الصورة
 *  - إعادة الصورة تلقائياً عند تغييرها
 *  - دعم الرابط
 *  - دعم الصورة المرفقة
 *  - دعم الرد على صورة
 *  - حفظ القفل بعد إعادة تشغيل البوت
 *  - 3 محاولات حقيقية لإعادة الصورة
 *  - منع الحلقة اللانهائية
 *  - منع العمليات المتزامنة
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const axios = require("axios");

// ============================================================
// PATHS
// ============================================================

const DATA_DIR = path.join(
  process.cwd(),
  "database",
  "data"
);

const STATE_FILE = path.join(
  DATA_DIR,
  "groupImgLocks.json"
);

const CACHE_DIR = path.join(
  os.tmpdir(),
  "saiyan_groupimg"
);

fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(CACHE_DIR);

// ============================================================
// GLOBAL STATE
// ============================================================

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return {};
    }

    const raw = fs.readFileSync(
      STATE_FILE,
      "utf8"
    );

    if (!raw.trim()) {
      return {};
    }

    const data = JSON.parse(raw);

    return data && typeof data === "object"
      ? data
      : {};
  } catch (error) {
    global.log?.warn?.(
      "GROUPIMG",
      `تعذر تحميل قاعدة البيانات: ${error.message}`
    );

    return {};
  }
}

function saveState() {
  try {
    fs.ensureDirSync(DATA_DIR);

    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify(
        locks,
        null,
        2
      ),
      "utf8"
    );

    return true;
  } catch (error) {
    global.log?.warn?.(
      "GROUPIMG",
      `تعذر حفظ قاعدة البيانات: ${error.message}`
    );

    return false;
  }
}

if (!global.__SAIYAN_GROUPIMG_LOCKS) {
  global.__SAIYAN_GROUPIMG_LOCKS =
    loadState();
}

const locks =
  global.__SAIYAN_GROUPIMG_LOCKS;

// ============================================================
// ACTIVE OPERATIONS
// ============================================================

if (!global.__SAIYAN_GROUPIMG_ACTIVE) {
  global.__SAIYAN_GROUPIMG_ACTIVE =
    new Set();
}

const activeLocks =
  global.__SAIYAN_GROUPIMG_ACTIVE;

// ============================================================
// HELPERS
// ============================================================

function cleanThreadID(threadID) {
  return String(threadID || "").trim();
}

function getLockPath(threadID) {
  const tid =
    cleanThreadID(threadID);

  return path.join(
    CACHE_DIR,
    `lock_${tid.replace(/[^0-9]/g, "")}.jpg`
  );
}

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

// ============================================================
// BOT ADMIN CHECK
// ============================================================

function isBotAdmin(userID) {
  const id =
    String(userID || "");

  const config =
    global.GoatBot?.config || {};

  const owners = [
    config.ownerID,
    ...(Array.isArray(config.ownerIds)
      ? config.ownerIds
      : []),
    ...(Array.isArray(config.superAdminBot)
      ? config.superAdminBot
      : [])
  ]
    .filter(Boolean)
    .map(String);

  const admins =
    Array.isArray(config.adminBot)
      ? config.adminBot.map(String)
      : [];

  return (
    owners.includes(id) ||
    admins.includes(id)
  );
}

// ============================================================
// GROUP ADMIN CHECK
// ============================================================

function getThreadInfo(api, threadID) {
  return new Promise(
    (resolve, reject) => {
      try {
        const result =
          api.getThreadInfo(
            String(threadID),
            (error, data) => {
              if (error) {
                reject(error);
              } else {
                resolve(data);
              }
            }
          );

        if (
          result &&
          typeof result.then === "function"
        ) {
          result
            .then(resolve)
            .catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    }
  );
}

async function isGroupAdmin(
  api,
  userID,
  threadID
) {
  try {
    const info =
      await getThreadInfo(
        api,
        threadID
      );

    const admins =
      Array.isArray(info?.adminIDs)
        ? info.adminIDs
        : [];

    return admins.some(admin => {
      const id =
        typeof admin === "object"
          ? admin.id
          : admin;

      return (
        String(id) ===
        String(userID)
      );
    });
  } catch (error) {
    global.log?.warn?.(
      "GROUPIMG",
      `تعذر فحص أدمن الغروب: ${error.message}`
    );

    return false;
  }
}

async function canUseCommand(
  api,
  event
) {
  const uid =
    String(event.senderID || "");

  if (isBotAdmin(uid)) {
    return true;
  }

  return isGroupAdmin(
    api,
    uid,
    event.threadID
  );
}

// ============================================================
// DOWNLOAD IMAGE
// ============================================================

async function downloadImage(
  url,
  threadID
) {
  const tid =
    cleanThreadID(threadID);

  const filename =
    `download_${tid}_${Date.now()}.jpg`;

  const file =
    path.join(
      CACHE_DIR,
      filename
    );

  const response =
    await axios.get(
      url,
      {
        responseType:
          "arraybuffer",

        timeout: 30000,

        maxRedirects: 10,

        validateStatus:
          status =>
            status >= 200 &&
            status < 400,

        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Safari/537.36",

          "Accept":
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
      }
    );

  const contentType =
    String(
      response.headers?.[
        "content-type"
      ] || ""
    ).toLowerCase();

  if (
    !contentType.startsWith("image/")
  ) {
    throw new Error(
      "الرابط لا يحتوي على صورة مباشرة."
    );
  }

  const buffer =
    Buffer.from(
      response.data
    );

  if (!buffer.length) {
    throw new Error(
      "الصورة فارغة."
    );
  }

  fs.writeFileSync(
    file,
    buffer
  );

  return file;
}

// ============================================================
// FIND IMAGE URL
// ============================================================

function getImageFromAttachment(
  attachment
) {
  if (!attachment) {
    return null;
  }

  return (
    attachment.url ||
    attachment.previewUrl ||
    attachment.thumbnailUrl ||
    attachment.largePreviewUrl ||
    null
  );
}

function findImageURL(
  event,
  args
) {
  // ----------------------------------------------------------
  // 1. الرد على صورة
  // ----------------------------------------------------------

  const reply =
    event.messageReply;

  if (
    reply &&
    Array.isArray(reply.attachments)
  ) {
    const photo =
      reply.attachments.find(
        attachment =>
          attachment &&
          (
            attachment.type === "photo" ||
            attachment.type === "image"
          )
      );

    const url =
      getImageFromAttachment(
        photo
      );

    if (url) {
      return url;
    }
  }

  // ----------------------------------------------------------
  // 2. صورة مرفقة مع الأمر
  // ----------------------------------------------------------

  if (
    Array.isArray(event.attachments)
  ) {
    const photo =
      event.attachments.find(
        attachment =>
          attachment &&
          (
            attachment.type === "photo" ||
            attachment.type === "image"
          )
      );

    const url =
      getImageFromAttachment(
        photo
      );

    if (url) {
      return url;
    }
  }

  // ----------------------------------------------------------
  // 3. رابط داخل الأمر
  // ----------------------------------------------------------

  for (const arg of args || []) {
    const value =
      String(arg || "")
        .trim();

    if (
      /^https?:\/\//i.test(
        value
      )
    ) {
      return value;
    }
  }

  return null;
}

// ============================================================
// CHANGE GROUP IMAGE
// ============================================================

function changeGroupImage(
  api,
  imagePath,
  threadID
) {
  return new Promise(
    (resolve, reject) => {
      let finished = false;

      const done = (
        error
      ) => {
        if (finished) {
          return;
        }

        finished = true;

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      let stream;

      try {
        if (
          !fs.existsSync(
            imagePath
          )
        ) {
          return done(
            new Error(
              "ملف الصورة غير موجود."
            )
          );
        }

        stream =
          fs.createReadStream(
            imagePath
          );

        stream.on(
          "error",
          done
        );

        const result =
          api.changeGroupImage(
            stream,
            String(threadID),
            done
          );

        // ------------------------------------------------------
        // بعض نسخ FCA ترجع Promise
        // ------------------------------------------------------

        if (
          result &&
          typeof result.then ===
            "function"
        ) {
          result
            .then(() => done())
            .catch(error =>
              done(error)
            );
        }
      } catch (error) {
        done(error);
      }
    }
  );
}

// ============================================================
// APPLY LOCKED IMAGE
// ============================================================

async function applyLockedImage(
  api,
  threadID
) {
  const tid =
    cleanThreadID(
      threadID
    );

  const imagePath =
    getLockPath(tid);

  if (
    !fs.existsSync(imagePath)
  ) {
    throw new Error(
      "صورة القفل غير موجودة."
    );
  }

  await changeGroupImage(
    api,
    imagePath,
    tid
  );
}

// ============================================================
// IS IMAGE EVENT
// ============================================================

function isImageChangeEvent(
  event
) {
  if (!event) {
    return false;
  }

  return (
    event.logMessageType ===
      "log:thread-image" ||

    event.type ===
      "log:thread-image" ||

    (
      event.type === "event" &&
      event.logMessageType ===
        "log:thread-image"
    )
  );
}

// ============================================================
// GET EVENT AUTHOR
// ============================================================

function getEventAuthor(
  event
) {
  return String(
    event.author ||
    event.senderID ||
    event.actorID ||
    ""
  );
}

// ============================================================
// GET BOT ID
// ============================================================

function getBotID(api) {
  try {
    if (
      global.GoatBot?.botID
    ) {
      return String(
        global.GoatBot.botID
      );
    }

    if (
      global.GoatBot?.config?.botID
    ) {
      return String(
        global.GoatBot.config.botID
      );
    }

    if (
      typeof api.getCurrentUserID ===
        "function"
    ) {
      const result =
        api.getCurrentUserID();

      if (
        result &&
        typeof result.then ===
          "function"
      ) {
        return "";
      }

      if (result) {
        return String(
          result
        );
      }
    }
  } catch (_) {}

  return "";
}

// ============================================================
// STATUS
// ============================================================

function getStatus(
  threadID
) {
  const tid =
    cleanThreadID(
      threadID
    );

  const file =
    getLockPath(tid);

  return (
    locks[tid] === true &&
    fs.existsSync(file)
  );
}

// ============================================================
// HELP MESSAGE
// ============================================================

function helpMessage() {
  return (
    "╔══════════════════════════════╗\n" +
    "║       🖼️ SAIYAN GROUPIMG     ║\n" +
    "╠══════════════════════════════╣\n" +
    "║                              ║\n" +
    "║ 🖼️ تغيير وقفل صورة الغروب   ║\n" +
    "║                              ║\n" +
    "║ الاستخدام:                  ║\n" +
    "║                              ║\n" +
    "║ /groupimg [رابط الصورة]     ║\n" +
    "║                              ║\n" +
    "║ أو أرسل صورة مع الأمر       ║\n" +
    "║ أو رد على صورة بالأمر       ║\n" +
    "║                              ║\n" +
    "║ /groupimg off                ║\n" +
    "║ 🔓 فك قفل الصورة             ║\n" +
    "║                              ║\n" +
    "║ /groupimg status             ║\n" +
    "║ 📊 حالة القفل               ║\n" +
    "║                              ║\n" +
    "║ /groupimg help               ║\n" +
    "║ 📖 عرض المساعدة              ║\n" +
    "║                              ║\n" +
    "╚══════════════════════════════╝\n" +
    "        ⚡ Saiyan • Magnus"
  );
}

// ============================================================
// SUCCESS MESSAGE
// ============================================================

function successMessage() {
  return (
    "╔══════════════════════════════╗\n" +
    "║       ✅ SAIYAN GROUPIMG     ║\n" +
    "╠══════════════════════════════╣\n" +
    "║                              ║\n" +
    "║ 🖼️ تم تغيير صورة الغروب     ║\n" +
    "║                              ║\n" +
    "║ 🔒 تم تفعيل قفل الصورة      ║\n" +
    "║                              ║\n" +
    "║ إذا قام أحد بتغييرها،        ║\n" +
    "║ سيعيد سايان الصورة تلقائياً ║\n" +
    "║                              ║\n" +
    "║ 🔓 /groupimg off             ║\n" +
    "║ 📊 /groupimg status          ║\n" +
    "║                              ║\n" +
    "╚══════════════════════════════╝\n" +
    "       👑 Magnus • Saiyan"
  );
}

// ============================================================
// OFF MESSAGE
// ============================================================

function offMessage() {
  return (
    "╔══════════════════════════════╗\n" +
    "║       🔓 SAIYAN GROUPIMG     ║\n" +
    "╠══════════════════════════════╣\n" +
    "║                              ║\n" +
    "║ ✅ تم إلغاء قفل صورة الغروب  ║\n" +
    "║                              ║\n" +
    "║ 🖼️ يمكن الآن تغيير الصورة   ║\n" +
    "║ بحرية دون إعادتها.           ║\n" +
    "║                              ║\n" +
    "╚══════════════════════════════╝"
  );
}

// ============================================================
// STATUS MESSAGE
// ============================================================

function statusMessage(
  locked
) {
  if (locked) {
    return (
      "╔══════════════════════════════╗\n" +
      "║       🔒 SAIYAN GROUPIMG     ║\n" +
      "╠══════════════════════════════╣\n" +
      "║                              ║\n" +
      "║ 🟢 قفل صورة الغروب: مفعل    ║\n" +
      "║                              ║\n" +
      "║ 🛡️ الصورة محمية حالياً      ║\n" +
      "║ 🔄 سيتم إرجاعها تلقائياً    ║\n" +
      "║                              ║\n" +
      "║ /groupimg off لفك القفل     ║\n" +
      "║                              ║\n" +
      "╚══════════════════════════════╝"
    );
  }

  return (
    "╔══════════════════════════════╗\n" +
    "║       🔓 SAIYAN GROUPIMG     ║\n" +
    "╠══════════════════════════════╣\n" +
    "║                              ║\n" +
    "║ ⚫ قفل صورة الغروب: معطل     ║\n" +
    "║                              ║\n" +
    "║ يمكن تغيير الصورة بحرية.    ║\n" +
    "║                              ║\n" +
    "╚══════════════════════════════╝"
  );
}

// ============================================================
// MODULE
// ============================================================

module.exports = {
  config: {
    name: "groupimg",

    aliases: [
      "gcimg",
      "img",
      "صورة",
      "قفل_الصورة",
      "قفل_صورة"
    ],

    version: "6.0",

    author: "Magnus",

    countDown: 5,

    role: 2,

    category: "management",

    description:
      "تغيير وقفل صورة الغروب وإعادتها تلقائياً عند تغييرها",

    guide: {
      en:
        "{pn} [image URL] — تغيير وقفل الصورة\n" +
        "{pn} off — فك القفل\n" +
        "{pn} status — حالة القفل\n" +
        "{pn} help — المساعدة"
    }
  },

  // ==========================================================
  // COMMAND
  // ==========================================================

  onStart: async function ({
    api,
    event,
    args,
    message
  }) {
    const tid =
      cleanThreadID(
        event.threadID
      );

    if (!tid) {
      return message.reply(
        "❌ لم أتمكن من تحديد الغروب."
      );
    }

    // --------------------------------------------------------
    // Permission
    // --------------------------------------------------------

    const allowed =
      await canUseCommand(
        api,
        event
      );

    if (!allowed) {
      return message.reply(
        "⛔ هذا الأمر مخصص لأدمن الغروب."
      );
    }

    const sub =
      String(
        args?.[0] || ""
      )
        .trim()
        .toLowerCase();

    // --------------------------------------------------------
    // HELP
    // --------------------------------------------------------

    if (
      sub === "help" ||
      sub === "مساعدة"
    ) {
      return message.reply(
        helpMessage()
      );
    }

    // --------------------------------------------------------
    // OFF
    // --------------------------------------------------------

    if (
      sub === "off" ||
      sub === "إيقاف" ||
      sub === "ايقاف" ||
      sub === "stop"
    ) {
      locks[tid] = false;

      saveState();

      const lockPath =
        getLockPath(tid);

      try {
        if (
          fs.existsSync(
            lockPath
          )
        ) {
          fs.removeSync(
            lockPath
          );
        }
      } catch (_) {}

      try {
        if (
          typeof message.react ===
          "function"
        ) {
          await message.react(
            "🔓"
          );
        }
      } catch (_) {}

      return message.reply(
        offMessage()
      );
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (
      sub === "status" ||
      sub === "حالة" ||
      sub === "الحالة"
    ) {
      return message.reply(
        statusMessage(
          getStatus(tid)
        )
      );
    }

    // --------------------------------------------------------
    // IMAGE URL
    // --------------------------------------------------------

    const imageURL =
      findImageURL(
        event,
        args
      );

    if (!imageURL) {
      return message.reply(
        helpMessage()
      );
    }

    // --------------------------------------------------------
    // Prevent simultaneous operation
    // --------------------------------------------------------

    if (
      activeLocks.has(tid)
    ) {
      return message.reply(
        "⏳ يوجد تغيير صورة جارٍ لهذا الغروب، انتظر قليلاً."
      );
    }

    activeLocks.add(tid);

    try {
      // ------------------------------------------------------
      // Reaction
      // ------------------------------------------------------

      try {
        if (
          typeof message.react ===
          "function"
        ) {
          await message.react(
            "⏳"
          );
        }
      } catch (_) {}

      // ------------------------------------------------------
      // Download
      // ------------------------------------------------------

      const downloaded =
        await downloadImage(
          imageURL,
          tid
        );

      const lockPath =
        getLockPath(tid);

      // ------------------------------------------------------
      // Replace old image
      // ------------------------------------------------------

      try {
        if (
          fs.existsSync(
            lockPath
          )
        ) {
          fs.removeSync(
            lockPath
          );
        }
      } catch (_) {}

      fs.copyFileSync(
        downloaded,
        lockPath
      );

      // ------------------------------------------------------
      // Delete temporary file
      // ------------------------------------------------------

      try {
        fs.removeSync(
          downloaded
        );
      } catch (_) {}

      // ------------------------------------------------------
      // Change group image
      // ------------------------------------------------------

      await changeGroupImage(
        api,
        lockPath,
        tid
      );

      // ------------------------------------------------------
      // Enable lock
      // ------------------------------------------------------

      locks[tid] = true;

      saveState();

      // ------------------------------------------------------
      // Success reaction
      // ------------------------------------------------------

      try {
        if (
          typeof message.react ===
          "function"
        ) {
          await message.react(
            "✅"
          );
        }
      } catch (_) {}

      return message.reply(
        successMessage()
      );
    } catch (error) {
      global.log?.error?.(
        "GROUPIMG",
        `فشل تغيير الصورة: ${error.message}`
      );

      // إذا فشل التغيير لا نفعل القفل
      locks[tid] = false;
      saveState();

      try {
        if (
          typeof message.react ===
          "function"
        ) {
          await message.react(
            "❌"
          );
        }
      } catch (_) {}

      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║       ❌ SAIYAN GROUPIMG     ║\n" +
        "╠══════════════════════════════╣\n" +
        "║                              ║\n" +
        "║ فشل تغيير صورة الغروب.       ║\n" +
        "║                              ║\n" +
        "║ الأسباب المحتملة:           ║\n" +
        "║                              ║\n" +
        "║ • البوت ليس أدمن في الغروب   ║\n" +
        "║ • رابط الصورة غير مباشر      ║\n" +
        "║ • نسخة FCA لا تدعم العملية   ║\n" +
        "║ • حدث خطأ أثناء رفع الصورة   ║\n" +
        "║                              ║\n" +
        "╚══════════════════════════════╝\n\n" +
        `⚠️ ${String(
          error.message || error
        ).slice(0, 250)}`
      );
    } finally {
      activeLocks.delete(
        tid
      );
    }
  },

  // ==========================================================
  // EVENT
  // ==========================================================

  onEvent: async function ({
    api,
    event
  }) {
    // --------------------------------------------------------
    // Only image changes
    // --------------------------------------------------------

    if (
      !isImageChangeEvent(
        event
      )
    ) {
      return;
    }

    const tid =
      cleanThreadID(
        event.threadID
      );

    if (!tid) {
      return;
    }

    // --------------------------------------------------------
    // Is lock enabled?
    // --------------------------------------------------------

    if (
      locks[tid] !== true
    ) {
      return;
    }

    const lockPath =
      getLockPath(tid);

    if (
      !fs.existsSync(
        lockPath
      )
    ) {
      // ملف الصورة غير موجود
      locks[tid] = false;
      saveState();
      return;
    }

    // --------------------------------------------------------
    // Ignore bot's own event
    // --------------------------------------------------------

    const botID =
      getBotID(api);

    const author =
      getEventAuthor(
        event
      );

    if (
      botID &&
      author &&
      botID === author
    ) {
      return;
    }

    // --------------------------------------------------------
    // Prevent simultaneous restore
    // --------------------------------------------------------

    if (
      activeLocks.has(tid)
    ) {
      return;
    }

    activeLocks.add(tid);

    try {
      // ------------------------------------------------------
      // Wait for Facebook event to settle
      // ------------------------------------------------------

      await sleep(5000);

      // ------------------------------------------------------
      // Three REAL attempts
      // ------------------------------------------------------

      let restored =
        false;

      let lastError =
        null;

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {
        try {
          if (
            !fs.existsSync(
              lockPath
            )
          ) {
            break;
          }

          await applyLockedImage(
            api,
            tid
          );

          restored = true;

          global.log?.info?.(
            "GROUPIMG",
            `تمت إعادة صورة الغروب ${tid} — المحاولة ${attempt}`
          );

          break;
        } catch (error) {
          lastError =
            error;

          global.log?.warn?.(
            "GROUPIMG",
            `فشل استرجاع الصورة ${tid} — المحاولة ${attempt}/3: ${error.message}`
          );

          if (
            attempt < 3
          ) {
            await sleep(
              4000 * attempt
            );
          }
        }
      }

      if (
        !restored &&
        lastError
      ) {
        global.log?.error?.(
          "GROUPIMG",
          `فشل استرجاع صورة الغروب ${tid} بعد 3 محاولات: ${lastError.message}`
        );
      }
    } catch (error) {
      global.log?.error?.(
        "GROUPIMG",
        `خطأ في نظام حماية الصورة: ${error.message}`
      );
    } finally {
      activeLocks.delete(
        tid
      );
    }
  },

  // ==========================================================
  // COMPATIBILITY
  // ==========================================================

  onReply: async function () {}
};
