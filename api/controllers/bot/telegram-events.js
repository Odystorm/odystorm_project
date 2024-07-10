module.exports = {
  friendlyName: 'Telegram events',

  description: '',

  inputs: {},

  exits: {},

  fn: async function () {
    const { req } = this
    const update = req.body
    sails.log.info('Received Update From Bot 🤖', update)

    const botCommandList = ['/start', 'new-user']

    function isValidCommand(command, botCommandList) {
      for (var i = 0; i < botCommandList.length; i++) {
        if (command.includes(botCommandList[i])) {
          return true
        }
      }

      return false
    }

    function commandParser() {
      if (update.message.write_access_allowed) {
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
              text: 'Launch Odysir',
              web_app: {
                url: `https://gt35m9bz-1337.euw.devtunnels.ms/play?user=${chat.id}`,
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
      await sails.helpers.sendMessageCustom(
        chat.id,
        `Hello @${chat.username} 😁!\nPlay now and earn valuable OdyStorm tokens! 💲\n\n\nInvite your friends, family, and colleagues to join the adventure! The more, the merrier—and the more $ODY you'll earn!`,
        inlineKeyboard
      )

      return
    }
  },
}
