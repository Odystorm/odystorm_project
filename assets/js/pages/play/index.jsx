// @ts-nocheck
import { useEffect, useState } from 'react'
import GameLayout from '@/layouts/ingame'
import Stats from '@/components/Page/Stats'
import Tasks from '@/components/Page/Tasks'
import Farm from '@/components/Page/Farm'
import Referrals from '@/components/Page/Referrals'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { motion, AnimatePresence } from 'framer-motion'
import { router } from '@inertiajs/react'

export function Notification({ activity, setShowNotification }) {
  return (
    <motion.div
      className="absolute left-0 top-0 z-[100] flex min-h-screen w-full flex-col items-center justify-center gap-y-3 bg-black text-center font-orbitron text-white"
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
      <h3 className="text-xl ">You have received your daily bonus</h3>
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

  useEffect(() => {
    if (user.activity.eligibleDailyBonus) {
      toast.success(
        `Day ${user.activity.noOfActiveDays} You have Received your Daily Bonus of $ODY 100`
      )
      window.location.reload()
    }
  }, [])

  function renderComponent() {
    switch (component) {
      case 'home':
        return <Farm user={user} />
      case 'referral':
        return <Referrals user={user} />
      case 'stats':
        return <Stats />
      case 'tasks':
        return <Tasks tasks={user.tasks} wallet={user.wallet[0]} user={user} />
      default:
        return <Farm user={user} />
    }
  }

  return (
    <GameLayout setComponent={setComponent} component={component}>
      {renderComponent()}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        className="shadow-blue-500 drop-shadow-2xl"
        toastClassName={() =>
          'relative flex items-center justify-between p-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-md'
        }
        bodyClassName={() => 'text-sm text-center flex-grow font-orbitron font-bold'}
        hideProgressBar={true}
        closeButton={false} // Hide the default close button
      />
    </GameLayout>
  )
}

export default Play
