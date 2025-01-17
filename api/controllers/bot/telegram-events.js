module.exports = {
  friendlyName: 'Telegram events',

  description: '',

  inputs: {},

  exits: {},

  fn: async function () {
    const { req } = this
    const update = req.body
    sails.log.info('Received Update From Bot 🤖', update)

    const botBaseURL = sails.config.custom.botBaseURL

    const botCommandList = [
      '/start',
      'new-user',
      'socials',
      'join-community',
      'new-user-web-app',
      'referrallink',
    ]

    function isValidCommand(command, botCommandList) {
      try {
        for (var i = 0; i < botCommandList.length; i++) {
          if (command.includes(botCommandList[i])) {
            return true
          }
        }

        return false
      } catch (error) {
        sails.log.error(error)
      }
    }

    function commandParser() {
      if (update.message) {
        return {
          type: 'private',
          command: update.message.text,
          chat: {
            id: update.message.chat.id,
            firstName: update.message.chat.first_name,
            lastName: update.message.chat?.last_name,
            username: update.message.chat.username,
          },
        }
      }

      if (update.callback_query) {
        sails.log.info(update.callback_query)
        return {
          type: 'button_click',
          command: update.callback_query.data,
          chat: {
            id: update.callback_query.message.chat.id,
            firstName: update.callback_query.from.first_name,
            username: update.callback_query.from.username,
          },
          data: update.callback_query.data,
        }
      }

      if (update.my_chat_member) {
        return {
          type: 'event',
          command: 'unknown',
          chat: {
            id: update.my_chat_member.chat.id,
            firstName: update.my_chat_member.chat.first_name,
            username: update?.my_chat_member?.chat?.username,
          },
        }
      }

      if (update.edited_message) {
        return {
          type: 'private',
          command: update.edited_message.text,
          chat: {
            id: update.edited_message.chat.id,
            firstName: update.edited_message.chat.first_name,
            username: update.edited_message.chat.username,
          },
        }
      }

      if (update.message && update.message.write_access_allowed) {
        return {
          type: 'private',
          command: 'new-user',
          chat: {
            id: update.message.chat.id,
            firstName: update.message.chat.first_name,
            lastName: update.message.chat?.last_name,
            username: update.message.chat.username,
          },
        }
      }

      if (
        update.message &&
        update.message.write_access_allowed.web_app_name === 'app'
      ) {
        return {
          type: 'private',
          command: 'new-user',
          chat: {
            id: update.message.chat.id,
            firstName: update.message.chat.first_name,
            lastName: update.message.chat?.last_name,
            username: update.message.chat.username,
          },
        }
      }

      if (update.message && update.message.web_app_data) {
        return {
          type: 'private',
          command: 'new-user-web-app',
          chat: {
            id: update.message.chat.id,
            firstName: update.message.chat.first_name,
            lastName: update.message.chat?.last_name,
            username: update.message.chat.username,
          },
        }
      }

      return {
        type: 'unspecified',
        command: 'unknown',
        chat: {
          id: update.message.chat.id,
          firstName: update.message.chat.first_name,
          username: update?.message?.chat?.username,
        },
      }
    }

    const { type, command, chat } = commandParser()

    const isValid = isValidCommand(command, botCommandList)

    if (type === 'event') {
      sails.log.info('An event just occured...', update)
      return
    }

    if (type === 'unspecified') {
      sails.log.error(
        'An Unspecified Action was attempted with this bot',
        update
      )

      return
    }

    if (!isValid) {
      await sails.helpers.sendMessage(
        chat.id,
        `Ah Sorry! 😥 I can't seem to make sense of that... Could you try /help to get a list of commands?\nAlso make sure the command is in lowercase
          `
      )

      return
    }

    if (type === 'private' && command.includes('start')) {
      try {
        const userRecord = await User.findOne({ chatId: chat.id })

        let isUnique = false
        let referralId

        while (!isUnique) {
          referralId = await sails.helpers.genReferralCode()
          const existingUser = await User.findOne({ referralId })
          if (!existingUser) {
            isUnique = true
          }
        }

        if (!userRecord) {
          const profilePicture = await sails.helpers.getProfilePhoto(chat.id)

          const userRecord = await User.create({
            firstName: chat.firstName,
            lastName: chat.lastName,
            username: chat.username,
            chatId: chat.id,
            referralId,
            profilePicture,
          }).fetch()

          const owner = userRecord.id
          await Wallet.create({ owner })
          const activity = await Activity.create({ owner }).fetch()
          await sails.helpers.generateBotTasks(owner)
          await Day.create({ activity: activity.id })
        }
      } catch (error) {
        sails.log.error(error)
      }

      const inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: 'Launch OdyStorm',
              web_app: {
                url: `${botBaseURL}/play?user=${chat.id}`,
              },
            },
          ],
          [
            {
              text: 'Join Community',
              callback_data: `join-community`,
            },
          ],
        ],
      }
      // Send Message to New User
      await sails.helpers.sendMessageCustom(
        chat.id,
        `🌌 Welcome to OdyStorm @${chat.username}! 🌌\n\nGreetings, Space Defender! 🚀\nWe’re excited to have you join us. Here’s how to get started:\n\nExplore Missions: Complete tasks to earn $ODY tokens and upgrade your spaceship.💲\n\n\nInvite your friends, family, and colleagues to join the adventure! The more, the merrier—and the more $ODY you'll earn!\nStay Updated: Check out our community for tips and events.\n\nNeed help? Our community is here for you!\n\nWelcome aboard and happy defending! 🌠\nThe OdyStorm Team
          `,
        inlineKeyboard
      )

      return
    }

    if (type === 'button_click' && command.includes('join-community')) {
      const inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: 'OdyStorm on Telegram',
              url: 'https://t.me/odystormofficial',
            },
          ],
          [
            {
              text: 'OdyStorm on X',
              url: `https://x.com/odystorm`,
            },
          ],
          [
            {
              text: 'OdyStorm on YouTube',
              url: `https://www.youtube.com/@odystormofficial`,
            },
          ],
          [
            {
              text: 'OdyStorm on Tik Tok',
              url: 'https://www.tiktok.com/@odystormofficial',
            },
          ],
          [
            {
              text: 'Launch OdyStorm',
              web_app: {
                url: `${botBaseURL}/play?user=${chat.id}`,
              },
            },
          ],
        ],
      }

      await sails.helpers.sendMessageCustom(
        chat.id,
        `Join our Socials so you do not miss any important news or updates.`,
        inlineKeyboard
      )

      return
    }

    if (type === 'private' && command.includes('socials')) {
      const inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: 'OdyStorm on Telegram',
              url: 'https://t.me/odystormofficial',
            },
          ],
          [
            {
              text: 'OdyStorm on X',
              url: `https://x.com/odystorm`,
            },
          ],
          [
            {
              text: 'OdyStorm on YouTube',
              url: `https://www.youtube.com/@odystormofficial`,
            },
          ],
          [
            {
              text: 'OdyStorm on Tik Tok',
              url: 'https://www.tiktok.com/@odystormofficial',
            },
          ],
          [
            {
              text: 'Launch OdyStorm',
              web_app: {
                url: `${botBaseURL}/play?user=${chat.id}`,
              },
            },
          ],
        ],
      }

      await sails.helpers.sendMessageCustom(
        chat.id,
        `Join our Socials so you do not miss any important news or updates.`,
        inlineKeyboard
      )

      return
    }

    if (type === 'private' && command.includes('referrallink')) {
      // Find User
      const user = await User.findOne({ chatId: chat.id })
      const inlineKeyboard = [
        [
          {
            text: 'Launch OdyStorm',
            web_app: {
              url: `${botBaseURL}/play?user=${chat.id}`,
            },
          },
        ],
      ]

      if (!user) {
        await sails.helpers.sendMessageCustom(
          chat.id,
          `You aren't yet enlisted at the OdyStorm Defense\nClick /start to get started`,
          inlineKeyboard
        )

        return
      }

      const referralLink = `https://t.me/odystorm_bot/app?startapp=ref_${user.referralId}`

      await sails.helpers.sendMessageCustom(
        chat.id,
        `Hello ${user.firstName}\nYour Referral Link is ${referralLink}\n\nInvite your friends, family, and colleagues to join the adventure! The more, the merrier—and the more $ODY you'll earn!`
      )

      return
    }
  },
}
