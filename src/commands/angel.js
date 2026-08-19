/**
 * SAIYAN V5 — رسائل تلقائية مع نظام مراقبة ذكي
 * Bot Name: SAIYAN
 * Developer: Magnus
 *
 * ✦ سايان [الرسالة] [الوقت]       → تشغيل
 * ✦ سايان [الرسالة] [min] [max]  → تشغيل بفاصل عشوائي
 * ✦ سايان ايقاف                   → إيقاف
 * ✦ سايان حالة                    → عرض الحالة
 *
 * ✦ يتوقف مؤقتاً بعد 3 رسائل متتالية بدون رد بشري
 * ✦ يستأنف عند أول رسالة بشرية
 * ✦ بعد 16 دقيقة من الصمت يرسل رسالة الهروب ثم يغادر
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");

const DATA = path.join(
  process.cwd(),
  "database/data/saiyanData.json"
);

function load() {
  try {
    if (fs.existsSync(DATA)) {
      return JSON.parse(
        fs.readFileSync(DATA, "utf8")
      );
    }
  } catch (_) {}

  return {};
}

function save(d) {
  fs.ensureDirSync(path.dirname(DATA));

  fs.writeFileSync(
    DATA,
    JSON.stringify(d, null, 2)
  );
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}


// ── Global State ──────────────────────────────────────────────────────────────

if (!global.GoatBot.saiyanIntervals)
  global.GoatBot.saiyanIntervals = {};

if (!global._saiyanState)
  global._saiyanState = {};


// ── Human Message Listener ───────────────────────────────────────────────────

if (!global._msgListeners)
  global._msgListeners = [];

if (!global._saiyanListenerRegistered) {

  global._saiyanListenerRegistered = true;

  global._msgListeners.push(({ threadID }) => {

    const st =
      global._saiyanState[threadID];

    if (!st)
      return;

    st.consecutive = 0;
    st.lastHumanTs = Date.now();

    if (st.paused) {

      st.paused = false;

      const data = load();
      const td = data[threadID];

      if (
        td?.active &&
        global.GoatBot?.fcaApi
      ) {

        scheduleNext(
          global.GoatBot.fcaApi,
          threadID,
          td
        );
      }
    }
  });
}


// ── Core Scheduler ───────────────────────────────────────────────────────────

function scheduleNext(api, tid, td) {

  clearTimeout(
    global.GoatBot.saiyanIntervals[tid]
  );

  delete global.GoatBot.saiyanIntervals[tid];

  if (!td?.active || !td?.message)
    return;


  if (!global._saiyanState[tid]) {

    global._saiyanState[tid] = {
      consecutive: 0,
      paused: false,
      lastHumanTs: Date.now()
    };
  }


  if (
    global._saiyanState[tid].paused
  ) {
    return;
  }


  const ms = Math.round(
    rand(
      td.minSeconds ?? 60,
      td.maxSeconds ??
        td.minSeconds ??
        60
    ) * 1000
  );


  global.GoatBot.saiyanIntervals[tid] =
    setTimeout(async () => {

      delete global.GoatBot.saiyanIntervals[tid];

      const fresh = load()[tid];

      if (!fresh?.active)
        return;


      const st =
        global._saiyanState[tid] || {};


      // ── 16 دقيقة بدون رد بشري ──────────────────────────────────────────

      if (
        Date.now() -
        (st.lastHumanTs || Date.now())
        >
        16 * 60 * 1000
      ) {

        try {

          await api.sendMessage(
            "هروب ابن ﭑﭑلَـڨَـ📜⍣⃟ـﹻ۪۫٘ہـ𝑯ـٰٰٰٰٖٖٖٖٖﹻ۪┇ـےـ❄️ـ┇بَِـ⥢🪽⥤ـےـٰٰٰٰٖٖٖٖٖ𝐁ـޢـٰٰٰٰٖٖٖٖٖޢـة",
            tid
          );

        } catch (_) {}


        await new Promise(
          r => setTimeout(r, 2000)
        );


        try {

          await api.removeUserFromGroup(
            global.GoatBot.botID,
            tid
          );

        } catch (_) {}


        const d = load();

        if (d[tid]) {

          d[tid].active = false;

          save(d);
        }


        delete global._saiyanState[tid];

        clearTimeout(
          global.GoatBot.saiyanIntervals[tid]
        );

        return;
      }


      // ── 3 رسائل متتالية → توقف مؤقت ───────────────────────────────────

      if (
        (st.consecutive || 0) >= 3
      ) {

        st.paused = true;

        global._saiyanState[tid] = st;

        return;
      }


      // ── إرسال الرسالة ──────────────────────────────────────────────────

      try {

        const delay =
          global.utils
            ?.calcHumanTypingDelay
            ?.(
              fresh.message
            ) || 1500;


        await global.utils
          ?.simulateTyping
          ?.(
            api,
            tid,
            delay
          );


        await api.sendMessage(
          fresh.message,
          tid
        );


        st.consecutive =
          (st.consecutive || 0) + 1;

        global._saiyanState[tid] = st;

      } catch (_) {}


      const next = load()[tid];

      if (next?.active) {

        scheduleNext(
          api,
          tid,
          next
        );
      }

    }, ms);
}


// ── Session Restore ──────────────────────────────────────────────────────────

function restoreAll(api) {

  if (global.GoatBot._saiyanRestored)
    return;

  global.GoatBot._saiyanRestored = true;

  const data = load();


  for (
    const [tid, td]
    of Object.entries(data)
  ) {

    if (
      td.active &&
      td.message
    ) {

      if (
        !global._saiyanState[tid]
      ) {

        global._saiyanState[tid] = {
          consecutive: 0,
          paused: false,
          lastHumanTs: Date.now()
        };
      }


      scheduleNext(
        api,
        tid,
        td
      );
    }
  }
}


// ── Module ───────────────────────────────────────────────────────────────────

module.exports = {

  config: {

    name: "سايان",

    aliases: [
      "saiyan",
      "sy"
    ],

    version: "5.0",

    author: "Magnus",

    countDown: 3,

    role: 2,

    category: "management",

    description:
      "SAIYAN — نظام الرسائل التلقائية الذكي",

    guide: {

      en:
        "{pn} [رسالة] [الوقت] — تشغيل\n" +
        "{pn} [رسالة] [min] [max] — تشغيل بفاصل عشوائي\n" +
        "{pn} ايقاف — إيقاف\n" +
        "{pn} حالة — عرض الحالة"

    }
  },


  onStart: async function({
    api,
    event,
    args,
    message
  }) {

    const tid =
      event.threadID;


    restoreAll(api);


    const data =
      load();


    const sub =
      (args[0] || "")
        .toLowerCase();


    // ── الحالة ────────────────────────────────────────────────────────────

    if (
      !sub ||
      sub === "status" ||
      sub === "حالة"
    ) {

      const td =
        data[tid];


      if (!td?.active) {

        return message.reply(
          "⌁ SAIYAN غير مفعل في هذا الغروب."
        );
      }


      const st =
        global._saiyanState[tid] ||
        {};


      const mode =
        st.paused
          ? "⏸ متوقف مؤقتاً — ينتظر تفاعل"
          : "⚡ يعمل الآن";


      return message.reply(

        `╭───〔 SAIYAN 〕───╮\n` +
        `│ 👤 المطور: Magnus\n` +
        `│ الحالة: ${mode}\n` +
        `│ 📝 الرسالة: ${td.message}\n` +
        `│ ⏱ الفاصل: ${td.minSeconds}–${td.maxSeconds} ثانية\n` +
        `│ 🔢 التسلسل: ${st.consecutive || 0}/3\n` +
        `╰─────────────────╯`

      );
    }


    // ── إيقاف ────────────────────────────────────────────────────────────

    if (
      sub === "off" ||
      sub === "stop" ||
      sub === "إيقاف" ||
      sub === "ايقاف"
    ) {

      clearTimeout(
        global.GoatBot
          .saiyanIntervals[tid]
      );


      delete
        global.GoatBot
          .saiyanIntervals[tid];


      delete
        global._saiyanState[tid];


      if (data[tid]) {

        data[tid].active = false;

        save(data);
      }


      return message.reply(
        "◈ تم إيقاف SAIYAN بنجاح."
      );
    }


    // ── استخراج الوقت والرسالة ───────────────────────────────────────────

    const nums =
      args.filter(
        a => /^\d+$/.test(a)
      );


    const textParts =
      args.filter(
        a =>
          !/^\d+$/.test(a) &&
          a.toLowerCase() !== "on" &&
          a.toLowerCase() !== "start" &&
          a !== "تشغيل"
      );


    const msg =
      textParts
        .join(" ")
        .trim() ||
      data[tid]?.message ||
      "⌁ SAIYAN هنا.";


    const minS =
      parseInt(nums[0]) || 60;


    const maxS =
      Math.max(
        parseInt(nums[1]) || minS,
        minS
      );


    data[tid] = {

      active: true,

      message: msg,

      minSeconds: minS,

      maxSeconds: maxS

    };


    save(data);


    global._saiyanState[tid] = {

      consecutive: 0,

      paused: false,

      lastHumanTs: Date.now()

    };


    scheduleNext(
      api,
      tid,
      data[tid]
    );


    return message.reply(

      `╭──────〔 ⚡ 〕──────╮\n` +
      `       S A I Y A N\n` +
      `╰───────────────────╯\n\n` +
      `◈ تم تشغيل النظام\n` +
      `◈ 👤 المطور: Magnus\n` +
      `◈ 📝 النص: ${msg}\n` +
      `◈ ⏱ التوقيت: ${minS}–${maxS} ثانية\n` +
      `◈ ⏸ التوقف المؤقت: بعد 3 رسائل\n` +
      `◈ ↻ الاستئناف: عند التفاعل\n` +
      `◈ 🚪 المغادرة: بعد 16 دقيقة صمت`

    );
  }
};
