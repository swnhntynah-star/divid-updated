/**
 * SAIYAN — /help — قائمة الأوامر الكاملة (Ultimate Edition)
 * Copyright © 2026 Magnus — All rights reserved
 * Saiyan Messenger Bot — Full Commands System
 */
"use strict";

const CATEGORIES = [
  {
    icon: "⚔️",
    title: "الإدارة والتحكم",
    cmds: [
      { name: "nm", icon: "🧿", desc: "حماية اسم الغروب ومنع أي تعديل عليه" },
      { name: "nick", icon: "🪶", desc: "تثبيت كنيات الأعضاء وحمايتها باستمرار" },
      { name: "groupimg", icon: "🌌", desc: "تغيير صورة الغروب وحمايتها" },
      { name: "groupname", icon: "🏷️", desc: "تعديل اسم الغروب بسرعة" },
      { name: "setavatar", icon: "📷", desc: "تغيير صورة حساب البوت" },
      { name: "addlock", icon: "🔗", desc: "تثبيت عدد أعضاء الغروب تلقائياً" },
      { name: "thread", icon: "🛠️", desc: "إدارة إعدادات الغروب والترحيب والوداع" },
      { name: "out", icon: "🚪", desc: "إخراج سايان من الغروب الحالي" },
    ],
  },

  {
    icon: "🧑‍🤝‍🧑",
    title: "إدارة الأعضاء",
    cmds: [
      { name: "all", icon: "📣", desc: "مناداة جميع أعضاء الغروب" },
      { name: "tag", icon: "🎯", desc: "مناداة مجموعات محددة من الأعضاء" },
      { name: "kick", icon: "🥾", desc: "إزالة عضو من الغروب" },
      { name: "adduser", icon: "➕", desc: "إضافة عضو جديد إلى الغروب" },
      { name: "addadmin", icon: "♛", desc: "إدارة مشرفي نظام البوت" },
      { name: "ban", icon: "⛔", desc: "منع مستخدم من استخدام البوت" },
      { name: "warn", icon: "🚨", desc: "إرسال تحذير للعضو وإدارة إنذاراته" },
      { name: "badwords", icon: "🧹", desc: "تنقية الغروب من الكلمات المحظورة" },
    ],
  },

  {
    icon: "📨",
    title: "الرسائل التلقائية",
    cmds: [
      { name: "angel", icon: "🪽", desc: "إرسال رسائل تلقائية بشكل دوري" },
      { name: "divel", icon: "🌑", desc: "رسائل دورية بفواصل زمنية عشوائية" },
      { name: "greet", icon: "✨", desc: "رسالة تعريفية وترحيبية بنظام سايان" },
    ],
  },

  {
    icon: "🎮",
    title: "الترفيه والوسائط",
    cmds: [
      { name: "song", icon: "🎧", desc: "البحث عن الأغاني وتنزيلها من YouTube" },
      { name: "video", icon: "📺", desc: "البحث عن فيديوهات YouTube وتنزيلها" },
      { name: "tiktok", icon: "🎞️", desc: "تنزيل فيديوهات TikTok" },
      { name: "sticker", icon: "🧩", desc: "تحويل الصور إلى ملصقات" },
      { name: "sexvid", icon: "🔞", desc: "محتوى للبالغين مخصص للمشرفين" },
      { name: "webvideo", icon: "🌐", desc: "البحث عن فيديوهات من مواقع الويب المدعومة" },
      { name: "pair", icon: "💫", desc: "اختيار ثنائي عشوائي من أعضاء الغروب" },
    ],
  },

  {
    icon: "🧠",
    title: "الذكاء الاصطناعي",
    cmds: [
      { name: "ai", icon: "🤖", desc: "التحدث مع نظام الذكاء الاصطناعي" },
      { name: "imagegen", icon: "🖌️", desc: "إنشاء صور بواسطة الذكاء الاصطناعي" },
      { name: "pinterest", icon: "🔎", desc: "البحث عن الصور عبر Pinterest" },
      { name: "webss", icon: "🖥️", desc: "التقاط صورة لأي موقع إلكتروني" },
    ],
  },

  {
    icon: "🧰",
    title: "الأدوات والمعلومات",
    cmds: [
      { name: "translate", icon: "🗺️", desc: "ترجمة النصوص بين اللغات المختلفة" },
      { name: "weather", icon: "☁️", desc: "عرض حالة الطقس لمدينة معينة" },
      { name: "uid", icon: "🆔", desc: "استخراج معرف حساب فيسبوك" },
      { name: "info", icon: "📋", desc: "عرض معلومات الغروب أو أحد أعضائه" },
      { name: "ping", icon: "📶", desc: "فحص سرعة استجابة سايان" },
      { name: "rank", icon: "🥇", desc: "عرض المستوى ونقاط الخبرة XP" },
      { name: "unsend", icon: "♻️", desc: "حذف آخر رسالة أرسلها البوت" },
    ],
  },

  {
    icon: "💎",
    title: "الاقتصاد",
    cmds: [
      {
        name: "economy",
        icon: "🪙",
        desc: "إدارة الرصيد والمكافآت والمراهنات",
      },
    ],
  },

  {
    icon: "⚙️",
    title: "النظام والإعدادات",
    cmds: [
      {
        name: "prefix",
        icon: "🔧",
        desc: "تغيير بادئة أوامر سايان",
      },
      {
        name: "autoseen",
        icon: "👀",
        desc: "تشغيل أو إيقاف مشاهدة الرسائل تلقائياً",
      },
      {
        name: "uptime",
        icon: "⏳",
        desc: "عرض مدة تشغيل البوت وإحصائياته",
      },
      {
        name: "chats",
        icon: "🗂️",
        desc: "إدارة الغروبات والمحادثات",
      },
      {
        name: "getstate",
        icon: "🔐",
        desc: "استخراج AppState للمالك",
      },
      {
        name: "help",
        icon: "📖",
        desc: "فتح دليل أوامر سايان",
      },
    ],
  },
];

const CMD_DETAILS = {
  nm: {
    usage: "/nm [اسم] / off / time [min] [max] / status",
    role: "🔑 Admin",
    cat: "الإدارة",
  },

  nick: {
    usage: "/nick [اسم] / off / status / حدف",
    role: "🔑 Admin",
    cat: "الإدارة",
  },

  groupimg: {
    usage: "/groupimg [رابط أو صورة] / off / status",
    role: "🔑 Admin",
    cat: "الإدارة",
  },

  groupname: {
    usage: "/groupname [الاسم الجديد]",
    role: "🔑 Admin",
    cat: "الإدارة",
  },

  setavatar: {
    usage: "/setavatar [رابط] — أو رد على صورة",
    role: "👑 Owner",
    cat: "الإدارة",
  },

  addlock: {
    usage: "/addlock on|off|status|list|clear / [id] [روابط...]",
    role: "👑 Owner",
    cat: "الإدارة",
  },

  thread: {
    usage: "/thread welcome [رسالة] / leave [رسالة] / status",
    role: "🔑 Admin",
    cat: "الإدارة",
  },

  out: {
    usage: "/out — إخراج سايان من الغروب الحالي",
    role: "👑 Owner",
    cat: "الإدارة",
  },

  all: {
    usage: "/all [رسالة اختيارية] — مناداة الجميع",
    role: "🔑 Admin",
    cat: "الأعضاء",
  },

  tag: {
    usage: "/tag add [اسم] @tag / [اسم] / list / remove / info",
    role: "🔑 Admin",
    cat: "الأعضاء",
  },

  kick: {
    usage: "/kick @شخص — أو رد على رسالته",
    role: "🔑 Admin",
    cat: "الأعضاء",
  },

  adduser: {
    usage: "/adduser [ID أو رابط] / [ID1] [ID2]",
    role: "🔑 Admin",
    cat: "الأعضاء",
  },

  addadmin: {
    usage: "/addadmin [1-3] @tag / list / remove [ID]",
    role: "👑 Owner",
    cat: "الأعضاء",
  },

  ban: {
    usage: "/ban @شخص / list / remove [ID]",
    role: "🔑 Admin",
    cat: "الأعضاء",
  },

  warn: {
    usage: "/warn @شخص / clear @شخص / list",
    role: "🔑 Admin",
    cat: "الأعضاء",
  },

  badwords: {
    usage: "/badwords on|off / add [كلمات] / remove / list / unwarn",
    role: "🔑 Admin",
    cat: "الأعضاء",
  },

  angel: {
    usage: "/angel [رسالة] [min-max ثانية] / off / status",
    role: "🔑 Admin",
    cat: "الرسائل",
  },

  divel: {
    usage: "/divel [رسالة] [min-max] / off / status",
    role: "🔑 Admin",
    cat: "الرسائل",
  },

  greet: {
    usage: "/greet — فتح رسالة سايان الترحيبية",
    role: "👤 User",
    cat: "الرسائل",
  },

  song: {
    usage: "/song [اسم الأغنية أو كلمات]",
    role: "👤 User",
    cat: "الترفيه",
  },

  video: {
    usage: "/video [بحث أو رابط يوتيوب]",
    role: "👤 User",
    cat: "الترفيه",
  },

  tiktok: {
    usage: "/tiktok [بحث أو رابط]",
    role: "👤 User",
    cat: "الترفيه",
  },

  tik: {
    usage: "/tiktok [بحث أو رابط]",
    role: "👤 User",
    cat: "الترفيه",
  },

  sticker: {
    usage: "/sticker — رد على صورة بالأمر",
    role: "👤 User",
    cat: "الترفيه",
  },

  sexvid: {
    usage: "/sexvid — محتوى للبالغين",
    role: "🔑 Admin",
    cat: "الترفيه",
  },

  webvideo: {
    usage:
      "/webvideo [موقع] [بحث?]\n" +
      "مواقع: xnxx|xvideos|pornhub|xhamster|redtube|youporn\n" +
      "ردّ بالرقم لتحميل الفيديو",
    role: "🔑 Admin",
    cat: "الترفيه",
  },

  pair: {
    usage: "/pair — اختيار عشوائي / @شخص لتحديد العضو",
    role: "👤 User",
    cat: "الترفيه",
  },

  ai: {
    usage: "/ai [سؤالك] / /gpt [سؤالك]",
    role: "👤 User",
    cat: "الذكاء",
  },

  imagegen: {
    usage: "/imagegen [وصف الصورة] / /wgen [prompt]",
    role: "👤 User",
    cat: "الذكاء",
  },

  pinterest: {
    usage: "/pinterest [كلمة البحث] / /pin [كلمة]",
    role: "👤 User",
    cat: "الذكاء",
  },

  webss: {
    usage: "/webss [رابط الموقع]",
    role: "👤 User",
    cat: "الذكاء",
  },

  translate: {
    usage: "/translate [نص] -> [كود]\n/trans مرحبا -> en",
    role: "👤 User",
    cat: "الأدوات",
  },

  weather: {
    usage: "/weather [المدينة]\nمثال: /weather طرابلس",
    role: "👤 User",
    cat: "الأدوات",
  },

  uid: {
    usage: "/uid — معرفك / رد على رسالة / @tag",
    role: "👤 User",
    cat: "الأدوات",
  },

  info: {
    usage: "/info — معلومات الغروب / @tag معلومات شخص",
    role: "👤 User",
    cat: "الأدوات",
  },

  ping: {
    usage: "/ping — فحص سرعة الاستجابة",
    role: "👤 User",
    cat: "الأدوات",
  },

  rank: {
    usage: "/rank — مستواك / /rank @tag — مستوى شخص",
    role: "👤 User",
    cat: "الأدوات",
  },

  unsend: {
    usage: "/unsend — حذف آخر رسالة للبوت / رد على رسالته",
    role: "👤 User",
    cat: "الأدوات",
  },

  economy: {
    usage:
      "/balance / /daily / /bet [مبلغ] / /slot [مبلغ] / /pay @شخص [مبلغ]",
    role: "👤 User",
    cat: "الاقتصاد",
  },

  prefix: {
    usage: "/prefix [البادئة الجديدة] — مثال: /prefix !",
    role: "👑 Owner",
    cat: "النظام",
  },

  autoseen: {
    usage: "/autoseen on|off|status",
    role: "🔑 Admin",
    cat: "النظام",
  },

  uptime: {
    usage: "/uptime — معلومات تشغيل سايان",
    role: "👤 User",
    cat: "النظام",
  },

  chats: {
    usage:
      "/chats — اختيار غروب وتفعيل/تعطيل Angel وNM وNick\n" +
      "/chats count\n" +
      "/chats dm on|off",
    role: "🔑 Admin",
    cat: "النظام",
  },

  getstate: {
    usage: "/getstate / /getstate cookie / /getstate string",
    role: "👑 Owner",
    cat: "النظام",
  },

  help: {
    usage: "/help — /help [اسم الأمر]",
    role: "👤 User",
    cat: "النظام",
  },
};

const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

function buildHelpAll(prefix) {
  const allCmds = global.GoatBot?.commands;
  let totalCmds = 0;

  if (allCmds?.size) {
    const seen = new Set();

    for (const [, cmd] of allCmds) {
      if (cmd.config?.name) {
        seen.add(cmd.config.name);
      }
    }

    totalCmds = seen.size;
  } else {
    for (const cat of CATEGORIES) {
      totalCmds += cat.cmds.length;
    }
  }

  const lines = [];

  lines.push(LINE);
  lines.push("  ✦  S A I Y A N  ✦  M E S S E N G E R");
  lines.push("  ⚡ نظامك الذكي لإدارة الغروبات");
  lines.push(`  👑 Developed by Magnus  •  Prefix: ${prefix}`);
  lines.push(LINE);
  lines.push("");

  for (const cat of CATEGORIES) {
    const padLen = Math.max(
      1,
      22 - cat.title.length
    );

    lines.push(
      ` ╔═ ${cat.icon} ${cat.title} ${"═".repeat(padLen)}╗`
    );

    for (const cmd of cat.cmds) {
      lines.push(
        ` ║  ${cmd.icon}  ${prefix}${cmd.name.padEnd(
          13
        )}${cmd.desc}`
      );
    }

    lines.push(
      ` ╚${"═".repeat(35)}╝`
    );

    lines.push("");
  }

  lines.push(LINE);
  lines.push(
    `  📦 إجمالي الأوامر: ${totalCmds}  •  🛡️ نظام حماية متكامل`
  );
  lines.push(
    `  🔍 ${prefix}help [اسم الأمر] ← لعرض تفاصيل أي أمر`
  );
  lines.push(
    `  👑 المطور: Magnus  •  🤖 البوت: Saiyan`
  );
  lines.push(LINE);

  return lines.join("\n");
}

function buildHelpOne(rawName, prefix) {
  const name = String(rawName)
    .toLowerCase()
    .replace(/^\//, "");

  const allCmds = global.GoatBot?.commands;

  let cmd = allCmds?.get(name);

  if (!cmd && allCmds) {
    for (const [, c] of allCmds) {
      if (
        (c.config?.aliases || [])
          .map(a =>
            String(a).toLowerCase()
          )
          .includes(name)
      ) {
        cmd = c;
        break;
      }
    }
  }

  const info =
    CMD_DETAILS[name] ||
    CMD_DETAILS[cmd?.config?.name] ||
    {};

  const config =
    cmd?.config || {};

  const cmdName =
    config.name || name;

  const desc =
    config.description ||
    config.longDescription ||
    "لا توجد معلومات إضافية عن هذا الأمر";

  const usage =
    config.guide?.en
      ?.replace(/\{p[n]?\}/g, prefix) ||
    info.usage ||
    `${prefix}${cmdName}`;

  const role =
    info.role ||
    (
      config.role === 3
        ? "👑 Owner"
        : config.role === 2
          ? "🔑 Admin"
          : "👤 User"
    );

  const cat =
    info.cat ||
    config.category ||
    "عام";

  const aliases =
    (config.aliases || [])
      .filter(Boolean);

  let icon = "◆";

  outer:
  for (const c of CATEGORIES) {
    for (const cm of c.cmds) {
      if (
        cm.name === cmdName ||
        cm.name === name
      ) {
        icon = cm.icon;
        break outer;
      }
    }
  }

  const lines = [];

  lines.push(LINE);
  lines.push(
    `  ${icon}  S A I Y A N  •  ${prefix}${cmdName.toUpperCase()}`
  );
  lines.push(LINE);
  lines.push("");

  lines.push("  📖 الوصف:");
  lines.push(`     ${desc}`);
  lines.push("");

  lines.push("  🧭 طريقة الاستخدام:");

  for (const l of String(usage).split("\n")) {
    lines.push(`     ${l}`);
  }

  lines.push("");

  lines.push(`  🗂️ الفئة      : ${cat}`);
  lines.push(`  🔐 الصلاحية   : ${role}`);

  if (aliases.length) {
    lines.push(
      `  🔁 الاختصارات : ${aliases.join("، ")}`
    );
  }

  lines.push("");
  lines.push("  👑 المطور: Magnus");
  lines.push("  🤖 النظام: Saiyan");
  lines.push("");
  lines.push(LINE);

  return lines.join("\n");
}

module.exports = {
  config: {
    name: "help",

    aliases: [
      "h",
      "مساعدة",
      "أوامر",
      "commands",
    ],

    version: "5.0",

    author: "Magnus",

    countDown: 3,

    role: 0,

    category: "info",

    description:
      "دليل أوامر Saiyan الكامل",

    guide: {
      en:
        "{pn} — عرض جميع الأوامر\n" +
        "{pn} [اسم الأمر] — عرض تفاصيل أمر محدد",
    },
  },

  onStart: async function ({
    args,
    message,
    prefix,
  }) {
    if (args[0]) {
      return message.reply(
        buildHelpOne(
          args[0],
          prefix
        )
      );
    }

    return message.reply(
      buildHelpAll(prefix)
    );
  },
};
