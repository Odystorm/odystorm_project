import axios from 'axios'
import { useEffect, useState } from 'react'
import { Puff } from 'react-loader-spinner'

const Stats = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  async function getStats() {
    try {
      const response = await axios.get('/api/v1/stats')
      setStats(response.data)
      setLoading(false)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getStats()
  }, [])

  return (
    <div className="relative flex max-h-screen min-h-screen w-full flex-col items-center justify-start gap-y-3 p-5 text-white">
      <img
        src="/images/logo/logo.svg"
        className="animate h-[100px] w-[100px]"
        alt=""
      />
      <h3 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text font-orbitron text-4xl font-bold text-transparent shadow-blue-500 drop-shadow-2xl">
        Stats
      </h3>
      {!loading ? (
        <>
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-xl font-orbitron font-extrabold text-white">
              Total $ODY Mined
            </p>
            <span className="text-2xl font-orbitron">
              <span className="font-semibold">$ODY</span>{' '}
              {stats.totalMined.toLocaleString()}
            </span>
          </div>
          <div className="w-full border border-white"></div>
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-xl font-orbitron font-extrabold text-white">
             Total No. of Mine Sessions
            </p>
            <span className="font-orbitron text-2xl">
              {stats.noOfMineSessions.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-xl font-orbitron font-extrabold text-white">
              OdyStorm Army Total
            </p>
            <span className="font-orbitron text-2xl">
              {stats.armyTotal.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-xl font-orbitron font-extrabold text-white">
              Soldiers Reported Today
            </p>
            <span className="font-orbitron text-2xl">
              {stats.reportedToday.toLocaleString()}
            </span>
          </div>
        </>
      ) : (
        <Puff color="#fff" height={55} width={55} />
      )}
    </div>
  )
}

export default Stats
