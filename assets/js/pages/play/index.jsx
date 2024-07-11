// @ts-nocheck
import { useEffect, useState } from 'react'
import GameLayout from '@/layouts/ingame'
import Stats from '@/components/Page/Stats'
import Tasks from '@/components/Page/Tasks'
import Farm from '@/components/Page/Farm'
import Referrals from '@/components/Page/Referrals'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { motion, AnimatePresence } from 'framer-motion'
import { router } from '@inertiajs/react'

export function Notification({ activity, setShowNotification }) {
  return (
    <motion.div
      className="absolute left-0 top-0 z-[100] flex min-h-screen w-full flex-col items-center justify-center gap-y-3 bg-black text-center text-white"
      onClick={() => {
        setShowNotification(false)
        window.location.reload()
      }}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-3xl font-bold">Day {activity.noOfActiveDays}</h2>
      <h3 className="text-xl">You have received your daily bonus</h3>
      <p className="text-lg font-semibold">+100 ODY</p>
    </motion.div>
  )
}

// @ts-ignore
const tg = window.Telegram.WebApp

const Play = ({ user }) => {
  const [component, setComponent] = useState('home')
  const [showNotification, setShowNotification] = useState(true)
  const content = ''

  if (!user) {
    router.get('/')
  }

  function renderComponent() {
    switch (component) {
      case 'home':
        return <Farm user={user} />
      case 'referral':
        return <Referrals user={user} />
      case 'stats':
        return <Stats />
      case 'tasks':
        return <Tasks />
      default:
        return <Farm user={user} />
    }
  }

  return (
    <GameLayout setComponent={setComponent} component={component}>
      {renderComponent()}
      <ToastContainer
        autoClose={3000}
        toastStyle={{ backgroundColor: 'white', color: 'black' }}
        hideProgressBar={true}
      />
      <AnimatePresence initial={false} mode="sync" exitBeforeEnter={true}>
        {showNotification && user.activity.eligibleDailyBonus && (
          <Notification
            activity={user.activity}
            setShowNotification={setShowNotification}
          />
        )}
      </AnimatePresence>
    </GameLayout>
  )
}

export default Play
