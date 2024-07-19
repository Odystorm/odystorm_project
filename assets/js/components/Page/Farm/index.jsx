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
      className="absolute left-0 top-0 z-50 flex h-screen w-full flex-col items-center justify-center gap-y-3 overflow-x-hidden bg-black text-center font-orbitron text-white"
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

export function FarmUpgrades({ setUpgrades, user }) {
  const [isPurchasing, setIsPurchasing] = useState(false)

  async function handleUpgradePurchase(upgrade) {
    if (upgrade.Cost > user.wallet[0].balance) {
      toast.info('You have insufficient funds...')
      return
    }

    setIsPurchasing(true)
    try {
      await axios.post('/api/v1/upgrade/farming', {
        telegramId: user.chatId,
        upgrade,
      })

      toast.success('Successfully Purchased Upgrade')
      window.location.reload()
    } catch (error) {
      toast.error('Upgrade Purchase Failed')
      console.error(error)
    } finally {
      setIsPurchasing(false)
    }
  }

  const upgrades = farmUpgrades.filter(
    (upgrade) => upgrade.Increment > user.activity.farmLevel
  )

  return (
    <motion.div
      className="absolute left-0 top-0 z-50 flex h-screen w-full flex-col items-center justify-start space-y-3 overflow-y-scroll bg-gradient-to-b from-indigo-500 to-blue-950 p-5 font-orbitron text-white"
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex w-full justify-end">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          onClick={() => setUpgrades(false)}
        >
          <path
            fill="#FFF"
            d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6zm3.6 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"
          />
        </svg>
      </div>
      <h3 className="text-3xl font-bold">Purchase Upgrades</h3>
      <div className="-m-2 flex flex-wrap gap-y-3 p-3">
        {upgrades.map((upgrade, index) => (
          <div
            className="w-full space-y-2 rounded-md border p-3 text-center"
            key={index}
          >
            <p className="text-xl">{upgrade.Tool}</p>
            <p>{upgrade.Description}</p>
            <p>Cost: {upgrade.Cost.toLocaleString()} $ODY</p>
            <p>Token: +{upgrade.Increment}</p>
            <p className="font-bold">Mine Period: {upgrade.FarmPeriod} Hours</p>
            {isPurchasing ? (
              <button className={`rounded-md bg-white px-7 py-3 text-black`}>
                <Puff
                  visible={true}
                  height="25"
                  width="25"
                  color="#000"
                  ariaLabel="puff-loading"
                  wrapperStyle={{}}
                  wrapperClass=""
                />
              </button>
            ) : (
              <button
                className={`rounded-md px-7 py-3 text-black ${
                  upgrade.Cost > user.wallet[0].balance
                    ? 'bg-white/60'
                    : user.activity.farmLevel >= upgrade.Increment
                    ? 'bg-white/60'
                    : 'bg-white'
                }`}
                onClick={() => handleUpgradePurchase(upgrade)}
              >
                {upgrade.Cost > user.wallet[0].balance
                  ? 'Insufficient Balance'
                  : user.activity.farmLevel >= upgrade.Increment
                  ? 'Already own this upgrade'
                  : 'Pay'}
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// @ts-ignore
const tg = window.Telegram.WebApp

export default function Farm({ user }) {
  const [farm, setFarm] = useState(user.currentFarm ? user.currentFarm : null)
  const [isFarming, setIsFarming] = useState(false)
  const [isFarmingComplete, setIsFarmingComplete] = useState(false)
  const [isLoadingStartFarming, setIsLoadingStartFarming] = useState(false)
  const [isClaimLoading, setIsClaimLoading] = useState(false)
  const [farmingStarted, setFarmingStarted] = useState(false)
  const [viewUpgrades, setUpgrades] = useState(false)
  const [openMenuDropdown, setOpenMenuDropdown] = useState(true)
  const [walletBalance, setWalletBalance] = useState(0)

  const menuOptions = [
    {
      option: 'Profile',
    },
  ]

  useEffect(() => {
    async function getWallet() {
      try {
        const response = await axios.get(`/user/wallet/${user.chatId}`)
        setWalletBalance(response.data.balance)
      } catch (error) {
        console.error(error)
      }
    }

    getWallet()
  }, [])

  async function handleStartFarming() {
    setIsLoadingStartFarming(true)
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
          hours: user.activity.currentNoOfFarmHours,
          eligibleClaimAmount: calculateFinalScore(
            startTime,
            endTime.getTime(),
            user.activity.farmLevel
          ),
        })

        setFarm(farmData)
        setFarmingStarted(true)
        setTimeout(() => {
          setIsFarming(true)
        }, 2000)
        window.location.reload()
      } catch (error) {
        console.error(error)
        if (error && error.response && error.response.status) {
          toast.error("There's a Farm Session in Progress... Reloading Now")
          setTimeout(() => {
            window.location.reload()
          }, 2000)
          return
        }
        toast.error('Failed to Store Farm timeline')
      } finally {
        setIsLoadingStartFarming(false)
      }
    }
  }

  useEffect(() => {
    if (user.currentFarm) {
      setIsFarming(true)
    }
  }, [])

  async function handleClaim() {
    setIsClaimLoading(true)
    tg.ready()
    if (tg) {
      const tgUser = tg.initDataUnsafe.user
      try {
        await axios.post('/api/v1/reward/claim-tokens', {
          telegramId: tgUser.id,
          farmId: farm.id,
          tokenFarmAmount: farm.eligibleClaimAmount,
        })

        toast.success(
          `You have successfully claimed $ODY ${farm.eligibleClaimAmount}`
        )
        setIsFarmingComplete(false)
        setIsFarming(false)
        window.location.reload()
      } catch (error) {
        console.error(error)
        toast.error(
          'There was a problem claiming your tokens... Please Try Again later'
        )
      } finally {
        setIsClaimLoading(false)
      }
    }
  }

  return (
    <div className="relative flex h-screen max-h-screen w-full flex-col justify-between overflow-x-hidden overflow-y-scroll">
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
        {viewUpgrades && <FarmUpgrades setUpgrades={setUpgrades} user={user} />}
      </AnimatePresence>
      <AnimatePresence initial={false} mode="sync" exitBeforeEnter={true}>
        {farmingStarted && (
          <motion.div
            className="absolute z-[100] flex h-[100dvh] w-full flex-col items-center justify-center space-y-3 bg-black text-white"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src="/images/logo/logo.svg"
              className="h-[100px] w-[100px]"
              alt=""
            />
            <h3 className="text-3xl">Successfully Started Mining</h3>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex w-full flex-col items-center justify-center gap-y-3 text-white">
        <div className="flex h-20 w-full items-center justify-between bg-black bg-opacity-20 px-2 shadow-lg backdrop-blur-md backdrop-filter">
          <div className="flex h-full items-center justify-start gap-x-3">
            {!user?.profilePicture ? (
              <p className="flex h-[55px] w-[55px] items-center justify-center rounded-full bg-white text-4xl font-bold text-black">
                {user?.firstName[0]}
              </p>
            ) : (
              <img
                src={user?.profilePicture}
                className="h-[55px] w-[55px] rounded-full"
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
          <button className="h-fit">
            {openMenuDropdown && (
              <div className="absolute z-30 h-[300px] w-20"></div>
            )}
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
            <p className="text-sm uppercase">Current Balance</p>
            {walletBalance ? (
              <span className="inline-flex items-center gap-x-3 text-4xl">
                $ODY {walletBalance.toLocaleString()}
              </span>
            ) : (
              <Puff color="#fff" width={30} height={30} />
            )}
            <p className="rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500">
              Mining Rate <sup>+{user?.activity?.farmLevel}</sup> | Timeline{' '}
              {user?.activity.currentNoOfFarmHours} Hrs
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
              {user.wallet[0].noOfTickets}{' '}
            </p>
          </p>
          <p></p>
        </div>
      </div>
      <div className="mb-[7.5rem] flex flex-col items-center justify-center gap-y-3 px-2">
        <motion.img
          src="/images/ships/base_ship.webp"
          className="h-auto w-[30%]"
          alt=""
          initial={{ y: '0' }}
          animate={{ y: '-5' }}
          transition={{ duration: '0.8s' }}
        />
        <p className="text-center font-orbitron font-semibold text-white">
          Rank : {getRankingOfficerTitle(user.activity.farmLevel)}
        </p>
        <p className="text-center font-orbitron text-2xl font-semibold text-white">
          Odystorm Galaxy Defense Corp
        </p>
        <div className="flex w-full items-center justify-center gap-x-3">
          <button
            className="rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3  font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500"
            onClick={() => {
              toast('Game is currently in development')
            }}
          >
            Play 👾
          </button>
          <button
            className="rounded-md bg-white p-3 font-orbitron text-lg font-semibold text-blue-500 shadow-2xl"
            onClick={() => setUpgrades(true)}
          >
            Upgrade 🛠
          </button>
        </div>
        {/* <div className="flex w-full flex-col items-center justify-center gap-y-2 rounded-md bg-white px-5 py-3 font-orbitron shadow-lg">
          <img
            src="/images/logo/logo_black.svg"
            className="h-[90px] w-[90px] drop-shadow-lg"
            alt="OdyStorm Logo"
          />
          <div className="flex w-full justify-between">
            <button
              className="inline-flex items-center gap-x-3 rounded-md bg-black p-3 text-white"
              onClick={() => setUpgrades(true)}
            >
              Upgrade Ship{' '}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="25"
                height="25"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#FFF"
                  d="M5.33 3.272a3.5 3.5 0 0 1 4.472 4.473L20.647 18.59l-2.122 2.121L7.68 9.867a3.5 3.5 0 0 1-4.472-4.474L5.444 7.63a1.5 1.5 0 0 0 2.121-2.121zm10.367 1.883l3.182-1.768l1.414 1.415l-1.768 3.181l-1.768.354l-2.12 2.121l-1.415-1.414l2.121-2.121zm-7.071 7.778l2.121 2.122l-4.95 4.95A1.5 1.5 0 0 1 3.58 17.99l.097-.107z"
                />
              </svg>
            </button>
            <button
              className="inline-flex items-center gap-x-3 rounded-md bg-black p-3 font-semibold text-white"
              onClick={() => {
                toast.info('Game is Currently in Development!')
              }}
            >
              Play
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
            </button>
          </div>
        </div> */}
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
                  color="#000"
                  ariaLabel="puff-loading"
                  wrapperStyle={{}}
                  wrapperClass=""
                />
              ) : (
                'Start Mining'
              )}
            </button>
          ) : (
            <div className="inline-flex h-[3.5rem] w-full items-center justify-between rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500">
              {farm && (
                <Countdown
                  increment={farm.increment}
                  startTime={farm.startTime}
                  endTime={farm.endTime}
                  setIsFarmingComplete={setIsFarmingComplete}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
