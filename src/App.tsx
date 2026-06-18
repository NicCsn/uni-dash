import { useState } from 'react'
import Sidebar from './components/Sidebar'
import type { Section } from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import Dashboard from './sections/Dashboard'
import Calendar from './sections/Calendar'
import Todos from './sections/Todos'
import Documents from './sections/Documents'
import QuickLinks from './sections/QuickLinks'
import Settings from './sections/Settings'

function App() {
  const [section, setSection] = useState<Section>('dashboard')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <Sidebar section={section} onNavigate={setSection} />
      <main className="flex-1 overflow-hidden">
        {section === 'dashboard' && <Dashboard onNavigate={setSection} />}
        {section === 'calendar' && <Calendar />}
        {section === 'todos' && <Todos />}
        {section === 'documents' && <Documents />}
        {section === 'links' && <QuickLinks />}
        {section === 'settings' && <Settings />}
      </main>
      <CommandPalette onNavigate={setSection} />
    </div>
  )
}

export default App
