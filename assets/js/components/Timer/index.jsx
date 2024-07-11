import { useState, useEffect } from 'react'

const Countdown = ({ startTime, endTime, increment, setIsFarmingComplete }) => {
  const calculateTimeLeft = () => Math.floor((endTime - Date.now()) / 1000)

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft())
  const [currentScore, setCurrentScore] = useState(0)

  useEffect(() => {
    // Initialize the countdown once the component mounts
    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      const currentTime = Date.now()
      const timeDiff = calculateTimeLeft()

      if (timeDiff >= 0) {
        setTimeLeft(timeDiff)
        const elapsedTimeInSeconds = Math.floor(
          (currentTime - startTime) / 1000
        )

        if (!isNaN(elapsedTimeInSeconds) && !isNaN(increment)) {
          setCurrentScore(elapsedTimeInSeconds * increment)
        }
      } else {
        setTimeLeft(0) // Ensure timeLeft is set to 0 to prevent negative values
        clearInterval(interval)
        setIsFarmingComplete(true) // Trigger farming complete
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [endTime, increment, startTime, setIsFarmingComplete])

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex w-full items-center justify-between">
      <div>Farming $ODY {currentScore}</div>
      <div>{timeLeft > 0 ? formatTime(timeLeft) : "Time's up!"}</div>
    </div>
  )
}

export default Countdown
