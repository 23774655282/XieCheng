/**
 * 管理端 - 商户：我的酒店列表
 * 路由: /admin/merchant/hotels
 * 查看草稿/审核中/驳回/已上线/已下线
 */
import { Link, useNavigate } from 'react-router-dom';
import MerchantHotelsTable from '../../components/admin/MerchantHotelsTable';
import { useAuth } from '../../context/AuthContext';
import './Merchant.css';

export default function MerchantHotels() {
  const navigate = useNavigate();
  const { logout, username } = useAuth();
  return (
    <div className="page-merchant">
      <header className="merchant-header">
        <h1>我的酒店</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {username && <span style={{ fontSize: 14, color: '#666' }}>{username}</span>}
          <Link to="/admin/merchant/hotels/new" className="btn-primary">
            新增酒店
          </Link>
          <button type="button" onClick={() => { logout(); navigate('/admin/login'); }} style={{ padding: '0.5rem 1rem', fontSize: 14 }}>
            退出
          </button>
        </div>
      </header>
      <MerchantHotelsTable />
    </div>
  );
}
