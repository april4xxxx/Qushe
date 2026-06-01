import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '今日', icon: '◉' },
  { to: '/kanban', label: '看板', icon: '▦' },
  { to: '/calendar', label: '日历', icon: '▤' },
  { to: '/panorama', label: '全景', icon: '✦' },
  { to: '/chat', label: '对话', icon: '◎' },
  { to: '/settings', label: '设置', icon: '⚙' },
]

export function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-lg px-6 pb-6">
        <div className="flex items-center justify-around rounded-full bg-espresso/90 backdrop-blur-xl px-2 py-2.5 shadow-[0_8px_32px_rgba(26,22,20,0.15)]">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-full px-3.5 py-2 font-sans text-[11px] tracking-wide transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  isActive
                    ? 'bg-cream/15 text-cream font-medium'
                    : 'text-warm-gray-light/60 hover:text-cream/80'
                }`
              }
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
