/**
 * 管理端 - 审核不通过原因展示（仅 rejected 时显示）
 */
import { useEffect, useState } from 'react';
import { merchantApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface RejectReasonPanelProps {
  hotelId: string;
}

export default function RejectReasonPanel({ hotelId }: RejectReasonPanelProps) {
  const { token } = useAuth();
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    merchantApi
      .getHotel(hotelId, token)
      .then((res) => {
        if (res.code === 0 && res.data?.status === 'rejected' && res.data.rejectReason) {
          setReason(res.data.rejectReason);
        } else {
          setReason(null);
        }
      })
      .catch(() => setReason(null));
  }, [hotelId, token]);

  if (!reason) return null;

  return (
    <div
      className="reject-reason-panel"
      style={{ marginBottom: 12, padding: 8, background: '#fff2f0', borderRadius: 6, color: '#cf1322' }}
    >
      <strong>驳回原因：</strong>{reason}
    </div>
  );
}
