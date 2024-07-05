import { navLinks } from '@/data/sample'

const BottomNav = ({ component, setComponent }) => {
  return (
    <nav className="absolute bottom-0 flex w-full justify-between bg-inherit px-5">
      {navLinks.map((link, index) => {
        const isActive = component === link.component
        const iconProps = {
          className: `${isActive ? 'fill-white' : 'fill-[#9E9E9E]'}`,
        }
        return (
          <div key={index} className="relative flex flex-col items-center">
            <button
              className={`relative z-10 flex flex-col items-center px-3 py-2  transition duration-300 ease-in-out focus:outline-none focus:ring-offset-[#AF955D] ${
                isActive ? 'font-semibold text-white' : 'text-white/50'
              }`}
              onClick={() => setComponent(link.component)}
            >
              {link.icon(iconProps)}
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
