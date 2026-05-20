/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api, type LoginResponse, type Usuario } from "./api"

type StoredSession = {
  token: string
  usuario: Usuario
  mustChangePassword: boolean
}

type AuthContextValue = {
  token: string | null
  usuario: Usuario | null
  mustChangePassword: boolean
  isBootstrapping: boolean
  login: (email: string, password: string) => Promise<LoginResponse>
  changePassword: (passwordActual: string, passwordNueva: string) => Promise<void>
  logout: () => Promise<void>
}

const STORAGE_KEY = "lab_inventory_session"
const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredSession(): StoredSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function writeStoredSession(session: StoredSession | null) {
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    const stored = readStoredSession()
    if (!stored?.token) {
      setIsBootstrapping(false)
      return
    }

    setToken(stored.token)
    setUsuario(stored.usuario)
    setMustChangePassword(stored.mustChangePassword)

    api
      .me(stored.token)
      .then((freshUser) => {
        setUsuario(freshUser)
        writeStoredSession({
          token: stored.token,
          usuario: freshUser,
          mustChangePassword: stored.mustChangePassword,
        })
      })
      .catch(() => {
        setToken(null)
        setUsuario(null)
        setMustChangePassword(false)
        writeStoredSession(null)
      })
      .finally(() => setIsBootstrapping(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password)
    setToken(response.token)
    setUsuario(response.usuario)
    setMustChangePassword(response.must_change_password)
    writeStoredSession({
      token: response.token,
      usuario: response.usuario,
      mustChangePassword: response.must_change_password,
    })
    return response
  }, [])

  const changePassword = useCallback(async (passwordActual: string, passwordNueva: string) => {
    if (!token || !usuario) {
      throw new Error("No hay sesión activa")
    }
    await api.cambiarPassword(token, passwordActual, passwordNueva)
    const updatedUser = { ...usuario, must_change_password: false }
    setUsuario(updatedUser)
    setMustChangePassword(false)
    writeStoredSession({
      token,
      usuario: updatedUser,
      mustChangePassword: false,
    })
  }, [token, usuario])

  const logout = useCallback(async () => {
    const activeToken = token
    setToken(null)
    setUsuario(null)
    setMustChangePassword(false)
    writeStoredSession(null)
    if (activeToken) {
      await api.logout(activeToken).catch(() => undefined)
    }
  }, [token])

  const value = useMemo(
    () => ({
      token,
      usuario,
      mustChangePassword,
      isBootstrapping,
      login,
      changePassword,
      logout,
    }),
    [changePassword, isBootstrapping, login, logout, mustChangePassword, token, usuario],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}
