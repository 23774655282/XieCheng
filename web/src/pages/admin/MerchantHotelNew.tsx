/**
 * 管理端 - 商户：酒店录入（新建草稿）
 * 路由: /admin/merchant/hotels/new
 */
import { useNavigate } from 'react-router-dom';
import HotelForm from '../../components/admin/HotelForm';
import './Merchant.css';

export default function MerchantHotelNew() {
  const navigate = useNavigate();

  const handleSuccess = (id?: string) => {
    if (id) navigate(`/admin/merchant/hotels/${id}/edit`);
  };

  return (
    <div className="page-merchant">
      <header className="merchant-header">
        <h1>新增酒店</h1>
      </header>
      <HotelForm onSuccess={handleSuccess} />
    </div>
  );
}
