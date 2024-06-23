import { navLinks } from '@/data/sample'

const BottomNav = ({ component, setComponent }) => {
  return (
    <nav className="absolute bottom-5 left-0 right-0 z-10 mx-auto flex w-max items-baseline justify-center gap-x-3 rounded-lg bg-[#AF955D] p-2">
      {navLinks.map((link, index) => {
        return (
          <button
            key={index}
            className={`flex flex-col items-center px-3 py-2 font-MedievalSharp text-white/50 ${
              component === link.component
                ? 'rounded-lg bg-[#000000]/75 font-semibold text-white/100'
                : ''
            }`}
            onClick={() => setComponent(link.component)}
          >
            {link.icon}
            {link.title}
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
