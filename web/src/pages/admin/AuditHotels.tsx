/**
 * 管理端 - 管理员：酒店审核列表
 * 路由: /admin/audit/hotels
 * 按状态筛选：pending / approved / online / offline
 */
import { useNavigate } from 'react-router-dom';
import AuditHotelsTable from '../../components/admin/AuditHotelsTable';
import { useAuth } from '../../context/AuthContext';
import './Audit.css';

export default function AuditHotels() {
  const navigate = useNavigate();
  const { logout, username } = useAuth();
  return (
    <div className="page-audit">
      <header className="audit-header">
        <h1>酒店审核</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {username && <span style={{ fontSize: 14, color: '#666' }}>{username}</span>}
          <button type="button" onClick={() => { logout(); navigate('/admin/login'); }} style={{ padding: '0.5rem 1rem', fontSize: 14 }}>
            退出
          </button>
        </div>
      </header>
      <AuditHotelsTable />
    </div>
  );
}
