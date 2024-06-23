// import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
// import ProgressBar from '@/components/Progress'
import { Link } from '@inertiajs/react'

export default function Index({ name }) {
  // const [progress, setProgress] = useState(0)

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setProgress((prev) => (prev < 100 ? prev + 10 : 0))
  //   }, 1000)

  //   return () => clearInterval(interval)
  // }, [])

  return (
    <>
      <Head title={name} />
      <motion.section
        className="relative flex min-h-screen w-full items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <img
          src="/images/bg/forest.jpg"
          className="min-h-screen w-full brightness-50"
          alt=""
        />
        <div className="absolute z-10 flex h-screen flex-col items-center justify-center py-3">
          <div className="flex w-[350px] flex-col items-center justify-center gap-y-5 p-2">
            <motion.img
              src="/images/logo/logo.png"
              className="h-[175px] w-[175px]"
              alt="Dragon Coin Logo"
              initial={{ y: 0 }}
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 1.5,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'loop',
              }}
            />
            <h3 className="text-center font-MedievalSharp text-5xl font-bold capitalize text-white drop-shadow-2xl">
              Welcome to Dragon Quest
            </h3>
            <p className="text-center font-MedievalSharp text-xl text-white">
              Play now and earn valuable dragon tokens!
            </p>
            {/* <ProgressBar progress={progress} /> */}
            <Link
              href="/play"
              as="button"
              className="mt-3 w-[60%] transform rounded-md bg-[#AF955D] py-3 font-uncialAntiqua uppercase text-white transition-transform duration-150 hover:scale-105 active:scale-95 active:border-black active:bg-[#ceaf6d]"
            >
              Play
            </Link>
          </div>
        </div>
      </motion.section>
    </>
  )
}
