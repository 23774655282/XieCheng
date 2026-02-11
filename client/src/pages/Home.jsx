import React from 'react'
import Hero from '../components/Hero'
import FeaturedDestination from '../components/FeaturedDestination'
import ExclusiveOffer from '../components/ExclusiveOffer'

function Home() {
  return (
    <>
        <Hero/>
        <div className="w-full py-6 md:py-8" aria-hidden>
          <div className="h-px w-full max-w-4xl mx-auto bg-gradient-to-r from-transparent via-gray-300/70 to-transparent" />
        </div>
        <FeaturedDestination/>
        <div className="w-full py-6 md:py-8" aria-hidden>
          <div className="h-px w-full max-w-4xl mx-auto bg-gradient-to-r from-transparent via-gray-300/70 to-transparent" />
        </div>
        <ExclusiveOffer/>
    </>
  )
}

export default Home