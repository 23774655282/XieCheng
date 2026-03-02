import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

const roomTypeToCn = { 'Single Bed': '单人间', 'Double Bed': '双人间', 'Luxury Room': '豪华房', 'Family Suite': '家庭套房' };
const getRoomTypeLabel = (roomType) => roomTypeToCn[roomType] || roomType;

const HISTORY_KEY = 'ai-hotel-chat-history';
const CURRENT_SESSION_KEY = 'ai-hotel-current-messages';
const MAX_HISTORY = 30;

function loadCurrentSession() {
  try {
    const raw = sessionStorage.getItem(CURRENT_SESSION_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveCurrentSession(msgs) {
  try {
    sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(msgs));
  } catch {}
}

const USAGE_GUIDE = [
  { title: '使用说明', content: '在下方输入框中用自然语言描述您的出行需求，AI 会理解并为您筛选符合条件的酒店房型。' },
  { title: '可以说些什么？', content: '例如：目的地（如北京、上海）、人数（几人、是否有儿童）、玩几天、酒店预算多少元等。' },
  { title: '示例', content: '「我想去北京天安门玩，一男一女一个小朋友，大约玩三天，酒店预算2000元，帮我找一下有哪些酒店符合要求」' },
  { title: '查看结果', content: 'AI 回复后会在对话中展示推荐房型，点击任意房型卡片可进入详情页进行预订。' },
];

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveToHistory(record) {
  const list = loadHistory();
  const next = [{ ...record, id: record.id || Date.now(), createdAt: record.createdAt || Date.now() }, ...list].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

/** 房型卡片组件：固定高度避免换一批时页面抖动 */
function RoomCard({ room, onRoomClick }) {
  return (
    <div
      onClick={() => onRoomClick(room._id)}
      className="flex flex-col h-[300px] bg-gray-50 rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-blue-200 transition cursor-pointer"
    >
      <img src={room.images?.[0]} alt="房间" className="w-full h-28 flex-shrink-0 object-cover" loading="lazy" decoding="async" />
      <div className="p-3 flex flex-col flex-1 min-h-0 overflow-hidden">
        <p className="font-semibold text-gray-800 text-sm truncate">{getRoomTypeLabel(room.roomType)}</p>
        {room.hotel && <p className="text-xs text-gray-500 truncate">{room.hotel.name} · {room.hotel.city}</p>}
        <div className="flex items-center justify-between mt-2 flex-shrink-0">
          <span className="text-sm font-bold text-gray-800">
            {(room.promoDiscount != null && room.promoDiscount > 0)
              ? Math.round(room.pricePerNight * (1 - room.promoDiscount / 100))
              : room.pricePerNight} 元/晚
          </span>
          <span className="text-xs text-blue-600">查看详情</span>
        </div>
        <div className="mt-2 h-20 flex-shrink-0 overflow-y-auto overflow-x-hidden bg-amber-50/80 px-2 py-1.5 rounded">
          {room.recommendationReason ? (
            <p className="text-xs text-amber-700 whitespace-pre-wrap break-words">{room.recommendationReason}</p>
          ) : (
            <span className="text-xs text-amber-700/50">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

const ROOMS_PER_BATCH = 3;

/** 从房间池中按批次取 3 个，不足时从头补足（轮流展示） */
function getDisplayRooms(rooms, batchIndex) {
  const total = rooms.length;
  if (total === 0) return [];
  const displayRooms = [];
  for (let i = 0; i < ROOMS_PER_BATCH; i++) {
    const idx = (batchIndex * ROOMS_PER_BATCH + i) % total;
    displayRooms.push(rooms[idx]);
  }
  return displayRooms;
}

/** 房型卡片网格（每次 3 个，轮流展示，换一批循环切换） */
const RoomGrid = React.memo(function RoomGrid({ rooms, batchIndex, onRoomClick, onRefreshBatch, totalRooms }) {
  const displayRooms = getDisplayRooms(rooms, batchIndex);

  if (displayRooms.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayRooms.map((room, i) => (
          <RoomCard key={`${room._id}-${batchIndex}-${i}`} room={room} onRoomClick={onRoomClick} />
        ))}
      </div>
      {totalRooms > 0 && (
        <button
          type="button"
          onClick={onRefreshBatch}
          className="mt-3 w-full py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          换一批
        </button>
      )}
    </div>
  );
});

/** 单条消息组件 */
const ChatMessage = React.memo(function ChatMessage({ msg, msgIndex, onRoomClick, onRefreshBatch }) {
  const batchIndex = msg.batchIndex ?? 0;
  const totalRooms = msg.rooms?.length ?? 0;
  const displayRooms = msg.rooms ?? [];

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        {msg.role === 'assistant' && displayRooms.length > 0 && (
          <RoomGrid
            rooms={displayRooms}
            batchIndex={batchIndex}
            totalRooms={totalRooms}
            onRoomClick={onRoomClick}
            onRefreshBatch={() => onRefreshBatch(msgIndex)}
          />
        )}
      </div>
    </div>
  );
});

function AiHotelChat() {
  const { axios, navigate } = useAppContext();
  const [currentMessages, setCurrentMessages] = useState(loadCurrentSession);
  const [history, setHistory] = useState(loadHistory);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const historyDropdownRef = useRef(null);
  const scrollParentRef = useRef(null);

  const messages = viewingRecord ? viewingRecord.messages : currentMessages;

  const handleRoomClick = useCallback((roomId) => {
    navigate(`/rooms/${roomId}`);
    window.scrollTo(0, 0);
  }, [navigate]);

  const handleRefreshBatch = useCallback((msgIndex) => {
    if (viewingRecord) {
      const next = [...viewingRecord.messages];
      const msg = next[msgIndex];
      if (msg && msg.rooms) {
        next[msgIndex] = { ...msg, batchIndex: (msg.batchIndex ?? 0) + 1 };
        const updatedRecord = { ...viewingRecord, messages: next };
        setViewingRecord(updatedRecord);
        const newHistory = history.map((r) => (r.id === viewingRecord.id ? updatedRecord : r));
        setHistory(newHistory);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory.slice(0, MAX_HISTORY)));
        } catch (_) {}
      }
    } else {
      setCurrentMessages((prev) => {
        const next = [...prev];
        const msg = next[msgIndex];
        if (msg && msg.rooms) {
          next[msgIndex] = { ...msg, batchIndex: (msg.batchIndex ?? 0) + 1 };
        }
        return next;
      });
    }
  }, [viewingRecord, history]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(e.target)) {
        setHistoryDropdownOpen(false);
      }
    }
    if (historyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [historyDropdownOpen]);

  useEffect(() => {
    if (!viewingRecord) saveCurrentSession(currentMessages);
  }, [currentMessages, viewingRecord]);

  useEffect(() => {
    if (messages.length > 0 && scrollParentRef.current) {
      scrollParentRef.current.scrollTo({ top: scrollParentRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  function getRecordTitle(msgs) {
    const firstUser = msgs.find((m) => m.role === 'user');
    const text = firstUser?.content?.trim() || '';
    return text.length > 18 ? text.slice(0, 18) + '…' : text || '未命名对话';
  }

  function handleSelectHistory(record) {
    setViewingRecord(record);
    setHistoryDropdownOpen(false);
  }

  function handleBackToCurrent() {
    setViewingRecord(null);
  }

  function handleNewChat() {
    setViewingRecord(null);
    setCurrentMessages([]);
    saveCurrentSession([]);
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = (input || '').trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setCurrentMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    const lastAssistant = [...currentMessages].reverse().find((m) => m.role === 'assistant' && m.criteria);
    const previousCriteria = lastAssistant ? lastAssistant.criteria : null;
    try {
      const { data } = await axios.post('/api/rooms/smart-search', { query: text, previousCriteria: previousCriteria || undefined });
      if (data.success) {
        const criteria = data.criteria || {};
        const rooms = data.rooms || [];
        const guestText = criteria.children > 0 ? `${criteria.adults} 成人 ${criteria.children} 儿童` : `${criteria.adults} 人`;
        const summary = [
          criteria.destination && `目的地：${criteria.destination}`,
          `人数：${guestText}`,
          criteria.roomType && `房型：${getRoomTypeLabel(criteria.roomType)}`,
          `入住：${criteria.nights || 1} 晚`,
          criteria.budget > 0 ? `预算：${criteria.budget} 元` : null,
        ].filter(Boolean).join(' · ');
        const content = rooms.length > 0
          ? `根据您的要求（${summary}）为您找到以下房型，点击卡片可查看详情并预订：`
          : `根据您的要求（${summary}）暂未找到符合条件的房型，可尝试放宽预算或更换目的地。`;
        const assistantMsg = { role: 'assistant', content, criteria, rooms, batchIndex: 0 };
        setCurrentMessages((prev) => {
          const next = [...prev, assistantMsg];
          saveToHistory({ title: getRecordTitle(next), messages: next });
          setHistory(loadHistory());
          return next;
        });
      } else {
        const errMsg = { role: 'assistant', content: data.message || '请求失败，请重试。', criteria: null, rooms: null };
        setCurrentMessages((prev) => [...prev, errMsg]);
      }
    } catch (err) {
      const errMsg = { role: 'assistant', content: err.response?.data?.message || err.message || '网络错误，请稍后重试。', criteria: null, rooms: null };
      setCurrentMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 pt-16">
      {/* 占一行的栏：左上角标题 + 历史对话 + 新对话 */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
        <h1 className="text-base font-semibold text-gray-800 truncate">易宿酒店预订平台AI助手</h1>
        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="relative" ref={historyDropdownRef}>
            <button
              type="button"
              onClick={() => setHistoryDropdownOpen((v) => !v)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              历史对话
            </button>
            {historyDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {history.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-gray-400">暂无历史记录</p>
                ) : (
                  <ul className="py-1">
                    {history.map((record) => (
                      <li key={record.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectHistory(record)}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            viewingRecord?.id === record.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          title={record.title}
                        >
                          <span className="block truncate">{record.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5">
            <button
              type="button"
              onClick={handleNewChat}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              新对话
            </button>
          </span>
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
      {/* 左侧：使用说明 + 历史记录 */}
      <aside className="hidden lg:flex lg:flex-col w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden">
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          <h2 className="text-lg font-semibold text-gray-800">AI 选酒店</h2>
          {USAGE_GUIDE.map((item, i) => (
            <div key={i}>
              <h3 className="text-sm font-medium text-gray-700 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.content}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-800 mb-3">历史对话</h3>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {history.length === 0 ? (
              <li className="text-sm text-gray-400 py-2">暂无历史记录</li>
            ) : (
              history.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectHistory(record)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg truncate transition-colors ${
                      viewingRecord?.id === record.id ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={record.title}
                  >
                    {record.title}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>

      {/* 右侧：对话区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {viewingRecord && (
          <div className="flex-shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <span className="text-sm text-amber-800">正在查看历史记录</span>
            <button type="button" onClick={handleBackToCurrent} className="text-sm font-medium text-amber-700 hover:text-amber-900">
              返回当前对话
            </button>
          </div>
        )}
        <div ref={scrollParentRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6">
          <div className="max-w-2xl mx-auto">
            {!viewingRecord && currentMessages.length === 0 && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md px-6 py-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-3">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-3">欢迎使用 AI 酒店助手</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    我是您的智能酒店预订助手，可以用自然语言理解您的出行需求，为您推荐最合适的酒店房型。
                  </p>
                  <div className="text-left space-y-2 text-sm text-gray-500">
                    <p className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>告诉我您的目的地、人数、天数、预算等信息</span>
                    </p>
                    <p className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>我会智能理解并为您筛选符合条件的酒店</span>
                    </p>
                    <p className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>支持多轮对话，随时补充或修改需求</span>
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400">试试说：「我想去北京玩三天，两个人，预算1500元」</p>
                  </div>
                </div>
              </div>
            )}
            {messages.length > 0 && (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className="pb-4">
                    <ChatMessage
                      msg={msg}
                      msgIndex={i}
                      onRoomClick={handleRoomClick}
                      onRefreshBatch={handleRefreshBatch}
                    />
                  </div>
                ))}
              </div>
            )}
            {loading && (
              <div className="flex justify-start pt-2">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-500 text-sm">
                  AI 正在为您筛选…
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
          <form onSubmit={handleSend} className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={viewingRecord ? '请先点击「返回当前对话」再发送' : '描述您的出行需求，例如：想去北京玩三天，两人，预算1500元'}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              disabled={loading || !!viewingRecord}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !!viewingRecord}
              className="px-5 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发送
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}

export default AiHotelChat;
