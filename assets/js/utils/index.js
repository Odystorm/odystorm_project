export function generateRandomString(length) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export function getReferralCode() {
  // Get the current URL
  // @ts-ignore
  const urlParams = new URLSearchParams(window.location.search)

  // Extract the 'startapp' parameter value
  const startapp = urlParams.get('startapp')

  // Check if 'startapp' parameter exists and starts with 'ref_'
  if (startapp && startapp.startsWith('ref_')) {
    // Extract and return the referral code
    return startapp.slice(4) // Remove the 'ref_' prefix
  } else {
    // Return null if 'startapp' parameter is not found or does not start with 'ref_'
    return null
  }
}