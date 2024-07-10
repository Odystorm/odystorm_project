const axios = require('axios')

module.exports = {
  friendlyName: 'Get profile photo',

  description: '',

  inputs: {
    userId: {
      type: 'string',
      description: 'Telegram Chat ID',
    },
  },

  exits: {
    success: {
      outputFriendlyName: 'Profile photo',
    },
  },

  fn: async function ({ userId }) {
    const TOKEN = process.env.TELEGRAM_BOT_TOKEN
    try {
      // Step 1: Get User Profile Photos
      const photosResponse = await axios.get(
        `https://api.telegram.org/bot${TOKEN}/getUserProfilePhotos`,
        {
          params: {
            user_id: userId,
          },
        }
      )

      if (photosResponse.data.result.total_count === 0) {
        return null
      }
      
      if (
        photosResponse.data.ok &&
        photosResponse.data.result.total_count > 0
      ) {
        const fileId = photosResponse.data.result.photos[0][0].file_id

        // Step 2: Get File Information
        const fileResponse = await axios.get(
          `https://api.telegram.org/bot${TOKEN}/getFile`,
          {
            params: {
              file_id: fileId,
            },
          }
        )

        if (fileResponse.data.ok) {
          const filePath = fileResponse.data.result.file_path

          // Step 3: Construct the Download URL
          const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`

          return fileUrl
        }
      }
    } catch (error) {
      sails.log.error(error)
      return ""
    }
  },
}
