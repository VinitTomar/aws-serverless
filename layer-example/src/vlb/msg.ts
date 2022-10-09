import { randomInt } from "crypto"

export function msg() {
  const num = randomInt(10);

  return `message from vlb layer index [${num}].`
}