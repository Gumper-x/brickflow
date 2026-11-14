export function createProgress(label, total) {
  let done = 0
  let lastLength = 0
  let finished = total === 0
  const width = 20
  const color = process.env.FORCE_COLOR
    ? process.env.FORCE_COLOR !== '0'
    : !process.env.NO_COLOR && process.stdout.isTTY
  const paint = (value, code) => (color ? `\u001b[${code}m${value}\u001b[0m` : value)

  function render() {
    const percent = total ? Math.round((done / total) * 100) : 100
    const filled = Math.round((percent * width) / 100)
    const line = `${paint('◆', '36')} ${label} ${paint('█'.repeat(filled), '36')}${paint('░'.repeat(width - filled), '90')} ${String(percent).padStart(3)}% ${done}/${total}`
    if (process.stdout.isTTY) {
      process.stdout.write(`\r${line}${' '.repeat(Math.max(0, lastLength - line.length))}`)
      lastLength = line.length
    } else if (done === total) {
      process.stdout.write(`${line}\n`)
    }
  }

  render()
  if (total === 0 && process.stdout.isTTY) {
    process.stdout.write('\n')
  }
  return {
    finish() {
      if (!finished && process.stdout.isTTY) {
        process.stdout.write('\n')
      }
      finished = true
    },
    tick() {
      done += 1
      if (process.stdout.isTTY || done === total) {
        render()
      }
      if (done === total && process.stdout.isTTY) {
        process.stdout.write('\n')
      }
      if (done === total) {
        finished = true
      }
    },
  }
}
