import React from 'react'

/** 基础骨架块：带脉冲动画 */
function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200/80 ${className}`}
      aria-hidden="true"
      {...props}
    />
  )
}

/** 骨架文本行 */
function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 && lines > 1 ? '75%' : '100%' }}
        />
      ))}
    </div>
  )
}

/** 酒店卡片骨架（用于 HotelCard、FeaturedDestination） */
function SkeletonHotelCard({ className = '' }) {
  return (
    <div className={`rounded-lg shadow-lg bg-white overflow-hidden h-full flex flex-col ${className}`}>
      <Skeleton className="w-full h-44 flex-shrink-0" />
      <div className="p-4 pt-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-full mb-3" />
        <div className="mt-auto pt-2 flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-24 rounded" />
        </div>
      </div>
    </div>
  )
}

/** 房间列表卡片骨架（用于 AllRooms 优惠房型） */
function SkeletonRoomCard({ className = '' }) {
  return (
    <div className={`flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm ${className}`}>
      <Skeleton className="w-full h-44" />
      <div className="p-5 flex flex-col flex-1">
        <Skeleton className="h-4 w-2/3 mb-2" />
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-14 rounded" />
        </div>
        <div className="mt-auto flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/** 酒店详情页骨架 */
function SkeletonHotelDetail() {
  return (
    <div className="pt-24 pb-16 px-4 md:px-8 lg:px-12 max-w-5xl mx-auto">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 w-16 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-6" />
      <Skeleton className="w-full h-64 md:h-96 rounded-xl mb-6" />
      <div className="space-y-4 mb-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="bg-white rounded-xl p-6 mb-6" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-12 w-64 rounded-lg" />
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>
      </div>
      <div className="mb-4">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 flex gap-4" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
              <Skeleton className="w-48 h-32 flex-shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex justify-between mt-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-9 w-20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 精选目的地区块骨架（3 张卡片） */
function SkeletonFeaturedDestination() {
  return (
    <div className="flex flex-col items-center px-6 md:px-16 bg-slate-50 py-12 md:py-14">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-start text-left mb-12 md:mb-16">
        <Skeleton className="h-9 md:h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-full min-h-[320px]">
            <SkeletonHotelCard />
          </div>
        ))}
      </div>
    </div>
  )
}

/** 房间列表骨架网格（用于 AllRooms 加载时） */
function SkeletonRoomGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRoomCard key={i} />
      ))}
    </div>
  )
}

/** 酒店列表行骨架（用于 AllRooms 非优惠模式） */
function SkeletonHotelRow() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm min-w-0">
      <div className="flex flex-row min-h-[133px] md:min-h-[360px] gap-3 md:gap-6 min-w-0">
        <Skeleton className="w-2/5 min-w-[100px] max-w-[200px] md:max-w-[280px] flex-shrink-0 rounded-l-2xl min-h-[133px] md:min-h-[360px]" />
        <div className="flex-1 flex flex-col min-w-0 p-3 md:p-6">
          <Skeleton className="h-6 md:h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-3 w-full mb-4" />
          <div className="border-t border-gray-50 pt-3 flex gap-2 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-28 md:w-44 h-20 flex-shrink-0 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 酒店列表骨架（用于 AllRooms 默认加载） */
function SkeletonHotelList({ count = 4 }) {
  return (
    <div className="space-y-8">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonHotelRow key={i} />
      ))}
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonHotelCard,
  SkeletonRoomCard,
  SkeletonHotelDetail,
  SkeletonFeaturedDestination,
  SkeletonRoomGrid,
  SkeletonHotelRow,
  SkeletonHotelList,
}
