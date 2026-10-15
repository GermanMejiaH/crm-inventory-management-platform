import db from "../db.js"

export function findUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email)
}

export function updateUserPasswordByEmail(email, passwordHash) {
  const u = findUserByEmail(email)
  if (!u) return false
  db.prepare("UPDATE users SET passwordHash = ? WHERE email = ?").run(String(passwordHash), String(email))
  return true
}
