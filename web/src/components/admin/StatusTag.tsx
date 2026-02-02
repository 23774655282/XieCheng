/**
 * 管理端 - 酒店状态标签（draft/pending/approved/rejected/online/offline）
 */
import { useEffect, useState } from 'react';
import { merchantApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: '#999' },
  pending: { label: '审核中', color: '#faad14' },
  approved: { label: '已通过', color: '#52c41a' },
  rejected: { label: '已驳回', color: '#ff4d4f' },
  online: { label: '已上线', color: '#1677ff' },
  offline: { label: '已下线', color: '#999' },
};

interface StatusTagProps {
  hotelId?: string;
  status?: string;
}

export default function StatusTag({ hotelId, status: statusProp }: StatusTagProps) {
  const { token } = useAuth();
  const [status, setStatus] = useState(statusProp ?? '');

  useEffect(() => {
    if (statusProp) {
      setStatus(statusProp);
      return;
    }
    if (!hotelId || !token) return;
    merchantApi
      .getHotel(hotelId, token)
      .then((res) => {
        if (res.code === 0 && res.data) setStatus(res.data.status);
      })
      .catch(() => {});
  }, [hotelId, token, statusProp]);

  const info = STATUS_MAP[status] ?? { label: status || '-', color: '#999' };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.5rem',
        borderRadius: 4,
        fontSize: 12,
        background: `${info.color}20`,
        color: info.color,
      }}
    >
      {info.label}
    </span>
  );
}
