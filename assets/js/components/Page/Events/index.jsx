import { motion } from 'framer-motion'

const Events = ({ noOfReferrals }) => {
  return (
    <section className="flex h-[680px] flex-col items-center justify-between p-2 text-center  text-white">
      <div>
        <h3 className="text-5xl font-bold">Invite Friends</h3>
        <p className="font-mono text-lg">
          You and your Dragon Quest Guild will receive Bonuses
        </p>
        <div className="mt-2 flex">
          <p>List of Your Friends ({noOfReferrals ? noOfReferrals : 0})</p>
        </div>
      </div>

      <motion.button className="rounded-lg bg-[#AF955D] px-4 py-3 text-lg font-semibold text-[#F5F5DC] transition-transform duration-150 hover:scale-105 active:scale-95 active:border-black active:bg-[#ceaf6d]">
        Invite a Friend
      </motion.button>
    </section>
  )
}

export default Events
