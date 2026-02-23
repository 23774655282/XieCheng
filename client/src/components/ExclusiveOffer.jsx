import React from 'react'
import { useNavigate } from 'react-router-dom'
import { exclusiveOffers } from '../assets/assets'

function ExclusiveOffer() {
    const navigate = useNavigate()

    return (
        <div className="flex flex-col items-center px-6 md:px-16 pt-12 md:pt-16 pb-24 md:pb-32 bg-gray-50">
            <div className="w-full max-w-6xl mx-auto flex flex-col items-start text-left mb-8">
                <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-gray-800" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  限时优惠
                </h2>
                <p className="text-gray-600 mt-2 text-sm md:text-base tracking-wide">获取最佳入住优惠与折扣！</p>
            </div>
            <div className="w-full max-w-6xl mx-auto grid gap-8 md:grid-cols-2">
                {exclusiveOffers.map((items) => (
                    <button
                        key={items._id}
                        type="button"
                        onClick={() => { navigate(`/rooms?promo=${items.priceOff}`); scrollTo(0, 0); }}
                        className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-2xl shadow-lg min-h-[220px] overflow-hidden cursor-pointer group text-left w-full"
                    >
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110"
                            style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${items.image})` }}
                        />
                        <div className="relative z-10 flex flex-col items-center md:items-start">
                            <p className="text-3xl font-bold text-white drop-shadow mb-2">{items.priceOff}% 优惠</p>
                            <p className="text-xl font-semibold text-white drop-shadow mb-1">{items.title}</p>
                            <p className="text-white mb-2">{items.description}</p>
                            <p className="text-sm text-gray-200">截止日期：<span className="font-medium">{items.expiryDate}</span></p>
                        </div>
                        <span className="relative z-10 shrink-0 whitespace-nowrap mt-4 md:mt-0 bg-white text-black group-hover:bg-black group-hover:text-white px-6 py-2 rounded-full font-medium shadow transition-all duration-300">
                            查看优惠
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default ExclusiveOffer
