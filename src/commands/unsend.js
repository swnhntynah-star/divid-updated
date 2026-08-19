/**
 * DAVID V1 — /unsend
 * حذف رسالة البوت عن طريق الرد عليها
 *
 * الاستخدام:
 * !unsend
 *
 * Developer: Magnus
 */

"use strict";

module.exports = {
  config: {
    name: "unsend",
    aliases: ["حذف", "مسح"],
    version: "1.0",
    author: "Magnus",
    countDown: 2,
    role: 0,
    category: "utility",

    description:
      "حذف رسالة البوت عن طريق الرد عليها",

    guide: {
      en:
        "{pn} — قم بالرد على رسالة البوت"
    }
  },

  onStart: async function ({
    api,
    event,
    message
  }) {

    // ── يجب أن يكون الأمر رداً على رسالة ─────────────
    if (!event.messageReply) {
      return message.reply(
        "⚠️ قم بالرد على رسالة البوت أولاً ثم اكتب:\n\n" +
        "unsend"
      );
    }

    const repliedMessage =
      event.messageReply;

    // ── التأكد من وجود Message ID ────────────────────
    if (!repliedMessage.messageID) {
      return message.reply(
        "❌ لم أستطع تحديد الرسالة."
      );
    }

    // ── ID البوت الحالي ───────────────────────────────
    const botID =
      api.getCurrentUserID();

    // ── السماح بحذف رسائل البوت فقط ──────────────────
    if (
      repliedMessage.senderID &&
      repliedMessage.senderID !== botID
    ) {
      return message.reply(
        "❌ لا يمكنك حذف رسائل الأعضاء.\n" +
        "يمكنني حذف رسائل البوت فقط."
      );
    }

    try {

      // ── حذف الرسالة المردود عليها ─────────────────
      await api.unsendMessage(
        repliedMessage.messageID
      );

      // ── حذف أمر unsend نفسه ───────────────────────
      try {
        await api.unsendMessage(
          event.messageID
        );
      } catch (_) {}

    } catch (error) {

      console.error(
        "[DAVID UNSEND ERROR]",
        error
      );

      return message.reply(
        "❌ تعذر حذف الرسالة.\n" +
        "ربما الرسالة قديمة أو لم يعد بالإمكان حذفها."
      );
    }
  }
};
