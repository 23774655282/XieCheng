import React from 'react'
import { useNavigate } from 'react-router-dom'
import Title from './Title'
import { exclusiveOffers } from '../assets/assets'

function ExclusiveOffer() {
    const navigate = useNavigate()

    return (
        <div className="flex flex-col items-center px-6 md:px-16 pt-12 md:pt-16 pb-24 md:pb-32 bg-gray-50">
            <div className="flex flex-col items-center md:flex-row justify-between w-full mb-8">
                <Title align="left" title="限时优惠" subtitle="获取最佳入住优惠与折扣！" />
            </div>
            <div className="w-full grid gap-8 md:grid-cols-2">
                {exclusiveOffers.map((items) => (
                    <div
                        key={items._id}
                        className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-2xl shadow-lg bg-cover bg-center min-h-[220px]"
                        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${items.image})` }}
                    >
                        <div className="flex flex-col items-center md:items-start">
                            <p className="text-3xl font-bold text-white drop-shadow mb-2">{items.priceOff}% 优惠</p>
                            <p className="text-xl font-semibold text-white drop-shadow mb-1">{items.title}</p>
                            <p className="text-white mb-2">{items.description}</p>
                            <p className="text-sm text-gray-200">截止日期：<span className="font-medium">{items.expiryDate}</span></p>
                        </div>
                        <button
                            type="button"
                            onClick={() => { navigate(`/rooms?promo=${items.priceOff}`); scrollTo(0, 0); }}
                            className="mt-4 md:mt-0 bg-white text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-2 rounded-full font-medium shadow transition-all duration-300"
                        >
                            查看优惠
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ExclusiveOffer
