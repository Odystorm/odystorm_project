import { getHours } from 'date-fns'

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

export function isMorning(date) {
  const hours = getHours(date)
  return hours >= 6 && hours < 12
}

export function isAfternoon(date) {
  const hours = getHours(date)
  return hours >= 12 && hours < 18
}

export function isEvening(date) {
  const hours = getHours(date)
  return hours >= 18 && hours < 24
}

export function getRankingOfficerTitle(farmLevel) {
  const titles = [
    "Cadet",
    "Ensign",
    "Lieutenant Junior Grade",
    "Lieutenant",
    "Lieutenant Commander",
    "Commander",
    "Captain",
    "Commodore",
    "Rear Admiral",
    "Vice Admiral",
    "Admiral",
    "Fleet Admiral",
    "Chief of Operations",
    "Supreme Commander",
    "Galaxy Overlord",
    "Master of the Universe"
  ];

  // Ensure the farm level is within the valid range
  if (farmLevel < 1 || farmLevel > titles.length) {
    throw new Error("Invalid farm level number. It should be between 1 and 16.");
  }

  return titles[farmLevel - 1];
}
