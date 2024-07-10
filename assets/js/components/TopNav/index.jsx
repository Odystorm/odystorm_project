import Lives from '../Game/Lives'
import Settings from './Settings'
import Wallet from './Wallet'
import Profile from './Profile'

const TopNav = () => {
  const handleClick = () => {}

  return (
    <nav className="flex h-16 w-full justify-center bg-[#AF955D] drop-shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <Profile />
          <Settings />
        </div>
        <div>
          <Wallet onClick={handleClick} />
        </div>
      </div>
    </nav>
  )
}

export default TopNav
