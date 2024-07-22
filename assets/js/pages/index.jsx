import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Puff } from 'react-loader-spinner'
import { ToastContainer, toast } from 'react-toastify'

// @ts-ignore
const tg = window.Telegram.WebApp

export default function Index() {
  function getReferralCode() {
    // @ts-ignore
    const queryString = window.location.search
    const match = queryString.match(/[?&]tgWebAppStartParam=([^&]+)/)
    if (match && match[1].startsWith('ref_')) {
      return match[1].slice(4) // Remove the 'ref_' prefix
    } else {
      return null
    }
  }

  const referralId = getReferralCode()

  useEffect(() => {
    tg.ready()
    async function registerUser() {
      if (tg) {
        // Initialize the Web App
        // Retrieve chat ID and user information
        const user = tg.initDataUnsafe.user

        try {
          await axios.post('/register/referral', {
            chatId: user.id,
            referralId: referralId,
          })

          setTimeout(() => {
            router.get(`/play?user=${user.id}`)
          }, 2000)
        } catch (error) {
          console.error(error)
          toast('Sign Up Failed', {
            position: 'top-center',
          })
        }
      } else {
        console.error('Failed to initialize Telegram Web App')
      }
    }

    registerUser()
  }, [])

  return (
    <>
      <Head title="OdyStorm Token Farm" />
      <motion.section
        className="relative flex min-h-screen w-full items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <img
          src="/images/bg/bg_space.webp"
          alt=""
          className="absolute left-0 top-0 h-screen object-cover brightness-[0.5]"
        />
        <div className="absolute z-10 flex h-screen flex-col items-center justify-center py-3">
          <div className="flex w-[350px] flex-col items-center justify-center gap-y-5 p-2">
            <motion.img
              src="/images/logo/logo.svg"
              className="h-[135px] w-[135px]"
              alt="OdyStorm Coin Logo"
            />
            <h3 className="text-center font-orbitron text-5xl font-bold capitalize text-white drop-shadow-2xl">
              OdyStorm Space Defense
            </h3>
            <p className="text-center text-2xl text-white">
              Play now and earn valuable OdyStorm tokens!
            </p>
            <Puff
              visible={true}
              height="55"
              width="55"
              color="#FFF"
              ariaLabel="puff-loading"
              wrapperStyle={{}}
              wrapperClass=""
            />
          </div>
        </div>
        <ToastContainer
          position="top-center"
          autoClose={3000}
          className="shadow-blue-500 drop-shadow-2xl"
          toastClassName={() =>
            'relative flex items-center justify-between p-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-md'
          }
          bodyClassName={() =>
            'text-sm text-center flex-grow font-orbitron font-bold'
          }
          hideProgressBar={true}
          closeButton={false} // Hide the default close button
        />
      </motion.section>
    </>
  )
}
