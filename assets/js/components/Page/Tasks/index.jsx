import axios from 'axios'
import { toast } from 'react-toastify'
import React, { useEffect, useState } from 'react'
import { Puff } from 'react-loader-spinner'

const Tasks = ({ wallet, user }) => {
  const [isTasksLoading, setIsTasksLoading] = useState(true)
  const [loadingTaskId, setLoadingTaskId] = useState('')
  const [tasks, setTasks] = useState([])

  async function getTasks() {
    try {
      const response = await axios.get(`user/tasks/${user.chatId}`)
      setTasks(response.data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsTasksLoading(false)
    }
  }

  async function handleSocialTask(task) {
    const link = task.requirement.url
    setLoadingTaskId(task.id)
    try {
      // @todo Open Task Link
      window.open(link)
      // @todo Register Clicked Request
      await axios.post('/user/task/social', {
        telegramId: user.chatId,
        claimedTask: task,
      })

      setTimeout(() => {
        getTasks()
        setLoadingTaskId('')
      }, 15000)
    } catch (error) {
      console.error(error)
    }
  }

  async function collectMileStoneReward(task) {
    setLoadingTaskId(task.id)
    try {
      await axios.post(`/user/tasks/claim`, {
        telegramId: user.chatId,
        claimedTask: task,
      })

      getTasks()
      toast('Successfully Claimed Reward')
    } catch (error) {
      console.error(error)
      toast('There was a problem claiming your tokens, please try again later')
    } finally {
      setLoadingTaskId('')
    }
  }

  useEffect(() => {
    getTasks()
  }, [])

  // useEffect(() => {
  //   if(tasks.length > 0){
  //     tasks.forEach(task => {
  //       if(task.taskType === "social_following"){

  //       }
  //     })
  //   }
  // }, [])

  return (
    <div className="relative flex max-h-fit w-full items-center justify-center overflow-y-scroll">
      {/* <div className='absolute top-0 left-0 h-[100dvh] w-full bg-black'>
        <h3>Feature is Currently Undergoing Development</h3>
      </div> */}
      <div className="mt-5 flex flex-col items-center justify-center overflow-y-auto py-3">
        <img
          src="/images/logo/logo.svg"
          className="h-[90px] w-[90px] drop-shadow-lg"
          alt="OdyStorm Logo"
        />
        <div className="text-center">
          <h3 className=" bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text font-orbitron text-3xl font-bold text-transparent shadow-blue-500 drop-shadow-2xl">
            OdyStorm
            <br /> Mission Control
          </h3>
          <div className="px-2 text-white/50">
            <p className="">
              You'll be rewarded immediately with OdyStorm Tokens after each
              task completion.
            </p>
          </div>
        </div>
        {isTasksLoading ? (
          <Puff color="#fff" height={50} width={50} />
        ) : (
          <div className="mb-[3rem] max-h-[500px] w-full space-y-5 px-2">
            {tasks.map((task, index) => {
              if (task.taskType === 'social_following') {
                return (
                  <React.Fragment key={index}>
                    <div className="flex w-full flex-row justify-between gap-x-5 px-2 text-white">
                      <div className="flex items-center gap-x-5">
                        {/* <div>{task.icon(iconProps)}</div> */}
                        <div className="flex flex-col gap-y-1 ">
                          <span className="text-md">{task.title}</span>
                          <span className="font-orbitron text-sm font-medium text-white/50">
                            +{task.rewardAmount.toLocaleString()} $ODY
                          </span>
                        </div>
                      </div>
                      {task.taskType === 'social_following' &&
                        task.status !== 'done' && (
                          <button
                            className={`to-blue-500active:bg-gray-300 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-1 text-sm 
                          text-white shadow-2xl shadow-blue-500 focus:outline-none disabled:from-cyan-900 disabled:to-blue-900`}
                            key={index}
                            disabled={
                              wallet.balance < task.requirement.mineTotal
                            }
                            onClick={() => {
                              if (task.requirement.isClicked) {
                                collectMileStoneReward(task)
                                return
                              }

                              handleSocialTask(task)
                            }}
                          >
                            {loadingTaskId === task.id ? (
                              <Puff
                                color="#fff"
                                height={25}
                                width={25}
                                key={task.id}
                              />
                            ) : !task.requirement.isClicked ? (
                              'Join'
                            ) : (
                              'Claim'
                            )}
                          </button>
                        )}

                      {task.status === 'done' && (
                        <button
                          className={`to-blue-500active:bg-gray-300 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-1 text-sm text-white shadow-2xl shadow-blue-500 
                          focus:outline-none disabled:from-cyan-900 disabled:to-blue-900`}
                        >
                          Completed
                        </button>
                      )}
                    </div>
                    {index < tasks.length - 1 && (
                      <hr className="my-5 border-t border-gray-500" />
                    )}
                  </React.Fragment>
                )
              }
            })}

            {tasks.map((task, index) => {
              if (task.taskType === 'milestone') {
                return (
                  <React.Fragment key={index}>
                    <div className="flex w-full flex-row justify-between gap-x-5 px-2 text-white">
                      <div className="flex items-center gap-x-5">
                        {/* <div>{task.icon(iconProps)}</div> */}
                        <div className="flex flex-col gap-y-1 ">
                          <span className="text-md">{task.title}</span>
                          <span className="font-orbitron text-sm font-medium text-white/50">
                            +{task.rewardAmount.toLocaleString()} $ODY
                          </span>
                        </div>
                      </div>
                      {task.status !== 'done' && (
                        <button
                          className={`to-blue-500active:bg-gray-300 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-1 text-sm 
                          text-white shadow-2xl shadow-blue-500 focus:outline-none disabled:from-cyan-900 disabled:to-blue-900`}
                          key={index}
                          disabled={wallet.balance < task.requirement.mineTotal}
                          onClick={() => collectMileStoneReward(task)}
                        >
                          {loadingTaskId === task.id ? (
                            <Puff
                              color="#fff"
                              height={25}
                              width={25}
                              key={task.id}
                            />
                          ) : (
                            'Claim'
                          )}
                        </button>
                      )}

                      {task.status === 'done' && (
                        <button
                          className={`to-blue-500active:bg-gray-300 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-1 text-sm text-white shadow-2xl shadow-blue-500 
                          focus:outline-none disabled:from-cyan-900 disabled:to-blue-900`}
                        >
                          Completed
                        </button>
                      )}
                    </div>
                    {index < tasks.length - 1 && (
                      <hr className="my-5 border-t border-gray-500" />
                    )}
                  </React.Fragment>
                )
              }
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Tasks
