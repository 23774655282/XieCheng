import React from 'react'
import Hero from '../components/Hero'
import HotCities from '../components/HotCities'
import FeaturedDestination from '../components/FeaturedDestination'
import ExclusiveOffer from '../components/ExclusiveOffer'

function Home() {
  return (
    <>
        <Hero/>
        <HotCities/>
        <div className="w-full py-2 md:py-3" aria-label="分隔线">
          <div className="h-px w-full max-w-4xl mx-auto bg-gray-200/60" />
        </div>
        <FeaturedDestination/>
        <ExclusiveOffer/>
    </>
  )
}

export default Home