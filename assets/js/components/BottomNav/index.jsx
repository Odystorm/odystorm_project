import { navLinks } from '@/data/sample'
import { motion } from 'framer-motion'

const BottomNav = ({ component, setComponent }) => {
  return (
    <nav className="absolute bottom-5 left-0 right-0 z-10 mx-auto flex w-max items-baseline justify-center gap-x-3 rounded-lg bg-[#AF955D] p-2">
      {navLinks.map((link, index) => {
        const isActive = component === link.component
        return (
          <div key={index} className="relative flex flex-col items-center">
            {isActive && (
              <motion.div
                className="absolute inset-0 z-0 rounded-lg bg-[#000000]/75"
                layoutId="activeBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            )}
            <button
              className={`relative z-10 flex flex-col items-center px-3 py-2 font-MedievalSharp text-white/50 transition duration-300 ease-in-out ${
                isActive ? 'font-semibold text-white' : ''
              }`}
              onClick={() => setComponent(link.component)}
            >
              {link.icon}
              <span
                className={`transition duration-300 ease-in-out ${
                  isActive ? 'text-white' : 'text-white/50'
                }`}
              >
                {link.title}
              </span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}

export default BottomNav
