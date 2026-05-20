import { createContext, useContext, useState } from 'react'

interface UiContext {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const UiContext = createContext<UiContext>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
})

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <UiContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </UiContext.Provider>
  )
}

export const useUi = () => useContext(UiContext)
