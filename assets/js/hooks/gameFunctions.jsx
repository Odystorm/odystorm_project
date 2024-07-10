const width = 8
const dragonEggsColors = ['blue', 'green', 'orange', 'purple', 'red', 'yellow']

export const createBoard = () => {
  const randomColorArrangement = []
  for (let i = 0; i < width * width; i++) {
    const randomColor =
      dragonEggsColors[Math.floor(Math.random() * dragonEggsColors.length)]
    randomColorArrangement.push(randomColor)
  }

  return randomColorArrangement
}
