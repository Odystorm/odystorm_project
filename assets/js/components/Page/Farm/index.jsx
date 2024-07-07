import axios from 'axios'
import { useEffect, useState } from 'react'
import Countdown from '@/components/Timer'
import { toast } from 'react-toastify'
import { Puff } from 'react-loader-spinner'
import { motion, AnimatePresence } from 'framer-motion'

export function FarmComplete({ amountFarmed, claimToken, isClaimLoading }) {
  return (
    <motion.div
      className="absolute left-0 top-0 z-50 flex h-screen w-full flex-col items-center justify-center gap-y-3 bg-black text-center text-white"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <img src="/images/logo/logo.svg" className="h-[100px] w-[100px]" alt="" />
      <h3 className="text-3xl font-semibold">Farm Complete</h3>
      <p className="text-lg">You have successfully completed farming $ODY</p>
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
          className="inline-flex h-[3.5rem] w-[95%] items-center justify-center gap-x-3 rounded-md bg-white text-xl font-bold text-black"
        >
          Claim {amountFarmed} $ODY
        </button>
      )}
    </motion.div>
  )
}

// @ts-ignore
const tg = window.Telegram.WebApp

export default function Farm({ user }) {
  console.log(user)
  const [isFarming, setIsFarming] = useState(false)
  const [isFarmingComplete, setIsFarmingComplete] = useState(false)
  const [isClaimLoading, setIsClaimLoading] = useState(false)
  const amountFarmed = 14400

  function handleFarming() {
    setIsFarming(true)
  }

  useEffect(() => {
    const countdownData = window.localStorage.getItem('countdownData')
    if (!countdownData && user.activity.farmdata) {
      window.localStorage.setItem(
        'countdownData',
        JSON.stringify(user.activity.farmdata)
      )
      setIsFarming(true)
    } else {
      setIsFarming(false)
    }
  }, [])

  async function storeCountdown(data) {
    tg.ready()
    if (tg) {
      const tgUser = tg.initDataUnsafe.user

      try {
        await axios.post('/api/v1/reward/store-farm', {
          telegramId: tgUser.id,
          timeline: data,
          eligibleClaimAmount: data.savedScore,
        })

        toast.success(
          `You just started farming $ODY for the next ${user.activity.currentNoOfFarmHours} hours`
        )
        setIsFarming(true)
      } catch (error) {
        console.error(error)
        toast.error('Failed to Store Farm timeline')
      }
    }
  }

  useEffect(() => {
    const existingCountdown = window.localStorage.getItem('countdownData')
    if (existingCountdown) {
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
          tokenFarmAmount: amountFarmed,
        })

        toast.success(`You have successfully farmed ${amountFarmed}`)
        setIsFarmingComplete(false)
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
    <div className="relative flex h-screen max-h-screen w-full flex-col justify-between overflow-y-scroll">
      <AnimatePresence initial={false} mode="sync" exitBeforeEnter={true}>
        {isFarmingComplete && (
          <FarmComplete
            amountFarmed={amountFarmed}
            claimToken={handleClaim}
            isClaimLoading={isClaimLoading}
          />
        )}
      </AnimatePresence>
      <div className="mt-10 flex w-full flex-col items-center justify-center gap-y-3 text-white">
        {!user?.profilePicture ? (
          <p className="flex h-[155px] w-[155px] items-center justify-center rounded-full bg-white text-4xl font-bold text-black">
            {user?.firstName[0]}
          </p>
        ) : (
          <img
            src={user?.profilePicture}
            className="h-[155px] w-[155px] rounded-full"
          />
        )}

        <p className=" text-xl font-semibold">
          {user?.username ? user?.username : 'johndoe'}
        </p>
        <p className="mt-5 flex items-center justify-center gap-x-3  text-3xl font-semibold">
          <span className="text-4xl">$ODY {user?.wallet[0].balance}</span>
        </p>
      </div>
      <div className="mb-[7.5rem] flex flex-col items-center justify-center gap-y-3 px-2">
        <div className="flex w-full flex-col items-center justify-center gap-y-2 rounded-md bg-white p-3">
          <img
            src="/images/logo/logo_black.svg"
            className="h-[90px] w-[90px] drop-shadow-lg"
            alt="OdyStorm Logo"
          />
          <div className="flex w-full justify-between">
            <h3 className="inline-flex items-center gap-x-3 rounded-md bg-black p-3 text-white">
              Upgrade{' '}
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
            </h3>
            <button
              className="inline-flex items-center gap-x-3 rounded-md bg-black p-3 font-semibold text-white"
              onClick={() => {
                toast.info('Game is Currently in Development!')
              }}
            >
              Play
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="25"
                height="25"
                viewBox="0 0 512 512"
              >
                <path
                  fill="#7F4AFF"
                  d="M111.051 442.516h36.658v36.658h-36.658zm-1.291-290.235h36.658v-36.658H73.102v73.316h36.658zm36.658-109.974H109.76v36.658h36.658zm255.715 146.632h36.658v-73.316h-73.316v36.658h36.658zm0-146.632h-36.658v36.658h36.658zm73.209 109.867v108.549h-73.028v-36.23h-36.082V188.28h-36.97v-73.316h-36.658v73.316h-73.316v-73.316H182.63v73.316h-36.658v36.213H109.76v36.23H36.658V152.281H0v108.656h36.299v36.444h73.461v108.904h37.949v36.23h71.77v-36.23h73.898v36.23h71.77v-36.23h37.166V297.381h73.135V260.83H512V152.174zM365.475 479.173h36.658v-36.658h-36.658z"
                />
                <path
                  fill="#FFF"
                  d="M218.573 332.941h-72.6v-72.002h72.6zm147.659-72.002h-72.201v72.002h72.201z"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="w-full">
          {isFarming ? (
            <button className="inline-flex h-[3.5rem] w-full items-center justify-between rounded-md bg-white p-3 text-lg font-semibold text-black">
              <Countdown
                hours={user.activity.currentNoOfFarmHours}
                increment={user.activity.farmLevel}
                storeCountdown={storeCountdown}
                setIsFarmingComplete={setIsFarmingComplete}
              />
            </button>
          ) : (
            <button
              className="h-[3.5rem] w-full rounded-md bg-white font-semibold text-black"
              onClick={handleFarming}
            >
              Start Farming
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
