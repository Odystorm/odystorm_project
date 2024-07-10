const axios = require("axios");

module.exports = {
  friendlyName: "Send Telegram Photo",

  description: "Send Photo Via Bot",

  inputs: {
    chatId: {
      type: "string",
      description: "User Chat ID",
    },
    photo: {
      type: "string",
      description: "Photo to Send",
    },
    caption: {
      type: "string",
      description: "Photo Caption",
    },
  },

  exits: {
    success: {
      description: "All done.",
    },
  },

  fn: async function ({ chatId, photo, caption }) {
    const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

    await axios
      .post(`${TELEGRAM_API}/sendPhoto`, {
        chat_id: chatId,
        photo: photo,
        caption: caption,
        protect_content: true,
      })
      .then((res) => {
        sails.log.info(res.data);
      })
      .catch((error) => {
        sails.log.info(error.data);
      });
  },
};
