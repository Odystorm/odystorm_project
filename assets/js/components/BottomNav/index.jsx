import { motion } from 'framer-motion'
import { navLinks } from '@/data/sample'

const BottomNav = ({ component, setComponent }) => {
  return (
    <nav className="absolute bottom-0 flex w-full justify-between bg-white px-5 py-3">
      {navLinks.map((link, index) => {
        const isActive = component === link.component
        const iconProps = {
          className: `${isActive ? 'fill-white' : 'fill-black/80'}`,
        }
        return (
          <div key={index} className="relative flex flex-col items-center">
            {isActive && (
              <motion.div
                className="absolute inset-0 z-0 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500"
                layoutId="activeBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            )}
            <button
              className={`relative z-10 flex flex-col items-center px-3 py-2  transition duration-300 ease-in-out ${
                isActive ? 'font-semibold text-black' : 'text-black/50'
              }`}
              onClick={() => setComponent(link.component)}
            >
              {link.icon(iconProps)}
              <span
                className={`transition duration-500 ease-in-out ${
                  isActive ? 'text-white' : 'text-black/50'
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
