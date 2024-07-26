// @ts-nocheck
import axios from 'axios'
import { useEffect, useState } from 'react'
import Countdown from '@/components/Timer'
import { toast } from 'react-toastify'
import { Puff } from 'react-loader-spinner'
import { motion, AnimatePresence } from 'framer-motion'
import { farmUpgrades } from '@/data/sample'
import { nanoid } from 'nanoid'
import { addHours } from 'date-fns'
import { isMorning, isAfternoon, isEvening } from '@/utils'
import { getRankingOfficerTitle } from '@/utils'

export function FarmComplete({ amountFarmed, claimToken, isClaimLoading }) {
  return (
    <motion.div
      className="absolute left-0 top-0 z-50 flex h-screen w-full flex-col items-center justify-center gap-y-3 overflow-x-hidden bg-black bg-opacity-50 bg-space text-center font-orbitron text-white"
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <img src="/images/logo/logo.svg" className="h-[100px] w-[100px]" alt="" />
      <h3 className="text-3xl font-semibold">Mine Complete</h3>
      <p className="text-lg">You have successfully completed mining $ODY</p>
      {isClaimLoading ? (
        <Puff
          visible={true}
          height="55"
          width="55"
          color="#FFF"
          ariaLabel="puff-loading"
          wrapperStyle={{}}
          wrapperClass=""
        />
      ) : (
        <button
          onClick={claimToken}
          className="inline-flex h-[3.5rem] w-[95%] items-center justify-center gap-x-3 rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 text-xl font-bold text-white shadow-2xl shadow-violet-500"
        >
          Claim {amountFarmed} $ODY
        </button>
      )}
    </motion.div>
  )
}

export function FarmUpgrades({
  setUpgrades,
  user,
  walletBalance,
  userLevel,
  getUserData,
  getCurrentFarm,
}) {
  const [purchasingUpgrade, setPurchasingUpgrade] = useState(null)
  const [upgrade, setUpgrade] = useState(null)
  const [periodUpgrade, setPeriodUpgrade] = useState(null)
  const [loadingPurchase, setLoadingPurchase] = useState('')
  const [loadingPowerPurchase, setLoadingPowerPurchase] = useState('')

  async function handleUpgradePurchase(upgrade) {
    if (upgrade.Cost > user.wallet[0].balance) {
      toast('You have insufficient funds...')
      return
    }

    setPurchasingUpgrade(upgrade.Tool)
    try {
      await axios.post('/api/v1/upgrade/farming', {
        telegramId: user.chatId,
        upgrade,
      })

      toast('Successfully Purchased Upgrade')
      window.location.reload()
    } catch (error) {
      toast('Upgrade Purchase Failed')
      console.error(error)
    } finally {
      setPurchasingUpgrade(null)
    }
  }

  async function buyShip() {
    setLoadingPurchase(upgrade.Tool)
    if (walletBalance < upgrade.Cost) {
      toast('Insufficient Balance... Please Try Again Later')
      setLoadingPurchase('')
      return
    }
    try {
      const response = await axios.post('/api/v1/boost/ship', {
        telegramId: user.chatId,
        upgrade,
      })

      toast('Successfully bought new mining ship')
      getUserData()
      getCurrentFarm()
    } catch (error) {
      console.error(error)
      toast('Unable to Buy a New Ship... Please Try Again Later')
    } finally {
      setLoadingPurchase('')
    }
  }

  async function buyPower() {
    setLoadingPowerPurchase(periodUpgrade.Tool)
    if (walletBalance < periodUpgrade.Cost / 2) {
      toast('Insufficient Balance... Please Try Again Later')
      setLoadingPowerPurchase('')
      return
    }
    try {
      const response = await axios.post('/api/v1/boost/power', {
        telegramId: user.chatId,
        upgrade: periodUpgrade,
      })

      toast('Successfully bought power grid')
      getUserData()
      getCurrentFarm()
    } catch (error) {
      console.error(error)
      toast('Unable to Buy a Power... Please Try Again Later')
    } finally {
      setLoadingPowerPurchase('')
    }
  }

  useEffect(() => {
    const locatedUpgrade = farmUpgrades.find(
      (upgrade) => upgrade.Increment - 1 === userLevel.farmLevel
    )

    if (
      userLevel.currentNoOfFarmHours === 1 ||
      userLevel.currentNoOfFarmHours === 0.01
    ) {
      setPeriodUpgrade(farmUpgrades[0])
    } else {
      const farmPeriodUpgrades = farmUpgrades.findIndex(
        (upgrade) => upgrade.FarmPeriod === userLevel.currentNoOfFarmHours
      )

      setPeriodUpgrade(farmUpgrades[farmPeriodUpgrades + 1])
    }

    setUpgrade(locatedUpgrade)
  }, [])

  return (
    <motion.div
      className="absolute left-0 top-0 z-50 flex h-screen w-full flex-col items-center justify-start gap-y-10 space-y-3 overflow-y-scroll bg-space p-5 font-orbitron text-white"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 80, duration: '0.8s' }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      <div className="flex w-full justify-end">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          className="z-50"
          onClick={() => setUpgrades(false)}
        >
          <path
            fill="#FFF"
            d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6zm3.6 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"
          />
        </svg>
      </div>
      <div className="z-10 space-y-3">
        <h3 className="text-3xl font-bold">Purchase Upgrades</h3>
        <div className="w-full border border-white"></div>
        <div className="mt-3 flex w-full flex-col items-center justify-center gap-y-3 font-orbitron font-semibold">
          <p className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-sm font-extrabold uppercase text-transparent shadow-blue-500 drop-shadow-2xl">
            Current Balance
          </p>
          {walletBalance ? (
            <span className="inline-flex items-center gap-x-3 text-4xl">
              $ODY {walletBalance.toLocaleString()}
            </span>
          ) : (
            <>
              {walletBalance === 0 ? (
                <span className="inline-flex items-center gap-x-3 text-4xl">
                  $ODY {walletBalance.toLocaleString()}
                </span>
              ) : (
                <Puff color="#fff" width={30} height={30} />
              )}
            </>
          )}
          <p className="rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500">
            Mining Rate <sup>+{userLevel?.farmLevel}</sup> | Timeline{' '}
            {userLevel?.currentNoOfFarmHours}{' '}
            {userLevel?.currentNoOfFarmHours === 1 ? 'Hr' : 'Hrs'}
          </p>
          <p className="inline-flex items-center justify-center gap-x-3 text-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 512 512"
            >
              <path
                fill="#FFF"
                d="m265 34l47.898 35.924l61.563 123.123l-8.057 32.23l-24.943-4.158l3.16-10.533l2.842-9.473L256 182.823l-91.463 18.29l6.002 20.006l-24.943 4.156l-8.057-32.228L199.1 69.926L247 34v56h-39l-16 32l64 38l64-38l-16-32h-39zm188.313 169.258l30.3 10.101l-13.478 29.205l-30.016-5.001zm-394.626 0l13.194 34.304l-30.016 5.002l-13.478-29.205zM256 205.32l53.8 58.692L281.306 359h-50.61L202.2 264.012zm25.254.909l43.283 8.658l-8.715 29.052zm-50.508.002l-34.568 37.709l-8.715-29.053zm105.5 32.267L482.5 262.873L429.799 368.28L329.98 259.385zm-160.492 0l6.266 20.887L82.2 368.279L29.5 262.873zm148.205 40.96l72.201 78.765l-84.556-37.582zm-135.918 0l12.355 41.183l-84.556 37.582zm118.348 58.564l28.646 12.732L312.973 439H265v-62h29.695zm-100.778 0L217.305 377H247v62h-47.973l-22.062-88.246zM387.6 374.115l18.105 8.047l-9.984 21.635l-16.387-8.193zm-263.2 0l8.266 21.489l-16.387 8.193l-9.984-21.635zM311 457v30h-30v-30zm-80 0v30h-30v-30z"
              />
            </svg>
            {userLevel?.farmLevel}{' '}
          </p>

          <div className="flex w-full flex-col items-center justify-center gap-y-3">
            <h3 className="text-2xl">Mining Boosters</h3>
            <button
              className={`inline-flex min-h-[3.5rem] w-full items-center justify-start gap-x-3 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-2 font-orbitron font-semibold text-white shadow-2xl shadow-blue-500 ${
                loadingPurchase === upgrade?.Tool
                  ? 'justify-center'
                  : 'justify-start'
              }`}
              onClick={() => buyShip()}
            >
              {loadingPurchase === upgrade?.Tool ? (
                <Puff color="#fff" width={55} height={55} />
              ) : (
                <>
                  <p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 512 512"
                    >
                      <path
                        fill="#FFF"
                        d="m265 34l47.898 35.924l61.563 123.123l-8.057 32.23l-24.943-4.158l3.16-10.533l2.842-9.473L256 182.823l-91.463 18.29l6.002 20.006l-24.943 4.156l-8.057-32.228L199.1 69.926L247 34v56h-39l-16 32l64 38l64-38l-16-32h-39zm188.313 169.258l30.3 10.101l-13.478 29.205l-30.016-5.001zm-394.626 0l13.194 34.304l-30.016 5.002l-13.478-29.205zM256 205.32l53.8 58.692L281.306 359h-50.61L202.2 264.012zm25.254.909l43.283 8.658l-8.715 29.052zm-50.508.002l-34.568 37.709l-8.715-29.053zm105.5 32.267L482.5 262.873L429.799 368.28L329.98 259.385zm-160.492 0l6.266 20.887L82.2 368.279L29.5 262.873zm148.205 40.96l72.201 78.765l-84.556-37.582zm-135.918 0l12.355 41.183l-84.556 37.582zm118.348 58.564l28.646 12.732L312.973 439H265v-62h29.695zm-100.778 0L217.305 377H247v62h-47.973l-22.062-88.246zM387.6 374.115l18.105 8.047l-9.984 21.635l-16.387-8.193zm-263.2 0l8.266 21.489l-16.387 8.193l-9.984-21.635zM311 457v30h-30v-30zm-80 0v30h-30v-30z"
                      />
                    </svg>
                  </p>
                  <p className="flex flex-col items-start justify-start">
                    <p className="text-md">Buy Mining Ship</p>
                    <p>
                      $ODY {upgrade ? upgrade.Cost.toLocaleString() : ''} | Mine
                      Rate{' '}
                      <sup>+{upgrade?.Increment - userLevel.farmLevel}</sup>{' '}
                    </p>
                  </p>
                </>
              )}
            </button>
            <button
              className={`inline-flex min-h-[3.5rem] w-full items-center gap-x-3 rounded-md bg-white p-2 font-orbitron font-semibold text-blue-500 ${
                loadingPowerPurchase === periodUpgrade?.Tool
                  ? 'justify-center'
                  : 'justify-start'
              }`}
              onClick={() => buyPower()}
            >
              {loadingPowerPurchase === periodUpgrade?.Tool ? (
                <Puff color="#3b82f6" width={55} height={55} />
              ) : (
                <>
                  <p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4M11 20v-5.5H9L13 7v5.5h2z"
                      />
                    </svg>
                  </p>
                  <p className="flex flex-col items-start justify-start">
                    <p className="text-md">Buy Energy Core</p>
                    <p>
                      $ODY{' '}
                      {periodUpgrade
                        ? (periodUpgrade.Cost / 2).toLocaleString()
                        : ''}{' '}
                      | Timeline{' '}
                      <sup>
                        +
                        {periodUpgrade?.FarmPeriod -
                          userLevel.currentNoOfFarmHours}
                      </sup>
                    </p>
                  </p>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// @ts-ignore
const tg = window.Telegram.WebApp

export default function Farm({ user }) {
  const [farm, setFarm] = useState(null)
  const [isFarming, setIsFarming] = useState(true)
  const [isFarmingComplete, setIsFarmingComplete] = useState(false)
  const [isLoadingStartFarming, setIsLoadingStartFarming] = useState(false)
  const [isClaimLoading, setIsClaimLoading] = useState(false)
  const [viewUpgrades, setUpgrades] = useState(false)
  const [openMenuDropdown, setOpenMenuDropdown] = useState(true)
  const [walletBalance, setWalletBalance] = useState(0)
  const [userLevel, setUserLevel] = useState(null)

  async function getUserData() {
    try {
      const response = await axios.get(`/user/wallet/${user.chatId}`)
      setWalletBalance(response.data.balance)
      setUserLevel(response.data.activity)
    } catch (error) {
      console.error(error)
    }
  }

  async function getCurrentFarm() {
    try {
      const response = await axios.get(`/api/v1/farm/${user.chatId}`)
      if (response.data) {
        setIsFarming(true)
        setFarm(response.data)
        return
      } else {
        setIsFarming(false)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getUserData()
    getCurrentFarm()
  }, [isFarmingComplete, isFarming, isLoadingStartFarming])

  async function handleStartFarming() {
    tg.ready()
    if (tg) {
      const tgUser = tg.initDataUnsafe.user
      const startTime = Date.now()
      const endTime = addHours(startTime, user.activity.currentNoOfFarmHours)

      const calculateFinalScore = (startTime, endTime, increment) => {
        const totalTimeInSeconds = Math.floor((endTime - startTime) / 1000)
        return totalTimeInSeconds * increment
      }

      try {
        const farmData = await axios.post('/api/v1/reward/store-farm', {
          telegramId: user.chatId,
          startTime,
          endTime: endTime.getTime(),
          hours: userLevel.currentNoOfFarmHours,
          eligibleClaimAmount: calculateFinalScore(
            startTime,
            endTime.getTime(),
            userLevel.farmLevel
          ),
        })

        getCurrentFarm()
        setIsLoadingStartFarming(true)
      } catch (error) {
        console.error(error)
        toast('Failed to Start Mining Session timeline')
      }
    }
  }

  async function handleClaim() {
    setIsClaimLoading(true)
    tg.ready()
    if (tg) {
      const tgUser = tg.initDataUnsafe.user
      try {
        await axios.post('/api/v1/reward/claim-tokens', {
          telegramId: user.chatId,
          farmId: farm.id,
          tokenFarmAmount: farm.eligibleClaimAmount,
        })

        toast(`You have successfully claimed $ODY ${farm.eligibleClaimAmount}`)
        setIsFarmingComplete(false)
        getUserData()
        getCurrentFarm()
        setIsLoadingStartFarming(false)
      } catch (error) {
        console.error(error)
        toast(
          'There was a problem claiming your tokens... Please Try Again later'
        )
      } finally {
        setIsClaimLoading(false)
      }
    }
  }

  return (
    <div className="relative flex h-[83dvh] w-full flex-col items-center justify-between">
      <AnimatePresence initial={false} mode="sync" exitBeforeEnter={true}>
        {isFarmingComplete && (
          <FarmComplete
            amountFarmed={farm.eligibleClaimAmount}
            claimToken={handleClaim}
            isClaimLoading={isClaimLoading}
          />
        )}
      </AnimatePresence>
      <AnimatePresence initial={false} mode="sync" exitBeforeEnter={true}>
        {viewUpgrades && (
          <FarmUpgrades
            setUpgrades={setUpgrades}
            walletBalance={walletBalance}
            user={user}
            userLevel={userLevel}
            getUserData={getUserData}
            getCurrentFarm={getCurrentFarm}
          />
        )}
      </AnimatePresence>
      <div className="flex h-fit w-full flex-col items-center justify-center gap-y-3 text-white">
        <div className="flex h-20 w-full items-center justify-between bg-black bg-opacity-20 px-2 shadow-lg backdrop-blur-md backdrop-filter">
          <div className="flex h-full items-center justify-start gap-x-3">
            {!user?.profilePicture ? (
              <p className="flex h-[55px] w-[55px] items-center justify-center rounded-full border-[5px] border-blue-500 bg-white text-4xl font-bold text-black shadow-2xl shadow-blue-500">
                {user?.firstName[0]}
              </p>
            ) : (
              <img
                src={user?.profilePicture}
                className={`h-[55px] w-[55px] rounded-full border-[5px] border-blue-500 shadow-2xl shadow-blue-500 ${
                  user.username === 'theaethar' ? 'animate-pulse' : ''
                }`}
              />
            )}
            <div className="flex flex-col font-orbitron">
              <p className="text-lg font-semibold">
                Hello {user?.firstName ? user?.firstName : user?.username}!
              </p>
              {isMorning(new Date()) ? (
                <p className="text-xl">Good Morning</p>
              ) : (
                ''
              )}
              {isAfternoon(new Date()) ? (
                <p className="text-xl">Good Afternoon</p>
              ) : (
                ''
              )}
              {isEvening(new Date()) ? (
                <p className="text-xl">Good Evening</p>
              ) : (
                ''
              )}
            </div>
          </div>
          <button className="h-fit" onClick={() => setUpgrades(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="35"
              height="35"
              viewBox="0 0 24 24"
            >
              <path
                fill="#FFF"
                d="M14 9q-.425 0-.712-.288T13 8V4q0-.425.288-.712T14 3h6q.425 0 .713.288T21 4v4q0 .425-.288.713T20 9zM4 13q-.425 0-.712-.288T3 12V4q0-.425.288-.712T4 3h6q.425 0 .713.288T11 4v8q0 .425-.288.713T10 13zm10 8q-.425 0-.712-.288T13 20v-8q0-.425.288-.712T14 11h6q.425 0 .713.288T21 12v8q0 .425-.288.713T20 21zM4 21q-.425 0-.712-.288T3 20v-4q0-.425.288-.712T4 15h6q.425 0 .713.288T11 16v4q0 .425-.288.713T10 21z"
              />
            </svg>
          </button>
        </div>
        <div className="mt-5 space-y-5">
          <p className="mt-5 flex flex-col items-center justify-center gap-y-3 font-orbitron font-semibold">
            <p className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-sm font-extrabold uppercase text-transparent shadow-blue-500 drop-shadow-2xl">
              Current Balance
            </p>
            {walletBalance ? (
              <span className="inline-flex items-center gap-x-3 text-4xl">
                $ODY {walletBalance.toLocaleString()}
              </span>
            ) : (
              <>
                {walletBalance === 0 ? (
                  <span className="inline-flex items-center gap-x-3 text-4xl">
                    $ODY {walletBalance.toLocaleString()}
                  </span>
                ) : (
                  <Puff color="#fff" width={30} height={30} />
                )}
              </>
            )}
            <p className="rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500">
              Mining Rate <sup>+{userLevel?.farmLevel}</sup> | Timeline{' '}
              {userLevel?.currentNoOfFarmHours}{' '}
              {userLevel?.currentNoOfFarmHours === 1 ? 'Hr' : 'Hrs'}
            </p>
            <p className="inline-flex items-center justify-center gap-x-3 text-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 512 512"
              >
                <path
                  fill="#FFF"
                  d="m265 34l47.898 35.924l61.563 123.123l-8.057 32.23l-24.943-4.158l3.16-10.533l2.842-9.473L256 182.823l-91.463 18.29l6.002 20.006l-24.943 4.156l-8.057-32.228L199.1 69.926L247 34v56h-39l-16 32l64 38l64-38l-16-32h-39zm188.313 169.258l30.3 10.101l-13.478 29.205l-30.016-5.001zm-394.626 0l13.194 34.304l-30.016 5.002l-13.478-29.205zM256 205.32l53.8 58.692L281.306 359h-50.61L202.2 264.012zm25.254.909l43.283 8.658l-8.715 29.052zm-50.508.002l-34.568 37.709l-8.715-29.053zm105.5 32.267L482.5 262.873L429.799 368.28L329.98 259.385zm-160.492 0l6.266 20.887L82.2 368.279L29.5 262.873zm148.205 40.96l72.201 78.765l-84.556-37.582zm-135.918 0l12.355 41.183l-84.556 37.582zm118.348 58.564l28.646 12.732L312.973 439H265v-62h29.695zm-100.778 0L217.305 377H247v62h-47.973l-22.062-88.246zM387.6 374.115l18.105 8.047l-9.984 21.635l-16.387-8.193zm-263.2 0l8.266 21.489l-16.387 8.193l-9.984-21.635zM311 457v30h-30v-30zm-80 0v30h-30v-30z"
                />
              </svg>
              {userLevel?.farmLevel}{' '}
            </p>
          </p>
          <p></p>
        </div>
      </div>
      <div className="flex h-fit flex-col items-center justify-center gap-y-3 px-2">
        <p className="text-center font-orbitron font-semibold text-white">
          Rank : {getRankingOfficerTitle(userLevel?.farmLevel)}
        </p>
        <p className="text-center font-orbitron text-2xl font-semibold text-white">
          Odystorm Galaxy Defense Corp
        </p>
        <div className="flex w-full items-center justify-center gap-x-3">
          <button
            className="w-full rounded-md bg-white p-3 font-orbitron text-lg font-semibold text-blue-500 shadow-2xl"
            onClick={() => {
              toast('Game is currently in development')
            }}
          >
            Play 👾
          </button>
        </div>
        <div className="w-full">
          {!isFarming ? (
            <button
              className="inline-flex h-[3.5rem] w-full items-center justify-center rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500"
              onClick={handleStartFarming}
            >
              {isLoadingStartFarming ? (
                <Puff
                  visible={true}
                  height="35"
                  width="35"
                  color="#FFF"
                  ariaLabel="puff-loading"
                  wrapperStyle={{}}
                  wrapperClass=""
                />
              ) : (
                'Start Mining'
              )}
            </button>
          ) : (
            <div
              className={`inline-flex h-[3.5rem] w-full items-center ${
                farm ? 'justify-between' : 'justify-center'
              } rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500`}
            >
              {farm ? (
                <Countdown
                  increment={farm.increment}
                  startTime={farm.startTime}
                  endTime={farm.endTime}
                  setIsFarmingComplete={setIsFarmingComplete}
                />
              ) : (
                <Puff
                  visible={true}
                  height="35"
                  width="35"
                  color="#FFF"
                  ariaLabel="puff-loading"
                  wrapperStyle={{}}
                  wrapperClass=""
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
