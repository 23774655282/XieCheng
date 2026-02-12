import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Title from './Title';

function SmartSearch() {
  const { axios, navigate } = useAppContext();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const q = (query || '').trim();
    if (!q) {
      setError('请输入您的出行需求');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/rooms/smart-search', { query: q });
      if (data.success) {
        navigate('/rooms/smart-results', { state: { criteria: data.criteria, rooms: data.rooms || [], total: data.total } });
      } else {
        setError(data.message || '智能搜索失败，请重试');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col items-center px-6 py-16 bg-slate-50">
      <Title
        title="AI 智能搜索"
        subtitle="用一句话描述您的出行需求，例如：想去北京天安门，一男一女一个小朋友，玩三天，酒店预算2000元"
      />
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mt-8">
        <textarea
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError(''); }}
          placeholder="例如：我现在想去北京天安门旅游，一男一女一个小朋友，大约玩三天，酒店预算2000元，帮我找一下有哪些酒店符合要求的"
          className="w-full h-28 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full py-3 px-6 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'AI 正在理解您的需求…' : 'AI 帮我找酒店'}
        </button>
      </form>
    </section>
  );
}

export default SmartSearch;
