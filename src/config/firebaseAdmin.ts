import admin from "firebase-admin"
import fs from "fs"
import path from "path"

type ServiceAccountRaw = {
  project_id?: string
  client_email?: string
  private_key?: string
}

function normalizeServiceAccount(raw: ServiceAccountRaw, sourceLabel: string): admin.ServiceAccount {
  if (!raw.project_id || !raw.client_email || !raw.private_key) {
    throw new Error(`${sourceLabel} is missing required Firebase service account fields.`)
  }

  return {
    projectId: raw.project_id,
    clientEmail: raw.client_email,
    privateKey: raw.private_key.replace(/\\n/g, "\n"),
  }
}

function readServiceAccountFromEnv(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) return null

  const parsed = JSON.parse(raw) as ServiceAccountRaw
  return normalizeServiceAccount(parsed, "FIREBASE_SERVICE_ACCOUNT_JSON")
}

function readServiceAccountFromFile(): admin.ServiceAccount | null {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const filePath = configuredPath
    ? path.resolve(configuredPath)
    : path.resolve(process.cwd(), "gcp-key.json")

  if (!fs.existsSync(filePath)) return null

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as ServiceAccountRaw
  return normalizeServiceAccount(parsed, `Service account file (${filePath})`)
}

function loadServiceAccount(): admin.ServiceAccount {
  const fromEnv = readServiceAccountFromEnv()
  if (fromEnv) return fromEnv

  const fromFile = readServiceAccountFromFile()
  if (fromFile) return fromFile

  throw new Error(
    "Firebase Admin credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.",
  )
}

let initialized = false

export function getFirebaseAdminAuth() {
  if (!initialized) {
    const serviceAccount = loadServiceAccount()

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })

    initialized = true
  }

  return admin.auth()
}
