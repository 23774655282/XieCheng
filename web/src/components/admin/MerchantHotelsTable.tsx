/**
 * 管理端 - 商户：我的酒店列表表格
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { merchantApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import StatusTag from './StatusTag';

export default function MerchantHotelsTable() {
  const { token } = useAuth();
  const [list, setList] = useState<{ id: string; nameZh: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchList = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await merchantApi.listHotels({ status: statusFilter || undefined }, token);
      if (res.code === 0 && res.data) {
        setList(res.data.list.map((h) => ({ id: h.id, nameZh: h.nameZh, status: h.status })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [token, statusFilter]);

  if (loading) return <p style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>加载中...</p>;

  return (
    <div className="merchant-hotels-table">
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span>状态筛选:</span>
        {['', 'draft', 'pending', 'approved', 'rejected', 'online', 'offline'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: 4,
              border: statusFilter === s ? '1px solid #1677ff' : '1px solid #ddd',
              background: statusFilter === s ? '#e6f4ff' : '#fff',
            }}
          >
            {s || '全部'}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>暂无酒店</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>酒店名</th>
              <th style={{ textAlign: 'left', padding: 8 }}>状态</th>
              <th style={{ textAlign: 'left', padding: 8 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{row.nameZh}</td>
                <td style={{ padding: 8 }}><StatusTag status={row.status} /></td>
                <td style={{ padding: 8 }}>
                  <Link to={`/admin/merchant/hotels/${row.id}/edit`} style={{ color: '#1677ff' }}>编辑</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
