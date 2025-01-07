import c from "picocolors"

type LoggerLevel = "silent" | "warn"

class Logger {
  private level?: LoggerLevel

  setLevel(level: LoggerLevel) {
    this.level = level
  }

  info(...args: any[]) {
    if (this.level === "silent") return
    console.log(c.cyan("INFO"), ...args)
  }

  warn(...args: any[]) {
    if (this.level === "silent") return
    console.warn(c.yellow("WARN"), ...args)
  }
}

export const logger = new Logger()
