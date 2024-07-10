import { useEffect, useState, useCallback } from 'react'
import { createBoard } from '@/hooks/gameFunctions'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { motion } from 'framer-motion'

const width = 8
const dragonEggsColors = ['blue', 'green', 'orange', 'purple', 'red', 'yellow']

const ItemTypes = {
  EGG: 'egg',
}

const Play = () => {
  const board = createBoard()
  const [currentColorArrangement, setCurrentColorArrangement] = useState(board)

  const checkForColumnOfThree = useCallback(() => {
    for (let i = 0; i < 40; i++) {
      const columnOfThree = [i, i + width, i + 2 * width]
      const decidedColor = currentColorArrangement[i]

      if (
        decidedColor &&
        columnOfThree.every(
          (egg) => currentColorArrangement[egg] === decidedColor
        )
      ) {
        columnOfThree.forEach((egg) => {
          currentColorArrangement[egg] = ''
        })
        return true
      }
    }
    return false
  }, [currentColorArrangement])

  const checkForColumnOfFour = useCallback(() => {
    for (let i = 0; i < 32; i++) {
      const columnOfFour = [i, i + width, i + 2 * width, i + 3 * width]
      const decidedColor = currentColorArrangement[i]

      if (
        decidedColor &&
        columnOfFour.every(
          (egg) => currentColorArrangement[egg] === decidedColor
        )
      ) {
        columnOfFour.forEach((egg) => {
          currentColorArrangement[egg] = ''
        })
        return true
      }
    }
    return false
  }, [currentColorArrangement])

  const checkForColumnOfFive = useCallback(() => {
    for (let i = 0; i < 24; i++) {
      const columnOfFive = [
        i,
        i + width,
        i + 2 * width,
        i + 3 * width,
        i + 4 * width,
      ]
      const decidedColor = currentColorArrangement[i]

      if (
        decidedColor &&
        columnOfFive.every(
          (egg) => currentColorArrangement[egg] === decidedColor
        )
      ) {
        columnOfFive.forEach((egg) => {
          currentColorArrangement[egg] = ''
        })
        return true
      }
    }
    return false
  }, [currentColorArrangement])

  const checkForRowOfThree = useCallback(() => {
    for (let i = 0; i < 64; i++) {
      const rowOfThree = [i, i + 1, i + 2]
      const decidedColor = currentColorArrangement[i]

      if (
        i % width < width - 2 &&
        decidedColor &&
        rowOfThree.every((egg) => currentColorArrangement[egg] === decidedColor)
      ) {
        rowOfThree.forEach((egg) => {
          currentColorArrangement[egg] = ''
        })
        return true
      }
    }
    return false
  }, [currentColorArrangement])

  const checkForRowOfFour = useCallback(() => {
    for (let i = 0; i < 64; i++) {
      const rowOfFour = [i, i + 1, i + 2, i + 3]
      const decidedColor = currentColorArrangement[i]

      if (
        i % width < width - 3 &&
        decidedColor &&
        rowOfFour.every((egg) => currentColorArrangement[egg] === decidedColor)
      ) {
        rowOfFour.forEach((egg) => {
          currentColorArrangement[egg] = ''
        })
        return true
      }
    }
    return false
  }, [currentColorArrangement])

  const checkForRowOfFive = useCallback(() => {
    for (let i = 0; i < 64; i++) {
      const rowOfFive = [i, i + 1, i + 2, i + 3, i + 4]
      const decidedColor = currentColorArrangement[i]

      if (
        i % width < width - 4 &&
        decidedColor &&
        rowOfFive.every((egg) => currentColorArrangement[egg] === decidedColor)
      ) {
        rowOfFive.forEach((egg) => {
          currentColorArrangement[egg] = ''
        })
        return true
      }
    }
    return false
  }, [currentColorArrangement])

  const moveIntoSquareBelow = useCallback(() => {
    for (let i = width * width - 1; i >= 0; i--) {
      if (currentColorArrangement[i] === '') {
        if (i < width) {
          const randomColor =
            dragonEggsColors[
              Math.floor(Math.random() * dragonEggsColors.length)
            ]
          currentColorArrangement[i] = randomColor
        } else {
          currentColorArrangement[i] = currentColorArrangement[i - width]
          currentColorArrangement[i - width] = ''
        }
      }
    }
  }, [currentColorArrangement])

  const dragEnd = (squareBeingDraggedId, squareBeingReplacedId) => {
    const newColorArrangement = [...currentColorArrangement]
    newColorArrangement[squareBeingReplacedId] =
      currentColorArrangement[squareBeingDraggedId]
    newColorArrangement[squareBeingDraggedId] =
      currentColorArrangement[squareBeingReplacedId]

    const validMoves = [
      squareBeingDraggedId - 1,
      squareBeingDraggedId - width,
      squareBeingDraggedId + 1,
      squareBeingDraggedId + width,
    ]

    const validMove = validMoves.includes(squareBeingReplacedId)

    const isAColumnOfFive =
      checkForColumnOfFive() ||
      checkForColumnOfFour() ||
      checkForColumnOfThree()
    const isARowOfFive =
      checkForRowOfFive() || checkForRowOfFour() || checkForRowOfThree()

    if (
      squareBeingReplacedId &&
      validMove &&
      (isAColumnOfFive || isARowOfFive)
    ) {
      setCurrentColorArrangement(newColorArrangement)
    } else {
      setCurrentColorArrangement([...currentColorArrangement])
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      checkForColumnOfThree()
      checkForColumnOfFour()
      checkForColumnOfFive()
      checkForRowOfThree()
      checkForRowOfFour()
      checkForRowOfFive()
      moveIntoSquareBelow()
      setCurrentColorArrangement([...currentColorArrangement])
    }, 100)

    return () => clearInterval(timer)
  }, [
    currentColorArrangement,
    checkForColumnOfThree,
    checkForColumnOfFour,
    checkForColumnOfFive,
    checkForRowOfThree,
    checkForRowOfFour,
    checkForRowOfFive,
    moveIntoSquareBelow,
  ])

  const Square = ({ dragonEggColor, index }) => {
    const [{ isDragging }, drag] = useDrag({
      type: ItemTypes.EGG,
      item: { index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    })

    const [{ isOver }, drop] = useDrop({
      accept: ItemTypes.EGG,
      drop: (item) => {
        dragEnd(item.index, index)
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    })

    return (
      <motion.div
        ref={(node) => drag(drop(node))}
        key={index}
        className="h-[50px] w-[50px] rounded-md drop-shadow-md"
        style={{
          backgroundColor: dragonEggColor,
          opacity: isDragging ? 0.5 : 1,
        }}
        data-id={index}
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ duration: 1.25, ease: 'easeInOut' }}
      />
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mt-16 flex w-full justify-center">
        <div
          className="grid-rows-8 grid grid-cols-8 gap-1"
          style={{ width: '400px', height: '400px' }}
        >
          {currentColorArrangement.map((dragonEggColor, index) => {
            return (
              <Square
                key={index}
                dragonEggColor={dragonEggColor}
                index={index}
              />
            )
          })}
        </div>
      </div>
    </DndProvider>
  )
}

export default Play
