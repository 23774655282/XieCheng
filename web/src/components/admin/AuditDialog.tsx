/**
 * 管理端 - 审核详情（approve / reject(reason)）
 * 发布/下线/恢复 操作按钮（基于状态禁用）
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import StatusTag from './StatusTag';

interface AuditDialogProps {
  hotelId: string;
}

export default function AuditDialog({ hotelId }: AuditDialogProps) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<{
    nameZh: string;
    nameEn: string;
    address: string;
    star: number;
    status: string;
    roomTypes: { name: string; price: number }[];
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchHotel = async () => {
    if (!token) return;
    try {
      const res = await adminApi.getHotel(hotelId, token);
      if (res.code === 0 && res.data) {
        setHotel(res.data);
      }
    } catch {
      setError('加载失败');
    }
  };

  useEffect(() => {
    fetchHotel();
  }, [hotelId, token]);

  const doAction = async (fn: () => Promise<unknown>) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      await fn();
      await fetchHotel();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () =>
    doAction(() => adminApi.approve(hotelId, token!));

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setError('请填写驳回原因');
      return;
    }
    doAction(() => adminApi.reject(hotelId, rejectReason.trim(), token!)).then(() => {
      setShowRejectInput(false);
      setRejectReason('');
    });
  };

  const handlePublish = () => doAction(() => adminApi.publish(hotelId, token!));
  const handleOffline = () => doAction(() => adminApi.offline(hotelId, token!));
  const handleRestore = () => doAction(() => adminApi.restore(hotelId, token!));

  if (error && !hotel) return <p style={{ color: '#ff4d4f' }}>{error}</p>;
  if (!hotel) return <p style={{ color: '#999' }}>加载中...</p>;

  const { status } = hotel;

  return (
    <div className="audit-dialog" style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <div style={{ marginBottom: 16 }}>
        <h3>{hotel.nameZh}</h3>
        <p style={{ color: '#666' }}>{hotel.nameEn} · {hotel.address} · {hotel.star}星</p>
        <p>状态: <StatusTag status={status} /></p>
        {hotel.roomTypes?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <strong>房型：</strong>
            {hotel.roomTypes.map((r, i) => (
              <span key={i} style={{ marginRight: 12 }}>{r.name} ¥{r.price}</span>
            ))}
          </div>
        )}
      </div>

      {error && <p style={{ color: '#ff4d4f', marginBottom: 8 }}>{error}</p>}

      {showRejectInput ? (
        <div style={{ marginBottom: 16 }}>
          <textarea
            placeholder="请输入驳回原因"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleReject}
              disabled={loading}
              style={{ padding: 8, background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 6 }}
            >
              确认拒绝
            </button>
            <button
              type="button"
              onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
              style={{ padding: 8, background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 6 }}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {status === 'pending' && (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading}
                style={{ padding: 8, background: '#52c41a', color: '#fff', border: 'none', borderRadius: 6 }}
              >
                通过
              </button>
              <button
                type="button"
                onClick={() => setShowRejectInput(true)}
                disabled={loading}
                style={{ padding: 8, background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 6 }}
              >
                拒绝（填原因）
              </button>
            </>
          )}
          {status === 'approved' && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              style={{ padding: 8, background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6 }}
            >
              发布
            </button>
          )}
          {status === 'online' && (
            <button
              type="button"
              onClick={handleOffline}
              disabled={loading}
              style={{ padding: 8, background: '#faad14', color: '#fff', border: 'none', borderRadius: 6 }}
            >
              下线
            </button>
          )}
          {status === 'offline' && (
            <button
              type="button"
              onClick={handleRestore}
              disabled={loading}
              style={{ padding: 8, background: '#13c2c2', color: '#fff', border: 'none', borderRadius: 6 }}
            >
              恢复
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => navigate('/admin/audit/hotels')}
          style={{ padding: 8, background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 6 }}
        >
          返回列表
        </button>
      </div>
    </div>
  );
}
