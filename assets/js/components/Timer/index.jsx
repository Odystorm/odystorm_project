import { useState, useEffect } from 'react'

const Countdown = ({
  hours,
  increment,
  storeCountdown,
  setIsFarmingComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState(hours * 3600)
  const [startTime, setStartTime] = useState(Date.now())
  const [endTime, setEndTime] = useState(Date.now() + hours * 3600 * 1000)

  useEffect(() => {
    const savedData = window.localStorage.getItem('countdownData')
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
      window.localStorage.setItem('countdownData', JSON.stringify(data))
      storeCountdown(data)
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
  }, [hours, increment, endTime])

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const calculateScore = () => {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000)
    return elapsedTime * increment
  }

  const saveFinalScore = () => {
    const finalScore = calculateScore()
    const data = {
      startTime: new Date(startTime).toLocaleString(),
      endTime: new Date(endTime).toLocaleString(),
      hours,
      increment,
      savedScore: finalScore,
    }
    window.localStorage.setItem('countdownData', JSON.stringify(data))
    storeCountdown(data)
  }

  return (
    <div className="flex w-full items-center justify-between">
      <div>Farming $ODY {calculateScore() ? calculateScore() : 0}</div>
      <div>{timeLeft > 0 ? formatTime(timeLeft) : "Time's up!"}</div>
    </div>
  )
}

export default Countdown