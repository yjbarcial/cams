const AUTH_KEYS = [
  'authToken',
  'isLoggedIn',
  'userEmail',
  'userId',
  'userRole',
  'accessRole',
  'user',
  'token',
]

const SESSION_MARKER = 'authSessionActive'

const removeAuthKeys = (storage) => {
  AUTH_KEYS.forEach((key) => storage.removeItem(key))
}

const removeSupabaseAuthKeys = (storage) => {
  Object.keys(storage)
    .filter((key) => /^sb-.+-auth-token$/.test(key))
    .forEach((key) => storage.removeItem(key))
}

export const markAuthSessionActive = () => {
  sessionStorage.setItem(SESSION_MARKER, 'true')
}

export const clearStoredAuth = () => {
  removeAuthKeys(localStorage)
  removeAuthKeys(sessionStorage)
  removeSupabaseAuthKeys(localStorage)
  removeSupabaseAuthKeys(sessionStorage)
  sessionStorage.removeItem(SESSION_MARKER)
}

export const clearPersistedAuthIfNeeded = () => {
  if (sessionStorage.getItem(SESSION_MARKER) === 'true') return

  removeAuthKeys(localStorage)
  removeSupabaseAuthKeys(localStorage)
}
