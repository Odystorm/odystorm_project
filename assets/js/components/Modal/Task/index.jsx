import { useState } from 'react'
import { Puff } from 'react-loader-spinner'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'

// const data = {
//   createdAt: 1723540741517,
//   updatedAt: 1723540741517,
//   id: '66bb2505d3b5757886561bdf',
//   title: 'Engage Recent Tweet',
//   rewardAmount: 10000,
//   status: 'eligible',
//   taskType: 'ody_tasks',
//   requirement: {
//     mineTotal: 0,
//     url: 'https://x.com/AureviaWeb3/status/1823037463918531016',
//     isClicked: false,
//     instruction: 'Like, Follow & RT',
//   },
//   icon: 'https://pbs.twimg.com/profile_images/1822979078233722880/8xME1PJN_400x400.jpg',
//   owner: '66a388329a6a8af176838796',
// }

export default function TaskModal({
  data,
  setOpenTaskModal,
  handleSocialTask,
}) {
  const [loading, setLoading] = useState(false)
  if (
    data.icon === 'telegram' ||
    data.icon === 'x' ||
    data.icon === 'youtube'
  ) {
    data.icon = '/images/logo/logo_black.svg'
  }

  return (
    <AnimatePresence>
      <motion.div
        className="absolute z-50 flex min-h-screen w-full flex-col items-center justify-center bg-black/50"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {!loading && (
          <div
            className="absolute right-5 top-5"
            onClick={() => setOpenTaskModal(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
            >
              <path
                fill="#fff"
                d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"
              />
            </svg>
          </div>
        )}
        <div className="flex h-fit min-h-[380px] w-11/12 flex-col items-center justify-center gap-y-3 rounded-md bg-white py-5 text-center font-orbitron">
          {data ? (
            <>
              {' '}
              {data.icon ? (
                <img
                  src={data.icon}
                  className="h-[150px] w-[150px] rounded-full"
                  alt={data.title}
                />
              ) : (
                <img
                  src="/images/logo/logo_black.svg"
                  className="h-[90px] w-[90px] drop-shadow-lg"
                  alt="OdyStorm Logo"
                />
              )}
              <h3 className="text-xl font-semibold">Your Mission</h3>
              <h3 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text font-orbitron text-3xl font-bold text-transparent shadow-blue-500 drop-shadow-2xl">
                {data.title}
              </h3>
              <p className="text-md font-bold">
                PRIZE :{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text font-orbitron font-bold text-transparent shadow-blue-500 drop-shadow-2xl">
                  $ODY
                </span>{' '}
                {data.rewardAmount.toLocaleString()}
              </p>
              {data.requirement.instruction ? (
                <p>{data.requirement.instruction}</p>
              ) : (
                ''
              )}
              <button
                className={`h-14 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-1 text-sm text-white shadow-2xl shadow-blue-500 focus:outline-none 
                active:bg-gray-300 disabled:from-cyan-900 disabled:to-blue-900`}
                onClick={() => {
                  handleSocialTask(data)
                  setLoading(true)
                  toast('Verification in Progress... Do Hold On')
                }}
              >
                {loading ? (
                  <Puff color="#fff" height={25} width={25} />
                ) : (
                  'Engage'
                )}
              </button>
            </>
          ) : (
            <Puff color="black" />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
