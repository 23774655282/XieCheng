import { CiCircleList } from 'react-icons/ci'
import { MdDashboardCustomize } from 'react-icons/md'
import { IoClose } from 'react-icons/io5'
import { NavLink } from 'react-router-dom'

function SideBar({ open, onClose, className = '' }) {
  const SideBarLinks = [
    { name: '仪表盘', path: '/owner', icon: <MdDashboardCustomize size={20} /> },
    { name: '酒店信息', path: '/owner/hotel-info', icon: <CiCircleList size={20} /> },
  ]

  return (
    <>
      {/* 移动端遮罩 */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      {/* 侧栏：移动端为抽屉，桌面端常驻 */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-64 max-w-[85vw] bg-gray-200 p-4 shadow-xl z-50 flex flex-col transition-transform duration-200 ease-out md:static md:top-0 md:left-auto md:bottom-auto md:!translate-x-0 md:!max-w-none md:w-64 md:shrink-0 md:self-stretch md:min-h-0 ${className || ''} ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="flex items-center justify-between mb-4 md:mb-2">
          <span className="text-gray-600 font-medium text-sm md:block md:mb-2">菜单</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-300 md:hidden"
            aria-label="关闭菜单"
          >
            <IoClose size={22} />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {SideBarLinks.map((link, idx) => (
            <NavLink
              to={link.path}
              key={idx}
              end={link.path === '/owner'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg min-h-[44px] transition-colors duration-200 ${
                  isActive ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-300 active:bg-gray-400'
                }`
              }
            >
              {link.icon}
              <span className="text-sm font-medium">{link.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default SideBar
