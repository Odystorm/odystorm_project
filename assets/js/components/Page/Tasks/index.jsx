import axios from 'axios'
import { toast } from 'react-toastify'
import React, { useEffect, useState } from 'react'
import { Puff } from 'react-loader-spinner'
import TaskModal from '@/components/Modal/Task'

const tabs = [
  {
    title: 'Milestones',
  },
  {
    title: 'Earn',
  },
]

const Tasks = ({ wallet, user }) => {
  const [isTasksLoading, setIsTasksLoading] = useState(true)
  const [loadingTaskId, setLoadingTaskId] = useState('')
  const [tasks, setTasks] = useState([])
  const [selectedTab, setSelectedtab] = useState(tabs[0])
  const [selectedTask, setSelectedTask] = useState(null)
  const [openTaskModal, setOpenTaskModal] = useState(false)
  const [socialTasks, setSocialTasks] = useState([])

  async function getTasks() {
    try {
      const response = await axios.get(`user/tasks/${user.chatId}`)
      const sortedTasks = response?.data.sort(
        (a, b) => a.rewardAmount - b.rewardAmount
      )
      setTasks(() => {
        // Find All Unfinished Social Following and Ody Tasks
        // const unfinished = sortedTasks.filter(
        //   (task) =>
        //     (task.taskType === 'social_following' ||
        //       task.taskType === 'ody_tasks') &&
        //     task.status === 'eligible'
        // )

        // if (unfinished.length !== 0) {
        //   setTimeout(() => {
        //     toast(`You have ${unfinished.length} Unfinished Tasks`)
        //   }, 3000)
        // }

        return sortedTasks
      })

      setSocialTasks(() => {
        // Filter Out Social Tasks
        const socialTasks = sortedTasks.filter(
          (task) =>
            task.taskType === 'social_following' ||
            task.taskType === 'ody_tasks'
        )
        return socialTasks.sort((a, b) => {
          if (a.status === 'eligible' && b.status !== 'eligible') {
            return -1
          }
          if (a.status !== 'eligible' && b.status === 'eligible') {
            return 1
          }
          return 0
        })
      })
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
        toast("Verification Complete")
        setOpenTaskModal(false)
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

  return (
    <>
      <div className="scrollbar-custom relative flex h-[85dvh] w-full items-start justify-center overflow-y-scroll">
        <div className="flex flex-col items-center justify-center py-3">
          <img
            src="/images/logo/logo.svg"
            className="h-[90px] w-[90px] drop-shadow-lg"
            alt="OdyStorm Logo"
          />
          <div className="text-center">
            <h3 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text font-orbitron text-3xl font-bold text-transparent shadow-blue-500 drop-shadow-2xl">
              OdyStorm
              <br /> Mission Control
            </h3>
            <div className="px-2 text-white/70">
              <p className="font-orbitron">
                You'll be rewarded immediately with OdyStorm Tokens after each
                task completion.
              </p>
            </div>
          </div>
          <div className="mt-1 flex w-full items-center justify-center gap-x-3 font-orbitron text-white">
            {tabs.map((tab, index) => {
              return (
                <button
                  key={index}
                  onClick={() => setSelectedtab(tab)}
                  className={`text-2xl font-bold ${
                    selectedTab.title === tab.title
                      ? 'border-b-4 border-blue-500 shadow-2xl'
                      : ''
                  }`}
                >
                  {tab.title}
                </button>
              )
            })}
          </div>
          {isTasksLoading ? (
            <Puff color="#fff" height={50} width={50} />
          ) : (
            <div className="scrollbar-custom relative w-full overflow-y-auto px-2 py-5">
              {selectedTab.title === 'Milestones' ? (
                <>
                  {tasks.map((task, index) => {
                    if (task.taskType === 'milestone') {
                      return (
                        <React.Fragment key={index}>
                          <div className="flex w-full flex-row items-center justify-between gap-x-5 px-2 text-white">
                            <div className="flex items-center gap-x-5">
                              <div className="flex flex-col gap-y-1 ">
                                <span className="text-md">{task.title}</span>
                                <span className="font-orbitron text-sm font-medium text-white/50">
                                  +{task.rewardAmount.toLocaleString()} $ODY
                                </span>
                              </div>
                            </div>
                            {task.status !== 'done' && (
                              <button
                                className={`inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-1 text-sm text-white 
                shadow-2xl shadow-blue-500 focus:outline-none active:bg-gray-300 disabled:from-cyan-900 disabled:to-blue-900`}
                                key={index}
                                disabled={
                                  wallet.balance < task.requirement.mineTotal
                                }
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
                                className={`h-14 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-1 text-sm text-white shadow-2xl shadow-blue-500 focus:outline-none 
                active:bg-gray-300 disabled:from-cyan-900 disabled:to-blue-900`}
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
                </>
              ) : (
                <>
                  {' '}
                  {socialTasks.map((task, index) => {
                    return (
                      <React.Fragment key={index}>
                        <div className="flex w-full flex-row items-center justify-between gap-x-5 px-2 text-white">
                          <div className="flex items-center gap-x-5">
                            <div className="flex flex-col gap-y-1 ">
                              <span className="text-md font-semibold">
                                {task.title}
                              </span>
                              <span className="font-orbitron text-sm font-medium text-white/50">
                                +{task.rewardAmount.toLocaleString()} $ODY
                              </span>
                            </div>
                          </div>
                          {task.status !== 'done' && (
                            <button
                              className={`inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-1 text-sm text-white 
                  shadow-2xl shadow-blue-500 focus:outline-none active:bg-gray-300 disabled:from-cyan-900 disabled:to-blue-900`}
                              key={index}
                              disabled={
                                wallet.balance < task.requirement.mineTotal
                              }
                              onClick={() => {
                                if (task.requirement.isClicked) {
                                  collectMileStoneReward(task)
                                  return
                                }
                                setSelectedTask(task)
                                setOpenTaskModal(true)
                              }}
                            >
                              {loadingTaskId === task.id ? (
                                <Puff
                                  color="#fff"
                                  height={25}
                                  width={25}
                                  key={task.id}
                                />
                              ) : task.requirement.isClicked ? (
                                'Claim'
                              ) : (
                                'Start'
                              )}
                            </button>
                          )}

                          {task.status === 'done' && (
                            <button
                              className={`h-14 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-1 text-sm text-white shadow-2xl shadow-blue-500 focus:outline-none 
                active:bg-gray-300 disabled:from-cyan-900 disabled:to-blue-900`}
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
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {openTaskModal && (
        <TaskModal
          data={selectedTask}
          setOpenTaskModal={setOpenTaskModal}
          handleSocialTask={handleSocialTask}
        />
      )}
    </>
  )
}

export default Tasks
