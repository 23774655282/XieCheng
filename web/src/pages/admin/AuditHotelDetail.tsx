/**
 * 管理端 - 管理员：审核详情
 * 路由: /admin/audit/hotels/:id
 * 审核通过/拒绝（填原因）、发布/下线/恢复
 */
import { useParams } from 'react-router-dom';
import AuditDialog from '../../components/admin/AuditDialog';
import './Audit.css';

export default function AuditHotelDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="page-audit">
      <header className="audit-header">
        <h1>审核详情</h1>
      </header>
      {id && <AuditDialog hotelId={id} />}
    </div>
  );
}
