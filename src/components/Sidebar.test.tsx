import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from './Sidebar'

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn().mockReturnValue('/mock/icon.png'),
}))

const defaultProps = {
  section: 'dashboard' as const,
  onNavigate: vi.fn(),
  appName: 'Uni Dash',
  iconPath: null as string | null,
  collapsed: false,
  onToggleCollapse: vi.fn(),
}

describe('Sidebar', () => {
  it('renders app name', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Uni Dash')).toBeInTheDocument()
  })

  it('renders all navigation items', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Todos')).toBeInTheDocument()
    expect(screen.getByText('Pomodoro')).toBeInTheDocument()
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Quick Links')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('calls onNavigate when clicking a nav item', () => {
    const onNav = vi.fn()
    render(<Sidebar {...defaultProps} onNavigate={onNav} />)
    fireEvent.click(screen.getByText('Todos'))
    expect(onNav).toHaveBeenCalledWith('todos')
  })

  it('shows initials when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />)
    expect(screen.getByText('UD')).toBeInTheDocument()
  })

  it('hides labels when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />)
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('calls onToggleCollapse when toggle button clicked', () => {
    const toggle = vi.fn()
    render(<Sidebar {...defaultProps} onToggleCollapse={toggle} />)
    const buttons = screen.getAllByRole('button')
    const toggleBtn = buttons[buttons.length - 1]
    fireEvent.click(toggleBtn)
    expect(toggle).toHaveBeenCalled()
  })

  it('shows custom icon when provided', () => {
    const { container } = render(<Sidebar {...defaultProps} iconPath="/path/to/icon.png" />)
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img?.getAttribute('src')).toBe('/mock/icon.png')
  })
})
