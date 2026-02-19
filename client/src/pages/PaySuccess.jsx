import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export default function PaySuccess() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!bookingId || !token) {
      setStatus('error');
      setMessage('支付链接无效');
      return;
    }
    axios
      .post('/api/bookings/confirm-payment', { bookingId, token })
      .then(({ data }) => {
        if (data.success) {
          setStatus('success');
          setMessage(data.message || '付款成功');
        } else {
          setStatus('error');
          setMessage(data.message || '确认支付失败');
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || '网络错误，请重试');
      });
  }, [bookingId, token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      {status === 'loading' && (
        <div className="text-gray-600">正在确认支付…</div>
      )}
      {status === 'success' && (
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">付款成功</h1>
          <p className="mt-2 text-gray-600">{message}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">支付异常</h1>
          <p className="mt-2 text-gray-600">{message}</p>
        </div>
      )}
    </div>
  );
}
