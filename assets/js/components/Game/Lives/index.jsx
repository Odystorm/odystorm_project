import { FaHeart } from 'react-icons/fa'

const Lives = ({ noOfLives }) => {
  return (
    <div className="relative">
      <span className='absolute z-20 left-0 right-0 w-max text-xl font-bold'>{noOfLives}</span>
      <FaHeart className="text-5xl text-white drop-shadow-md" />
    </div>
  )
}

export default Lives
