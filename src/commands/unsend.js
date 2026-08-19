/**
 * DAVID V1 — /unsend
 * حذف رسالة البوت عن طريق الرد عليها
 *
 * الاستخدام:
 * !unsend
 *
 * يجب الرد على رسالة أرسلها البوت.
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
    description: "حذف رسالة البوت بالرد عليها",

    guide: {
      en: "{pn} — الرد على رسالة البوت"
    }
  },

  onStart: async function ({
    api,
    event,
    message
  }) {

    // ── التأكد من وجود رد ─────────────────────────────
    if (!event.messageReply) {
      return message.reply(
        "⚠️ لازم ترد على رسالة البوت أولاً."
      );
    }

    const reply = event.messageReply;

    // ── التأكد من وجود ID الرسالة ─────────────────────
    if (!reply.messageID) {
      return message.reply(
        "❌ لم أستطع تحديد الرسالة."
      );
    }

    // ── التأكد أن الرسالة من البوت ────────────────────
    const botID = api.getCurrentUserID();

    if (
      reply.senderID &&
      reply.senderID !== botID
    ) {
      return message.reply(
        "❌ هذه ليست رسالة أرسلها البوت."
      );
    }

    try {

      // حذف الرسالة المردود عليها
      await api.unsendMessage(
        reply.messageID
      );

      // حذف رسالة الأمر نفسها
      try {
        await api.unsendMessage(
          event.messageID
        );
      } catch (_) {}

    } catch (error) {

      console.error(
        "[UNSEND ERROR]",
        error
      );

      return message.reply(
        "❌ فشل حذف الرسالة."
      );
    }
  }
};
