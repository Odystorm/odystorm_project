import { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'

const Countdown = ({
  hours,
  increment,
  storeCountdown,
  setIsFarmingComplete,
  username,
  farmId,
}) => {
  const [timeLeft, setTimeLeft] = useState(hours * 3600)
  const [startTime, setStartTime] = useState(Date.now())
  const [endTime, setEndTime] = useState(Date.now() + hours * 3600 * 1000)

  useEffect(() => {
    const savedData = window.localStorage.getItem(
      `${username}-${farmId}-countdownData`
    )
    if (savedData) {
      const { startTime, endTime } = JSON.parse(savedData)
      const currentTime = Date.now()
      const timeDiff = Math.floor((endTime - currentTime) / 1000)

      setStartTime(startTime)
      setEndTime(endTime)

      if (timeDiff > 0) {
        setTimeLeft(timeDiff)
      } else {
        setTimeLeft(0)
      }
    } else {
      const initialEndTime = Date.now() + hours * 3600 * 1000
      setStartTime(Date.now())
      setEndTime(initialEndTime)

      const data = {
        startTime: Date.now(),
        endTime: initialEndTime,
        hours,
        increment,
      }
      window.localStorage.setItem(
        `${username}-${farmId}-countdownData`,
        JSON.stringify(data)
      )
      // storeCountdown(data)
    }

    const interval = setInterval(() => {
      const currentTime = Date.now()
      const timeDiff = Math.floor((endTime - currentTime) / 1000)

      if (timeDiff >= 0) {
        setTimeLeft(timeDiff)
      } else {
        clearInterval(interval)
        saveFinalScore()
        setIsFarmingComplete(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [hours, increment, endTime, setIsFarmingComplete])

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const calculateCurrentScore = () => {
    const elapsedTimeInSeconds = hours * 3600 - timeLeft
    return elapsedTimeInSeconds * increment
  }

  const calculateScore = (incrementPerSecond, hours) => {
    const totalSeconds = hours * 3600
    return incrementPerSecond * totalSeconds
  }

  const saveFinalScore = () => {
    const finalScore = calculateScore(increment, hours)
    const data = {
      startTime: new Date(startTime).getTime(),
      endTime: new Date(endTime).getTime(),
      hours,
      increment,
      savedScore: finalScore,
    }

    window.localStorage.setItem(
      `${username}-${farmId}-countdownData`,
      JSON.stringify(data)
    )
    // storeCountdown(data)
  }

  return (
    <div className="flex w-full items-center justify-between">
      <div>
        Farming $ODY {calculateCurrentScore() ? calculateCurrentScore() : 0}
      </div>
      <div>{timeLeft > 0 ? formatTime(timeLeft) : "Time's up!"}</div>
    </div>
  )
}

export default Countdown
