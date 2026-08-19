/**
 * SAIYAN — /chats
 * إدارة الغروبات والمحادثات وطلبات المراسلة
 *
 * Copyright © 2026 Magnus
 *
 * Features:
 * - عرض الغروبات
 * - عرض طلبات المراسلة
 * - عرض Other / Spam
 * - قبول المحادثات
 * - إرسال "اهلاً" بعد القبول
 * - قبول مباشر بواسطة Thread ID
 * - إحصائيات المحادثات
 * - DM Lock
 * - التحكم عن بعد في Angel / NM / Nick
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");

const ctrl = require("../utils/cmdControl");

const DM_DATA = path.join(
  process.cwd(),
  "database/data/dmLock.json"
);

// ======================================================
// الأوامر التي يمكن التحكم بها عن بعد
// ======================================================

const MANAGED_COMMANDS = [
  {
    name: "angel",
    label: "Angel — الرسائل التلقائية"
  },
  {
    name: "nm",
    label: "NM — قفل اسم الغروب"
  },
  {
    name: "nick",
    label: "Nick — قفل كنيات الأعضاء"
  }
];

const MANAGED_COMMAND_NAMES = new Set(
  MANAGED_COMMANDS.map(command => command.name)
);

// ======================================================
// التحقق من الأدمن
// ======================================================

function isAdmin(id) {
  const admins =
    global.GoatBot?.config?.adminBot || [];

  return admins
    .map(String)
    .includes(String(id));
}

// ======================================================
// DM LOCK
// ======================================================

function getDmLocked() {
  if (
    global.GoatBot?.dmLocked !== undefined
  ) {
    return !!global.GoatBot.dmLocked;
  }

  try {
    if (fs.existsSync(DM_DATA)) {
      const data = JSON.parse(
        fs.readFileSync(
          DM_DATA,
          "utf8"
        )
      );

      global.GoatBot.dmLocked =
        !!data.locked;

      return global.GoatBot.dmLocked;
    }
  } catch (_) {}

  return false;
}

function setDmLocked(value) {
  if (!global.GoatBot) {
    global.GoatBot = {};
  }

  global.GoatBot.dmLocked = !!value;

  try {
    fs.ensureDirSync(
      path.dirname(DM_DATA)
    );

    fs.writeFileSync(
      DM_DATA,
      JSON.stringify(
        {
          locked: !!value
        },
        null,
        2
      )
    );
  } catch (_) {}
}

// ======================================================
// SEND WRAPPER
// ======================================================

function send(
  api,
  body,
  threadID,
  callback
) {
  return new Promise(resolve => {
    let settled = false;

    const finish = (
      error,
      info
    ) => {
      if (settled) return;

      settled = true;

      if (callback) {
        try {
          callback(
            error,
            info
          );
        } catch (_) {}
      }

      resolve(info);
    };

    try {
      const result =
        api.sendMessage(
          body,
          threadID,
          finish
        );

      if (
        result &&
        typeof result.then ===
          "function"
      ) {
        result
          .then(info =>
            finish(null, info)
          )
          .catch(error =>
            finish(error)
          );
      }
    } catch (error) {
      finish(error);
    }
  });
}

// ======================================================
// GET THREAD LIST
// ======================================================

function getThreadList(
  api,
  limit,
  cursor,
  tags
) {
  return new Promise(resolve => {
    let settled = false;

    const finish = (
      error,
      data
    ) => {
      if (settled) return;

      settled = true;

      if (error) {
        return resolve([]);
      }

      if (Array.isArray(data)) {
        return resolve(data);
      }

      if (
        Array.isArray(data?.data)
      ) {
        return resolve(data.data);
      }

      resolve([]);
    };

    try {
      const result =
        api.getThreadList(
          limit,
          cursor,
          tags,
          finish
        );

      if (
        result &&
        typeof result.then ===
          "function"
      ) {
        result
          .then(data =>
            finish(null, data)
          )
          .catch(error =>
            finish(error)
          );
      } else if (
        Array.isArray(result)
      ) {
        finish(
          null,
          result
        );
      }
    } catch (error) {
      finish(error);
    }
  });
}

// ======================================================
// إزالة التكرار
// ======================================================

function uniqueThreads(list) {
  const seen = new Set();

  return list.filter(thread => {
    const id =
      String(
        thread?.threadID || ""
      );

    if (!id) {
      return false;
    }

    if (seen.has(id)) {
      return false;
    }

    seen.add(id);

    return true;
  });
}

// ======================================================
// جلب جميع الغروبات
// ======================================================

async function getAllGroups(api) {
  const groups = [];

  let cursor = null;

  for (
    let page = 0;
    page < 10;
    page++
  ) {
    const batch =
      await getThreadList(
        api,
        50,
        cursor,
        ["INBOX"]
      );

    if (!batch.length) {
      break;
    }

    for (const thread of batch) {
      if (
        thread?.isGroup &&
        thread?.threadID
      ) {
        groups.push(thread);
      }
    }

    if (batch.length < 50) {
      break;
    }

    const last =
      batch[
        batch.length - 1
      ];

    cursor =
      last?.timestamp ||
      null;

    if (!cursor) {
      break;
    }
  }

  return uniqueThreads(groups);
}

// ======================================================
// جلب طلبات المراسلة
// ======================================================

async function getAllMessageRequests(api) {
  const requests = [];

  let cursor = null;

  for (
    let page = 0;
    page < 10;
    page++
  ) {
    const batch =
      await getThreadList(
        api,
        50,
        cursor,
        ["PENDING"]
      );

    if (!batch.length) {
      break;
    }

    for (const thread of batch) {
      if (thread?.threadID) {
        requests.push(thread);
      }
    }

    if (batch.length < 50) {
      break;
    }

    const last =
      batch[
        batch.length - 1
      ];

    cursor =
      last?.timestamp ||
      null;

    if (!cursor) {
      break;
    }
  }

  return uniqueThreads(requests);
}

// ======================================================
// جلب Other
// ======================================================

async function getAllOtherMessages(api) {
  const messages = [];

  let cursor = null;

  for (
    let page = 0;
    page < 10;
    page++
  ) {
    const batch =
      await getThreadList(
        api,
        50,
        cursor,
        ["OTHER"]
      );

    if (!batch.length) {
      break;
    }

    for (const thread of batch) {
      if (thread?.threadID) {
        messages.push(thread);
      }
    }

    if (batch.length < 50) {
      break;
    }

    const last =
      batch[
        batch.length - 1
      ];

    cursor =
      last?.timestamp ||
      null;

    if (!cursor) {
      break;
    }
  }

  return uniqueThreads(messages);
}

// ======================================================
// أسماء المحادثات
// ======================================================

function groupName(group) {
  return (
    group?.name ||
    group?.threadName ||
    `غروب ${group?.threadID || "غير معروف"}`
  );
}

function requestName(request) {
  return (
    request?.name ||
    request?.threadName ||
    request?.senderName ||
    request?.snippet ||
    `مستخدم ${request?.threadID || "غير معروف"}`
  );
}

function otherMessageName(thread) {
  return (
    thread?.name ||
    thread?.threadName ||
    thread?.senderName ||
    thread?.snippet ||
    `مستخدم ${thread?.threadID || "غير معروف"}`
  );
}

// ======================================================
// حالة الأوامر
// ======================================================

function commandStatus(
  threadID,
  command
) {
  try {
    return ctrl.isEnabled(
      String(threadID),
      command
    )
      ? "🟢 مفعل"
      : "⚫ معطل";
  } catch (_) {
    return "⚫ معطل";
  }
}

// ======================================================
// REPLY SYSTEM
// ======================================================

function registerReply(
  api,
  event,
  state,
  callback
) {
  if (
    !state?.messageID ||
    !global.GoatBot?.onReply
  ) {
    return;
  }

  const key =
    `chats_${state.messageID}`;

  global.GoatBot.onReply.set(
    key,
    {
      messageID:
        state.messageID,

      author:
        String(
          event.senderID
        ),

      ts:
        Date.now(),

      callback:
        async ({
          api: replyApi,
          event: replyEvent,
          message
        }) => {
          if (
            String(
              replyEvent.senderID
            ) !==
            String(
              event.senderID
            )
          ) {
            return;
          }

          await callback({
            api: replyApi,
            event: replyEvent,
            message,
            state,
            input:
              String(
                replyEvent.body ||
                  ""
              ).trim()
          });
        }
    }
  );
}

// ======================================================
// SEND REPLY MENU
// ======================================================

async function sendReplyMenu(
  api,
  event,
  body,
  state,
  callback
) {
  await send(
    api,
    body,
    event.threadID,
    (
      error,
      info
    ) => {
      if (
        error ||
        !info?.messageID
      ) {
        return;
      }

      registerReply(
        api,
        event,
        {
          ...state,
          messageID:
            info.messageID
        },
        callback
      );
    }
  );
}

// ======================================================
// قبول المحادثة
// ======================================================

async function acceptConversation(
  api,
  threadID
) {
  const tid =
    String(threadID || "")
      .trim();

  let accepted = false;
  let acceptError = null;

  // ----------------------------------------------------
  // محاولة قبول طلب المراسلة
  // ----------------------------------------------------

  try {
    if (
      typeof api.handleMessageRequest ===
      "function"
    ) {
      await new Promise(resolve => {
        let done = false;

        const finish = error => {
          if (done) return;

          done = true;

          if (error) {
            acceptError = error;
          } else {
            accepted = true;
          }

          resolve();
        };

        try {
          const result =
            api.handleMessageRequest(
              tid,
              true,
              finish
            );

          if (
            result &&
            typeof result.then ===
              "function"
          ) {
            result
              .then(() =>
                finish(null)
              )
              .catch(error =>
                finish(error)
              );
          }
        } catch (error) {
          finish(error);
        }
      });
    }
  } catch (error) {
    acceptError = error;
  }

  // ----------------------------------------------------
  // إرسال الترحيب
  // ----------------------------------------------------

  let helloSent = false;
  let helloError = null;

  try {
    await new Promise(resolve => {
      let done = false;

      const finish = error => {
        if (done) return;

        done = true;

        if (error) {
          helloError = error;
        } else {
          helloSent = true;
        }

        resolve();
      };

      try {
        const result =
          api.sendMessage(
            "اهلاً",
            tid,
            finish
          );

        if (
          result &&
          typeof result.then ===
            "function"
        ) {
          result
            .then(() =>
              finish(null)
            )
            .catch(error =>
              finish(error)
            );
        }
      } catch (error) {
        finish(error);
      }
    });
  } catch (error) {
    helloError = error;
  }

  return {
    accepted,
    acceptError,
    helloSent,
    helloError
  };
}

// ======================================================
// القائمة الرئيسية
// ======================================================

function buildMainMenu() {
  return [
    "╭━━━〔 🗂️ SAIYAN CHATS 〕━━━╮",
    "",
    "  👥 1 — الغروبات",
    "  📩 2 — طلبات المراسلة",
    "  🚨 3 — Other / غير مهم",
    "  📊 4 — الإحصائيات",
    "  🔒 5 — حالة DM Lock",
    "",
    "╰━━━━━━━━━━━━━━━━━━━━━━╯",
    "↩️ أرسل رقم الخيار"
  ].join("\n");
}

// ======================================================
// قائمة الغروبات
// ======================================================

function buildGroupList(groups) {
  let body =
    `╭━━〔 👥 الغروبات • ${groups.length} 〕━━╮\n\n`;

  groups
    .slice(0, 30)
    .forEach(
      (group, index) => {
        body +=
          `${index + 1}. ${groupName(group)}\n` +
          `   🆔 ${group.threadID}\n\n`;
      }
    );

  body +=
    "╰━━━━━━━━━━━━━━━━━━━━━━╯\n" +
    "📌 اختر رقم الغروب لإدارته\n" +
    "0️⃣ العودة";

  return body;
}

// ======================================================
// قائمة طلبات المراسلة
// ======================================================

function buildMessageRequestList(requests) {
  let body =
    `╭━━〔 📩 طلبات المراسلة • ${requests.length} 〕━━╮\n\n`;

  requests
    .slice(0, 30)
    .forEach(
      (request, index) => {
        body +=
          `${index + 1}. ${requestName(request)}\n` +
          `   🆔 ${request.threadID}\n`;

        if (request.snippet) {
          body +=
            `   💬 ${String(request.snippet).slice(0, 100)}\n`;
        }

        body += "\n";
      }
    );

  body +=
    "╰━━━━━━━━━━━━━━━━━━━━━━╯\n" +
    "📌 اختر رقم الطلب\n" +
    "0️⃣ العودة";

  return body;
}

// ======================================================
// قائمة Other
// ======================================================

function buildOtherMessageList(messages) {
  let body =
    `╭━━〔 🚨 Other • ${messages.length} 〕━━╮\n\n`;

  messages
    .slice(0, 30)
    .forEach(
      (thread, index) => {
        body +=
          `${index + 1}. ${otherMessageName(thread)}\n` +
          `   🆔 ${thread.threadID}\n`;

        if (thread.snippet) {
          body +=
            `   💬 ${String(thread.snippet).slice(0, 100)}\n`;
        }

        body += "\n";
      }
    );

  body +=
    "╰━━━━━━━━━━━━━━━━━━━━━━╯\n" +
    "📌 اختر رقم المحادثة\n" +
    "0️⃣ العودة";

  return body;
}

// ======================================================
// تفاصيل الطلب
// ======================================================

function buildMessageRequestDetails(request) {
  return [
    "╭━━〔 📩 طلب مراسلة 〕━━╮",
    "",
    `👤 الاسم: ${requestName(request)}`,
    `🆔 Thread ID: ${request.threadID}`,
    request.snippet
      ? `💬 الرسالة: ${String(request.snippet).slice(0, 300)}`
      : null,
    "",
    "╰━━━━━━━━━━━━━━━━━━━━━━╯",
    "1️⃣ ✅ قبول وإرسال اهلاً",
    "0️⃣ ↩️ العودة"
  ]
    .filter(Boolean)
    .join("\n");
}

// ======================================================
// تفاصيل Other
// ======================================================

function buildOtherMessageDetails(thread) {
  return [
    "╭━━〔 🚨 محادثة Other 〕━━╮",
    "",
    `👤 الاسم: ${otherMessageName(thread)}`,
    `🆔 Thread ID: ${thread.threadID}`,
    thread.snippet
      ? `💬 الرسالة: ${String(thread.snippet).slice(0, 300)}`
      : null,
    "",
    "╰━━━━━━━━━━━━━━━━━━━━━━╯",
    "1️⃣ ✅ قبول وإرسال اهلاً",
    "0️⃣ ↩️ العودة"
  ]
    .filter(Boolean)
    .join("\n");
}

// ======================================================
// أفعال الغروب
// ======================================================

function buildGroupActions(group) {
  const tid =
    String(group.threadID);

  let body =
    `╭━━〔 👥 ${groupName(group)} 〕━━╮\n` +
    `🆔 ${tid}\n\n`;

  MANAGED_COMMANDS.forEach(
    (command, index) => {
      body +=
        `${index + 1}. ${command.label}\n` +
        `   /${command.name} — ${commandStatus(
          tid,
          command.name
        )}\n\n`;
    }
  );

  body +=
    "╰━━━━━━━━━━━━━━━━━━━━━━╯\n" +
    "↩️ أرسل رقم الأمر لتبديل حالته\n" +
    "0️⃣ العودة";

  return body;
}

// ======================================================
// Prompt للأوامر
// ======================================================

function buildCommandPrompt(group) {
  return [
    `╭━━〔 ⚙️ ${groupName(group)} 〕━━╮`,
    `🆔 ${group.threadID}`,
    "",
    "أرسل الآن الأمر الذي تريد تشغيله في هذا الغروب:",
    "",
    "مثال:",
    "• /angel مرحبا 60 80",
    "• /nm اسم الغروب 5 15",
    "• /nick الاسم",
    "",
    "0️⃣ إلغاء"
  ].join("\n");
}

// ======================================================
// Parse Managed Command
// ======================================================

function parseManagedCommand(input) {
  const prefix =
    global.GoatBot?.config?.prefix ||
    "/";

  const raw =
    String(input || "")
      .trim();

  if (
    !raw.startsWith(prefix)
  ) {
    return null;
  }

  const parts =
    raw
      .slice(prefix.length)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const name =
    String(
      parts.shift() || ""
    ).toLowerCase();

  if (
    !MANAGED_COMMAND_NAMES.has(name)
  ) {
    return null;
  }

  const commands =
    global.GoatBot?.commands;

  const command =
    commands?.get(name);

  if (
    !command?.onStart
  ) {
    return null;
  }

  return {
    name,
    args: parts,
    command
  };
}

// ======================================================
// Remote Message
// ======================================================

function buildRemoteMessage(
  api,
  targetEvent
) {
  return {
    reply: (
      body,
      callback
    ) =>
      send(
        api,
        body,
        targetEvent.threadID,
        callback
      ),

    unsend: (
      messageID,
      callback
    ) => {
      try {
        return api.unsendMessage(
          messageID ||
            targetEvent.messageID,
          callback
        );
      } catch (_) {}
    },

    react: (
      emoji,
      messageID,
      callback
    ) => {
      try {
        return api.setMessageReaction(
          emoji,
          messageID ||
            targetEvent.messageID,
          callback ||
            (() => {}),
          true
        );
      } catch (_) {}
    },

    send: (
      body,
      threadID,
      callback
    ) =>
      send(
        api,
        body,
        threadID ||
          targetEvent.threadID,
        callback
      )
  };
}

// ======================================================
// تنفيذ أمر في غروب آخر
// ======================================================

async function executeRemoteCommand(
  api,
  sourceEvent,
  sourceMessage,
  group,
  input
) {
  const parsed =
    parseManagedCommand(input);

  if (!parsed) {
    return sourceMessage.reply(
      "❌ الأمر غير مدعوم.\n\n" +
      "الأوامر المتاحة:\n" +
      "/angel [رسالة] [min] [max]\n" +
      "/nm [اسم] [min] [max]\n" +
      "/nick [اسم]\n\n" +
      "أرسل 0 للإلغاء."
    );
  }

  const targetThreadID =
    String(group.threadID);

  try {
    ctrl.setCommandEnabled(
      targetThreadID,
      parsed.name,
      true
    );
  } catch (_) {}

  const targetEvent = {
    ...sourceEvent,

    type: "message",

    messageID:
      `chats_remote_${Date.now()}`,

    threadID:
      targetThreadID,

    isGroup: true,

    body:
      String(input).trim()
  };

  try {
    await parsed.command.onStart({
      api,

      event:
        targetEvent,

      args:
        parsed.args,

      commandName:
        parsed.name,

      message:
        buildRemoteMessage(
          api,
          targetEvent
        ),

      prefix:
        global.GoatBot?.config?.prefix ||
        "/",

      role: 2,

      senderID:
        sourceEvent.senderID,

      threadID:
        targetThreadID
    });

    return sourceMessage.reply(
      `✅ تم تنفيذ /${parsed.name} في الغروب:\n` +
      `👥 ${groupName(group)}\n` +
      `🆔 ${targetThreadID}`
    );
  } catch (error) {
    global.log?.error?.(
      "CHATS_REMOTE",
      `فشل تنفيذ /${parsed.name}: ${
        error?.message || error
      }`
    );

    return sourceMessage.reply(
      `❌ تعذر تنفيذ /${parsed.name} في الغروب.\n\n` +
      `👥 ${groupName(group)}\n` +
      `⚠️ ${
        error?.message ||
        "حدث خطأ غير معروف."
      }`
    );
  }
}

// ======================================================
// التحكم بالغروب
// ======================================================

async function showGroupCommandPrompt(
  api,
  event,
  group
) {
  return sendReplyMenu(
    api,
    event,
    buildCommandPrompt(group),
    {
      step:
        "COMMAND_INPUT",

      group
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      state,
      input
    }) => {
      if (input === "0") {
        return message.reply(
          "✅ تم إلغاء التحكم بالغروب."
        );
      }

      return executeRemoteCommand(
        replyApi,
        replyEvent,
        message,
        state.group,
        input
      );
    }
  );
}

// ======================================================
// أفعال الغروب
// ======================================================

async function showGroupActions(
  api,
  event,
  group
) {
  return sendReplyMenu(
    api,
    event,
    buildGroupActions(group),
    {
      step:
        "GROUP_ACTION",

      group
    },

    async ({
      api: actionApi,
      event: actionEvent,
      message: actionMessage,
      state,
      input
    }) => {
      if (input === "0") {
        return showGroups(
          actionApi,
          actionEvent
        );
      }

      const index =
        Number.parseInt(
          input,
          10
        ) - 1;

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >=
          MANAGED_COMMANDS.length
      ) {
        return actionMessage.reply(
          `❌ اختر رقماً من 1 إلى ${
            MANAGED_COMMANDS.length
          } أو 0 للعودة.`
        );
      }

      const command =
        MANAGED_COMMANDS[index];

      let enabled;

      try {
        enabled =
          !ctrl.isEnabled(
            String(
              state.group.threadID
            ),
            command.name
          );

        ctrl.setCommandEnabled(
          String(
            state.group.threadID
          ),
          command.name,
          enabled
        );
      } catch (error) {
        return actionMessage.reply(
          `❌ تعذر تغيير حالة /${command.name}.\n` +
          `${error?.message || ""}`
        );
      }

      return showGroupActions(
        actionApi,
        actionEvent,
        state.group
      );
    }
  );
}

// ======================================================
// الغروبات
// ======================================================

async function showGroups(
  api,
  event
) {
  const groups =
    await getAllGroups(api);

  if (!groups.length) {
    return send(
      api,
      "📭 لم أجد أي غروبات حالياً.",
      event.threadID
    );
  }

  return sendReplyMenu(
    api,
    event,
    buildGroupList(groups),
    {
      step:
        "GROUP_LIST",

      groups
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      state,
      input
    }) => {
      if (input === "0") {
        return showMainMenu(
          replyApi,
          replyEvent
        );
      }

      const index =
        Number.parseInt(
          input,
          10
        ) - 1;

      const max =
        Math.min(
          state.groups.length,
          30
        );

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= max
      ) {
        return message.reply(
          `❌ رقم غير صحيح.\nاختر من 1 إلى ${max}.`
        );
      }

      const selected =
        state.groups[index];

      return showGroupActions(
        replyApi,
        replyEvent,
        selected
      );
    }
  );
}

// ======================================================
// طلبات المراسلة
// ======================================================

async function showMessageRequests(
  api,
  event
) {
  const requests =
    await getAllMessageRequests(api);

  if (!requests.length) {
    return sendReplyMenu(
      api,
      event,
      [
        "╭━━〔 📩 طلبات المراسلة 〕━━╮",
        "",
        "📭 لا توجد طلبات مراسلة حالياً.",
        "",
        "╰━━━━━━━━━━━━━━━━━━━━━━╯",
        "0️⃣ العودة"
      ].join("\n"),
      {
        step:
          "REQUESTS_EMPTY"
      },

      async ({
        api: replyApi,
        event: replyEvent,
        message,
        input
      }) => {
        if (input === "0") {
          return showMainMenu(
            replyApi,
            replyEvent
          );
        }

        return message.reply(
          "❌ أرسل 0 للعودة."
        );
      }
    );
  }

  return sendReplyMenu(
    api,
    event,
    buildMessageRequestList(requests),
    {
      step:
        "MESSAGE_REQUESTS",

      requests
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      state,
      input
    }) => {
      if (input === "0") {
        return showMainMenu(
          replyApi,
          replyEvent
        );
      }

      const index =
        Number.parseInt(
          input,
          10
        ) - 1;

      const max =
        Math.min(
          state.requests.length,
          30
        );

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= max
      ) {
        return message.reply(
          `❌ رقم غير صحيح.\nاختر من 1 إلى ${max}.`
        );
      }

      const selected =
        state.requests[index];

      return sendReplyMenu(
        replyApi,
        replyEvent,
        buildMessageRequestDetails(
          selected
        ),
        {
          step:
            "REQUEST_DETAILS",

          requests:
            state.requests,

          request:
            selected
        },

        async ({
          api: detailsApi,
          event: detailsEvent,
          message: detailsMessage,
          state: detailsState,
          input
        }) => {
          if (input === "0") {
            return showMessageRequests(
              detailsApi,
              detailsEvent
            );
          }

          const acceptedInput =
            input === "1" ||
            input.toLowerCase() ===
              "قبول" ||
            input.toLowerCase() ===
              "accept";

          if (acceptedInput) {
            const result =
              await acceptConversation(
                detailsApi,
                detailsState.request.threadID
              );

            if (result.helloSent) {
              return detailsMessage.reply(
                "╭━━〔 ✅ تم القبول 〕━━╮\n\n" +
                "📩 تم قبول المحادثة بنجاح.\n" +
                "👋 تم إرسال: اهلاً\n\n" +
                "╰━━━━━━━━━━━━━━━━━━━━━━╯"
              );
            }

            return detailsMessage.reply(
              "⚠️ تمت محاولة قبول المحادثة، " +
              "لكن تعذر إرسال «اهلاً».\n\n" +
              (
                result.helloError?.message ||
                result.acceptError?.message ||
                "تحقق من اتصال البوت."
              )
            );
          }

          return detailsMessage.reply(
            "❌ اختيار غير صحيح.\n\n" +
            "1️⃣ قبول\n" +
            "0️⃣ العودة"
          );
        }
      );
    }
  );
}

// ======================================================
// Other / Spam
// ======================================================

async function showOtherMessages(
  api,
  event
) {
  const messages =
    await getAllOtherMessages(api);

  if (!messages.length) {
    return sendReplyMenu(
      api,
      event,
      [
        "╭━━〔 🚨 Other 〕━━╮",
        "",
        "📭 لا توجد محادثات في Other حالياً.",
        "",
        "╰━━━━━━━━━━━━━━━━━━━━━━╯",
        "0️⃣ العودة"
      ].join("\n"),
      {
        step:
          "OTHER_EMPTY"
      },

      async ({
        api: replyApi,
        event: replyEvent,
        message,
        input
      }) => {
        if (input === "0") {
          return showMainMenu(
            replyApi,
            replyEvent
          );
        }

        return message.reply(
          "❌ أرسل 0 للعودة."
        );
      }
    );
  }

  return sendReplyMenu(
    api,
    event,
    buildOtherMessageList(messages),
    {
      step:
        "OTHER_MESSAGES",

      messages
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      state,
      input
    }) => {
      if (input === "0") {
        return showMainMenu(
          replyApi,
          replyEvent
        );
      }

      const index =
        Number.parseInt(
          input,
          10
        ) - 1;

      const max =
        Math.min(
          state.messages.length,
          30
        );

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= max
      ) {
        return message.reply(
          `❌ رقم غير صحيح.\nاختر من 1 إلى ${max}.`
        );
      }

      const selected =
        state.messages[index];

      return sendReplyMenu(
        replyApi,
        replyEvent,
        buildOtherMessageDetails(
          selected
        ),
        {
          step:
            "OTHER_DETAILS",

          messages:
            state.messages,

          selected
        },

        async ({
          api: detailsApi,
          event: detailsEvent,
          message: detailsMessage,
          state: detailsState,
          input
        }) => {
          if (input === "0") {
            return showOtherMessages(
              detailsApi,
              detailsEvent
            );
          }

          const acceptedInput =
            input === "1" ||
            input.toLowerCase() ===
              "قبول" ||
            input.toLowerCase() ===
              "accept";

          if (acceptedInput) {
            const result =
              await acceptConversation(
                detailsApi,
                detailsState.selected.threadID
              );

            if (result.helloSent) {
              return detailsMessage.reply(
                "╭━━〔 ✅ تم القبول 〕━━╮\n\n" +
                "📩 تم قبول المحادثة بنجاح.\n" +
                "👋 تم إرسال: اهلاً\n\n" +
                "╰━━━━━━━━━━━━━━━━━━━━━━╯"
              );
            }

            return detailsMessage.reply(
              "⚠️ تمت محاولة قبول المحادثة، " +
              "لكن تعذر إرسال «اهلاً».\n\n" +
              (
                result.helloError?.message ||
                result.acceptError?.message ||
                "تحقق من اتصال البوت."
              )
            );
          }

          return detailsMessage.reply(
            "❌ اختيار غير صحيح.\n\n" +
            "1️⃣ قبول\n" +
            "0️⃣ العودة"
          );
        }
      );
    }
  );
}

// ======================================================
// قبول مباشر بواسطة Thread ID
// ======================================================

async function acceptByThreadID(
  api,
  event,
  message,
  threadID
) {
  const tid =
    String(threadID || "")
      .trim();

  if (!tid) {
    return message.reply(
      "❌ يجب تحديد Thread ID.\n\n" +
      "مثال:\n" +
      "/chats accept 123456789"
    );
  }

  const result =
    await acceptConversation(
      api,
      tid
    );

  if (result.helloSent) {
    return message.reply(
      "╭━━〔 ✅ تم القبول 〕━━╮\n\n" +
      "📩 تم قبول المحادثة بنجاح.\n" +
      `🆔 ${tid}\n` +
      "👋 تم إرسال: اهلاً\n\n" +
      "╰━━━━━━━━━━━━━━━━━━━━━━╯"
    );
  }

  return message.reply(
    "⚠️ تمت محاولة قبول المحادثة، " +
    "لكن تعذر إرسال «اهلاً».\n\n" +
    (
      result.helloError?.message ||
      result.acceptError?.message ||
      "حدث خطأ غير معروف."
    )
  );
}

// ======================================================
// القائمة الرئيسية
// ======================================================

async function showMainMenu(
  api,
  event
) {
  return sendReplyMenu(
    api,
    event,
    buildMainMenu(),
    {
      step:
        "MAIN_MENU"
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      input
    }) => {
      if (input === "1") {
        return showGroups(
          replyApi,
          replyEvent
        );
      }

      if (input === "2") {
        return showMessageRequests(
          replyApi,
          replyEvent
        );
      }

      if (input === "3") {
        return showOtherMessages(
          replyApi,
          replyEvent
        );
      }

      if (input === "4") {
        return showChatCount(
          replyApi,
          replyEvent
        );
      }

      if (input === "5") {
        return message.reply(
          "╭━━〔 🔒 DM Lock 〕━━╮\n\n" +
          `الحالة: ${
            getDmLocked()
              ? "🟢 مفعل"
              : "⚫ معطل"
          }\n\n` +
          "استخدم:\n" +
          "/chats dm on\n" +
          "/chats dm off\n\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━╯"
        );
      }

      return message.reply(
        "❌ اختيار غير صحيح.\n" +
        "اختر رقماً من 1 إلى 5."
      );
    }
  );
}

// ======================================================
// الإحصائيات
// ======================================================

async function showChatCount(
  api,
  event
) {
  const inbox =
    await getThreadList(
      api,
      50,
      null,
      ["INBOX"]
    );

  const groups =
    inbox.filter(
      thread =>
        thread?.isGroup
    );

  const dms =
    inbox.filter(
      thread =>
        !thread?.isGroup
    );

  const requests =
    await getAllMessageRequests(
      api
    );

  const other =
    await getAllOtherMessages(
      api
    );

  const body =
    [
      "╭━━〔 📊 إحصائيات Saiyan 〕━━╮",
      "",
      `👥 الغروبات       : ${groups.length}`,
      `💬 الخاص          : ${dms.length}`,
      `📩 طلبات المراسلة : ${requests.length}`,
      `🚨 Other          : ${other.length}`,
      `🔒 DM Lock        : ${
        getDmLocked()
          ? "🟢 مفعل"
          : "⚫ معطل"
      }`,
      "",
      "╰━━━━━━━━━━━━━━━━━━━━━━╯",
      "0️⃣ العودة"
    ].join("\n");

  return sendReplyMenu(
    api,
    event,
    body,
    {
      step:
        "CHAT_COUNT"
    },

    async ({
      api: replyApi,
      event: replyEvent,
      message,
      input
    }) => {
      if (input === "0") {
        return showMainMenu(
          replyApi,
          replyEvent
        );
      }

      return message.reply(
        "❌ أرسل 0 للعودة."
      );
    }
  );
}

// ======================================================
// MODULE
// ======================================================

module.exports = {
  config: {
    name: "chats",

    aliases: [
      "محادثات",
      "chat",
      "غروبات"
    ],

    version: "5.0",

    author: "Magnus",

    countDown: 3,

    role: 2,

    category: "management",

    description:
      "إدارة الغروبات والمحادثات وطلبات المراسلة وOther",

    guide: {
      en:
        "{pn} — القائمة الرئيسية\n" +
        "{pn} groups — الغروبات\n" +
        "{pn} requests — طلبات المراسلة\n" +
        "{pn} other — Other\n" +
        "{pn} accept THREAD_ID — قبول محادثة\n" +
        "{pn} count — الإحصائيات\n" +
        "{pn} dm on/off — DM Lock"
    }
  },

  onStart:
    async function ({
      api,
      event,
      args,
      message
    }) {

      // ==================================================
      // حماية الأدمن
      // ==================================================

      if (
        !isAdmin(
          event.senderID
        )
      ) {
        return message.reply(
          "⛔ هذا الأمر مخصص للأدمن فقط."
        );
      }

      const sub =
        String(
          args[0] || ""
        ).toLowerCase();

      // ==================================================
      // DM LOCK
      // ==================================================

      if (sub === "dm") {
        const action =
          String(
            args[1] || ""
          ).toLowerCase();

        if (action === "on") {
          setDmLocked(true);

          return message.reply(
            "🔒 تم تفعيل DM Lock.\n" +
            "لن يرد البوت على الرسائل الخاصة."
          );
        }

        if (action === "off") {
          setDmLocked(false);

          return message.reply(
            "🔓 تم إلغاء DM Lock."
          );
        }

        return message.reply(
          `🔒 DM Lock: ${
            getDmLocked()
              ? "🟢 مفعل"
              : "⚫ معطل"
          }\n\n` +
          "استخدم:\n" +
          "/chats dm on\n" +
          "/chats dm off"
        );
      }

      // ==================================================
      // قبول مباشر
      // ==================================================

      if (
        sub === "accept" ||
        sub === "قبول"
      ) {
        return acceptByThreadID(
          api,
          event,
          message,
          args[1]
        );
      }

      // ==================================================
      // الإحصائيات
      // ==================================================

      if (sub === "count") {
        return showChatCount(
          api,
          event
        );
      }

      // ==================================================
      // طلبات المراسلة
      // ==================================================

      if (
        sub === "requests" ||
        sub === "pending" ||
        sub === "طلبات"
      ) {
        return showMessageRequests(
          api,
          event
        );
      }

      // ==================================================
      // Other
      // ==================================================

      if (
        sub === "other" ||
        sub === "spam" ||
        sub === "غيرمهم"
      ) {
        return showOtherMessages(
          api,
          event
        );
      }

      // ==================================================
      // الغروبات
      // ==================================================

      if (
        sub === "list" ||
        sub === "groups" ||
        sub === "غروبات"
      ) {
        return showGroups(
          api,
          event
        );
      }

      // ==================================================
      // القائمة الرئيسية
      // ==================================================

      if (!sub) {
        return showMainMenu(
          api,
          event
        );
      }

      // ==================================================
      // الاستخدام
      // ==================================================

      return message.reply(
        "╭━━〔 🗂️ SAIYAN CHATS 〕━━╮\n\n" +
        "/chats — القائمة الرئيسية\n" +
        "/chats groups — الغروبات\n" +
        "/chats requests — طلبات المراسلة\n" +
        "/chats other — Other\n" +
        "/chats accept [Thread ID]\n" +
        "/chats count — الإحصائيات\n" +
        "/chats dm on/off\n\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━╯"
      );
    },

  // ====================================================
  // Compatibility
  // ====================================================

  onReply:
    async function () {}
};
