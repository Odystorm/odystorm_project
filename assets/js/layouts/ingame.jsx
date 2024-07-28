import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Head } from '@inertiajs/react'
import BottomNav from '@/components/BottomNav'

export const GameLayout = ({ children, component, setComponent }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 20, 100))
    }, 500)

    const timer = setTimeout(() => {
      setIsLoading(false)
      clearInterval(interval)
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  return !isLoading ? (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-between gap-y-3 bg-space">
      <Head title="Play OdyStorm Token Farm" />
      <div className="relative flex h-full w-full flex-col">{children}</div>
      <BottomNav component={component} setComponent={setComponent} />
    </section>
  ) : (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="absolute inset-0 z-[9999] rounded-lg"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src="/images/splash/odystorm.webp"
            className="min-h-screen w-full object-cover"
            alt="OdyStorm Splash"
          />
          <div className="iphone7:bottom-5 bottom-5 absolute  left-1/2 w-3/4 -translate-x-1/2 transform">
            <div className="h-6 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <motion.div
                className="h-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-2xl shadow-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default GameLayout
