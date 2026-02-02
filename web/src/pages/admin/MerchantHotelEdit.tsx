/**
 * 管理端 - 商户：酒店编辑
 * 路由: /admin/merchant/hotels/:id/edit
 * 编辑并提交审核，可查看审核状态与不通过原因
 */
import { useParams, useNavigate } from 'react-router-dom';
import HotelForm from '../../components/admin/HotelForm';
import StatusTag from '../../components/admin/StatusTag';
import RejectReasonPanel from '../../components/admin/RejectReasonPanel';
import './Merchant.css';

export default function MerchantHotelEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/admin/merchant/hotels');
  };

  return (
    <div className="page-merchant">
      <header className="merchant-header">
        <h1>编辑酒店</h1>
      </header>
      {id && (
        <>
          <StatusTag hotelId={id} />
          <RejectReasonPanel hotelId={id} />
          <HotelForm hotelId={id} onSuccess={handleSuccess} />
        </>
      )}
    </div>
  );
}
