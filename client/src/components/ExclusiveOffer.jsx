import React from 'react'
import Title from './Title'
import { exclusiveOffers } from '../assets/assets'

function ExclusiveOffer() {
    return (
        <div className="flex flex-col items-center px-6 md:px-16 pt-20 pb-30 bg-gray-50 min-h-screen">
            <div className="flex flex-col items-center md:flex-row justify-between w-full mb-8">
                <Title align="left" title="Exclusive Offers" subtitle="Get the best deals and discounts for your stay!" />
                <button className="mt-6 md:mt-0 hover:scale-105 transition-transform duration-300 hover:cursor-pointer">
                    <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300">
                        View Offers
                    </span>
                </button>
            </div>
            <div className="w-full grid gap-8 md:grid-cols-2">
                {exclusiveOffers.map((items) => (
                    <div
                        key={items._id}
                        className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-2xl shadow-lg bg-cover bg-center min-h-[220px]"
                        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${items.image})` }}
                    >
                        <div className="flex flex-col items-center md:items-start">
                            <p className="text-3xl font-bold text-white drop-shadow mb-2">{items.priceOff} % off</p>
                            <p className="text-xl font-semibold text-white drop-shadow mb-1">{items.title}</p>
                            <p className="text-white mb-2">{items.description}</p>
                            <p className="text-sm text-gray-200">Expiry Date: <span className="font-medium">{items.expiryDate}</span></p>
                        </div>
                        <button className="mt-4 md:mt-0 bg-white text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-2 rounded-full font-medium shadow transition-all duration-300">
                            View Offer
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ExclusiveOffer
