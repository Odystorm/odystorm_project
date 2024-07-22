// @ts-nocheck
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import axios from 'axios'
import { Puff } from 'react-loader-spinner'

const data = [
  {
    heading: 'Share Your Invitation Link',
    text: 'Win a chance to play a Match',
  },
  {
    heading: 'Your friends Join OdyStorm',
    text: 'and start farming tokens',
  },
  {
    heading: 'Score 10% from friends',
    text: 'Plus an Extra 2.5% from their referrals',
  },
]

// @ts-ignore
const tg = window.Telegram.WebApp

const InviteModal = ({ setOpenModal, user }) => {
  const referralLink = `https://t.me/odystorm_bot/app?startapp=ref_${user.referralId}`

  async function handleCopy() {
    try {
      await window.navigator.clipboard.writeText(referralLink)
      toast('Referral Link Copied', {
        position: 'top-center',
      })
      setOpenModal(false)
    } catch (err) {
      toast('Failed to Copy Referral Link', {
        position: 'top-center',
      })
    }
  }

  function handleSend() {
    const textToShare =
      "Join me on OdyStorm and let's earn together\nUse my link to join the fun ⚓"
    const telegramLink = `https://t.me/share/url?url=${referralLink}&text=${encodeURIComponent(
      textToShare
    )}`

    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.openTelegramLink(telegramLink)
    } else {
      alert('Telegram Web App is not available.')
    }
    setOpenModal(false)
  }

  return (
    <div className="fixed left-0 top-0 z-[100] flex min-h-full w-full flex-col justify-end bg-black/50 font-orbitron">
      <motion.div
        className="z-10 h-fit w-full space-y-5 rounded-t-lg bg-white py-3"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 80, duration: '0.8s' }}
      >
        <div className="flex items-center justify-between px-3 text-center">
          <span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
            >
              <path
                fill="#000"
                d="M3 13.5L11 2v11.5zm3.825-2H9V8.375zm5.675 2q.3-.7.65-2.45t.35-3.55t-.337-3.7T12.5 1q1.525.45 3.038 1.675T18.261 5.6t1.975 3.738T21 13.5zm2.6-2h3.7q-.425-1.925-1.388-3.525T15.376 5.25q.05.525.088 1.088T15.5 7.5q0 1.175-.112 2.175T15.1 11.5M9 19q-.9 0-1.675-.425T6 17.5q-.35.375-.763.7t-.912.525q-.875-.65-1.487-1.612T2 15h20q-.225 1.15-.837 2.113t-1.488 1.612q-.5-.2-.913-.525T18 17.5q-.575.65-1.338 1.075T15 19t-1.675-.425T12 17.5q-.55.65-1.325 1.075T9 19m-7 4v-2h1q.8 0 1.563-.25T6 20q.675.5 1.438.738T9 20.975t1.55-.238T12 20q.675.5 1.438.738t1.562.237t1.55-.238T18 20q.7.5 1.45.75T21 21h1v2h-1q-.775 0-1.525-.187T18 22.25q-.725.375-1.475.563T15 23t-1.525-.187T12 22.25q-.725.375-1.475.563T9 23t-1.525-.187T6 22.25q-.725.375-1.475.563T3 23zm13.1-11.5"
              />
            </svg>
          </span>
          <h3 className="text-xl font-semibold">Invite a Friend</h3>
          <span onClick={() => setOpenModal(false)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
            >
              <path
                fill="#000"
                d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"
              />
            </svg>
          </span>
        </div>
        <hr className="border-black" />
        <div className="flex flex-col items-center justify-center gap-y-2">
          <button
            className="inline-flex w-[80%] items-center justify-center gap-x-3 rounded-md bg-black/90 p-2 text-white"
            onClick={handleSend}
          >
            Send{' '}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
            >
              <path
                d="M9.78 18.65l.28-4.23l7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3L3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"
                fill="#FFF"
              />
            </svg>
          </button>
          <button
            className="inline-flex w-[80%] items-center justify-center gap-x-3 rounded-md bg-black/90 p-2 text-white"
            onClick={handleCopy}
          >
            Copy Link{' '}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
            >
              <path
                fill="#FFF"
                d="M10.616 16.077H7.077q-1.692 0-2.884-1.192T3 12t1.193-2.885t2.884-1.193h3.539v1H7.077q-1.27 0-2.173.904Q4 10.731 4 12t.904 2.173t2.173.904h3.539zM8.5 12.5v-1h7v1zm4.885 3.577v-1h3.538q1.27 0 2.173-.904Q20 13.269 20 12t-.904-2.173t-2.173-.904h-3.538v-1h3.538q1.692 0 2.885 1.192T21 12t-1.193 2.885t-2.884 1.193z"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-center">
          <button onClick={() => setOpenModal(false)} className="w-[80%] p-2">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const Referrals = ({ user }) => {
  const [openModal, setOpenModal] = useState(false)
  const [referrals, setReferrals] = useState(null)
  const [loadingReferrals, setLoadingReferrals] = useState(true)

  async function getReferrals() {
    try {
      const response = await axios.get(`/user/referrals/${user.chatId}`)
      setReferrals(response.data)
      setLoadingReferrals(false)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getReferrals()
  }, [])

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-y-scroll px-3">
      <div>
        <div className="my-5 mt-20 flex flex-col items-center justify-center text-center">
          <img
            src="/images/logo/logo.svg"
            className="h-[150px] w-[150px]"
            alt=""
          />
          <h3 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text font-orbitron text-3xl font-bold text-transparent shadow-blue-500 drop-shadow-2xl">
            Invite Friends to Join the Odystorm Space Defense
          </h3>
        </div>
        {/* <div className="text-white">
          <h4 className="text-xl font-bold">How it Works</h4>
          <ol className="space-y-5">
            {data.map((step, index) => (
              <li className="flex items-start gap-x-4" key={index}>
                <div className="text-md font-bold">
                  <span>{index + 1}</span>
                </div>
                <div>
                  <p className="text-lg">{step.heading}</p>
                  <p className="text-md font-thin">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div> */}

        <div className="min-h-[250px] space-y-3 overflow-y-scroll">
          {!loadingReferrals && (
            <h3 className="text-lg font-bold text-white">
              {referrals ? referrals.length : 0}{' '}
              {referrals
                ? referrals.length > 1
                  ? 'Friends'
                  : 'Friend'
                : 'No Referrals'}
            </h3>
          )}
          {loadingReferrals ? (
            <div className="flex w-full items-center justify-center">
              <Puff color="#fff" height={55} width={55} />
            </div>
          ) : (
            <div className="space-y-2">
              {referrals &&
                referrals.map((referral, index) => {
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between text-white"
                    >
                      <div className="flex items-center justify-center gap-x-3">
                        {!referral.profilePicture ? (
                          <p className="text-md inline-flex h-[40px] w-[40px] items-center justify-center rounded-full border-[5px] border-blue-500 bg-white text-black shadow-2xl shadow-blue-500">
                            {referral.firstName[0]}
                          </p>
                        ) : (
                          <img
                            src={referral.profilePicture}
                            className="h-[40px] w-[40px] rounded-full border-[5px] border-blue-500 shadow-2xl shadow-blue-500"
                          />
                        )}
                        <div className="flex flex-col items-start justify-center">
                          <h3 className="font-orbitron font-medium">
                            {referral.firstName}
                          </h3>
                          <p className="flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="25"
                              height="25"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fill="#FFF"
                                d="M6.75 10a3.25 3.25 0 1 0 0-6.5a3.25 3.25 0 0 0 0 6.5m5.687 5.145c.53.217 1.204.355 2.062.355c4 0 4-3 4-3A1.5 1.5 0 0 0 17 11h-4.628c.393.476.629 1.085.629 1.75v.356a3 3 0 0 1-.017.252a5 5 0 0 1-.546 1.787M17 7.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0M1.5 13a2 2 0 0 1 2-2H10a2 2 0 0 1 2 2s0 4-5.25 4s-5.25-4-5.25-4m11.5.106l-.003.064Z"
                              />
                            </svg>

                            {referral.referrals.length}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span className="font-orbitron text-lg font-semibold">
                          $ODY {referral.wallet[0].balance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
      <div className="mb-[7rem] w-full">
        <button
          className="h-[3.5rem] w-full rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 font-orbitron text-lg font-semibold text-white shadow-2xl shadow-blue-500"
          onClick={() => setOpenModal(true)}
        >
          Invite a Friend
        </button>
      </div>
      <AnimatePresence initial={false} mode="sync" exitBeforeEnter={true}>
        {openModal && <InviteModal setOpenModal={setOpenModal} user={user} />}
      </AnimatePresence>
    </div>
  )
}

export default Referrals
