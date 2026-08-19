/**
 * SAIYAN — /addlock
 * Target Member Counter
 *
 * /addlock 250       ← تحديد العدد المستهدف
 * /addlock on        ← تشغيل المراقبة
 * /addlock off       ← إيقاف
 * /addlock status    ← الحالة
 * /addlock clear     ← حذف الإعداد
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "database", "data");
const DATA_FILE = path.join(DATA_DIR, "addLockConfig.json");

fs.ensureDirSync(DATA_DIR);

function loadConfig() {
  try {
    if (!fs.existsSync(DATA_FILE))
      return {};

    const data = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );

    return data && typeof data === "object" ? data : {};
  } catch (_) {
    return {};
  }
}

function saveConfig(data) {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch (e) {
    if (global.log)
      global.log.warn("ADDLOCK", e.message);
  }
}

if (!global._saiyanAddLockCounter)
  global._saiyanAddLockCounter = loadConfig();

const CONFIG = global._saiyanAddLockCounter;

function normalizeID(id) {
  return String(id || "").replace(/[^\d]/g, "");
}

function isAdmin(uid) {
  const cfg = global.GoatBot?.config || {};
  const id = normalizeID(uid);

  const owners = [
    cfg.ownerID,
    ...(cfg.ownerIDs || []),
    ...(cfg.superAdminBot || [])
  ]
    .filter(Boolean)
    .map(normalizeID);

  const admins = [
    ...(cfg.adminBot || [])
  ]
    .filter(Boolean)
    .map(normalizeID);

  return owners.includes(id) || admins.includes(id);
}

function getTarget(tid) {
  return Number(CONFIG[tid]?.target || 0);
}

async function getMembers(api, tid) {
  return new Promise((resolve, reject) => {
    try {
      api.getThreadInfo(tid, (err, info) => {
        if (err) return reject(err);

        const ids = Array.isArray(info?.participantIDs)
          ? info.participantIDs
          : [];

        resolve(ids);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function getCount(api, tid) {
  try {
    const members = await getMembers(api, tid);
    return members.length;
  } catch (_) {
    return null;
  }
}

function statusMessage(tid, current) {
  const target = getTarget(tid);

  if (!target) {
    return (
      "╔══════════════════════════════╗\n" +
      "║      🔒 SAIYAN ADDLOCK       ║\n" +
      "╠══════════════════════════════╣\n" +
      "║ الحالة: ⏹ غير مضبوط         ║\n" +
      "║ استخدم /addlock 250          ║\n" +
      "╚══════════════════════════════╝"
    );
  }

  const difference =
    Math.max(target - current, 0);

  const state =
    CONFIG[tid].enabled
      ? "✅ مفعّل"
      : "⏹ موقوف";

  return (
    "╔══════════════════════════════╗\n" +
    "║      🔒 SAIYAN ADDLOCK       ║\n" +
    "╠══════════════════════════════╣\n" +
    `║ الحالة : ${state}\n` +
    `║ الهدف  : ${target} عضو\n` +
    `║ الحالي : ${current} عضو\n` +
    `║ النقص  : ${difference} عضو\n` +
    "╠══════════════════════════════╣\n" +
    "║ 📡 المراقبة: " +
    (CONFIG[tid].enabled ? "نشطة" : "متوقفة") +
    "\n" +
    "╚══════════════════════════════╝"
  );
}

function isLeaveEvent(event) {
  const type = String(
    event?.logMessageType ||
    event?.type ||
    ""
  );

  return (
    type === "log:unsubscribe" ||
    type === "log:thread-remove-members"
  );
}

module.exports = {
  config: {
    name: "addlock",
    aliases: [
      "memberlock",
      "قفل-العدد",
      "قفل_العدد"
    ],
    version: "3.0",
    author: "Magnus",
    countDown: 3,
    role: 2,
    category: "management",

    description:
      "مراقبة عدد أعضاء الغروب مقارنة بالعدد المستهدف",

    guide: {
      en:
        "{pn} 250 — تحديد العدد المستهدف\n" +
        "{pn} on — تشغيل\n" +
        "{pn} off — إيقاف\n" +
        "{pn} status — الحالة\n" +
        "{pn} clear — حذف الإعداد"
    }
  },

  onStart: async function ({
    api,
    event,
    args,
    message
  }) {

    if (!isAdmin(event.senderID)) {
      return message.reply(
        "⛔ هذا الأمر للأدمن فقط."
      );
    }

    const tid =
      normalizeID(event.threadID);

    const sub =
      String(args[0] || "")
        .toLowerCase();

    /* =========================
       تحديد الهدف
    ========================= */

    if (/^\d+$/.test(sub)) {

      const target = Number(sub);

      if (target < 1 || target > 100000) {
        return message.reply(
          "⚠️ أدخل رقماً صحيحاً بين 1 و100000."
        );
      }

      CONFIG[tid] = {
        target,
        enabled: false,
        updatedAt: Date.now()
      };

      saveConfig(CONFIG);

      const current =
        await getCount(api, tid);

      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║      🔒 ADDLOCK READY        ║\n" +
        "╠══════════════════════════════╣\n" +
        `║ 🎯 الهدف: ${target} عضو\n` +
        `║ 👥 الحالي: ${
          current === null ? "غير معروف" : current
        }\n` +
        "║ ⏹ الحالة: موقوف\n" +
        "╠══════════════════════════════╣\n" +
        "║ استخدم /addlock on للتفعيل  ║\n" +
        "╚══════════════════════════════╝"
      );
    }

    /* =========================
       تشغيل
    ========================= */

    if (
      sub === "on" ||
      sub === "تشغيل" ||
      sub === "تفعيل"
    ) {

      if (!CONFIG[tid]?.target) {
        return message.reply(
          "⚠️ لم تحدد العدد المستهدف.\n\n" +
          "مثال:\n" +
          "/addlock 250\n" +
          "/addlock on"
        );
      }

      CONFIG[tid].enabled = true;
      saveConfig(CONFIG);

      const current =
        await getCount(api, tid);

      return message.reply(
        statusMessage(
          tid,
          current ?? 0
        )
      );
    }

    /* =========================
       إيقاف
    ========================= */

    if (
      sub === "off" ||
      sub === "إيقاف" ||
      sub === "تعطيل"
    ) {

      if (CONFIG[tid]) {
        CONFIG[tid].enabled = false;
        saveConfig(CONFIG);
      }

      return message.reply(
        "🔓 تم إيقاف AddLock لهذا الغروب."
      );
    }

    /* =========================
       الحالة
    ========================= */

    if (
      sub === "status" ||
      sub === "حالة"
    ) {

      const current =
        await getCount(api, tid);

      if (current === null) {
        return message.reply(
          "❌ تعذر الحصول على عدد أعضاء الغروب."
        );
      }

      return message.reply(
        statusMessage(tid, current)
      );
    }

    /* =========================
       حذف
    ========================= */

    if (
      sub === "clear" ||
      sub === "مسح"
    ) {

      delete CONFIG[tid];
      saveConfig(CONFIG);

      return message.reply(
        "🗑️ تم حذف إعدادات AddLock لهذا الغروب."
      );
    }

    /* =========================
       تعليمات
    ========================= */

    return message.reply(
      "╔══════════════════════════════╗\n" +
      "║      🔒 SAIYAN ADDLOCK       ║\n" +
      "╠══════════════════════════════╣\n" +
      "║ /addlock 250                 ║\n" +
      "║ تحديد العدد المستهدف         ║\n" +
      "║                              ║\n" +
      "║ /addlock on                  ║\n" +
      "║ تشغيل المراقبة               ║\n" +
      "║                              ║\n" +
      "║ /addlock off                 ║\n" +
      "║ إيقاف المراقبة               ║\n" +
      "║                              ║\n" +
      "║ /addlock status              ║\n" +
      "║ عرض العدد الحالي والنقص      ║\n" +
      "║                              ║\n" +
      "║ /addlock clear               ║\n" +
      "║ حذف الإعداد                  ║\n" +
      "╚══════════════════════════════╝"
    );
  },

  /* ===========================
     مراقبة المغادرة
  =========================== */

  onEvent: async function ({
    api,
    event
  }) {

    if (!isLeaveEvent(event))
      return;

    const tid =
      normalizeID(event.threadID);

    const data =
      CONFIG[tid];

    if (
      !data ||
      data.enabled !== true ||
      !data.target
    ) {
      return;
    }

    const current =
      await getCount(api, tid);

    if (current === null)
      return;

    const missing =
      Math.max(
        Number(data.target) - current,
        0
      );

    if (global.log) {
      global.log.info(
        "ADDLOCK",
        `الغروب ${tid} — الحالي: ${current} — الهدف: ${data.target} — النقص: ${missing}`
      );
    }

    /*
     * لا تتم إضافة أعضاء تلقائياً.
     * النظام يكتفي بمراقبة العدد.
     */
  }
};
