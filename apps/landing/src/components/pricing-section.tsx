"use client"

import { useRef, useEffect, useState } from "react"
import { PropertyBookingCard } from "./property-booking-card"

const projects = [
  {
    propertyName: "Sunnyvale Solar Farm",
    location: "California, USA",
    duration: "Asset backed",
    availableDate: "15% Target Yield",
    image: "/images/solar-field.png",
    pricePerNight: 240,
    propertyType: "Utility Scale",
    features: ["Bifacial Panels", "Smart Tracking", "Grid-Scale Storage", "25yr PPA"],
    amenities: ["Tokenized", "Verified Data", "Insured"],
    rating: 4.9,
  },
  {
    propertyName: "Desert Star Array",
    location: "Arizona, USA",
    duration: "Asset backed",
    availableDate: "14.2% Target Yield",
    image: "/images/solar-field.png",
    pricePerNight: 185,
    propertyType: "Desert Solar",
    features: ["Heat Resistant", "Off-grid Ready", "Automated Cleaning", "Battery Backup"],
    amenities: ["Tokenized", "Verified Data", "Climate Bonds"],
    rating: 4.8,
  },
  {
    propertyName: "Blue Ridge Solar",
    location: "North Carolina, USA",
    duration: "Asset backed",
    availableDate: "13.5% Target Yield",
    image: "/images/solar-field.png",
    pricePerNight: 120,
    propertyType: "Community Solar",
    features: ["Local Grid Support", "Shared Savings", "Rooftop & Ground", "Microgrid Support"],
    amenities: ["Tokenized", "Verified Data", "Community Owned"],
    rating: 4.7,
  },
  {
    propertyName: "Canyon Peak Solar",
    location: "Colorado, USA",
    duration: "Asset backed",
    availableDate: "16% Target Yield",
    image: "/images/solar-field.png",
    pricePerNight: 350,
    propertyType: "Mountain Solar",
    features: ["Snow Clearance", "Tracking Mounts", "High Altitude Tech", "Industrial Capacity"],
    amenities: ["Tokenized", "Verified Data", "Green Tagged"],
    rating: 4.9,
  },
]

export function PricingSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const positionRef = useRef(0)
  const animationRef = useRef<number>()

  const duplicatedProjects = [...projects, ...projects, ...projects]

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    const speed = isHovered ? 0.3 : 1
    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      positionRef.current += speed * (deltaTime / 16)

      const totalWidth = scrollContainer.scrollWidth / 3

      if (positionRef.current >= totalWidth) {
        positionRef.current = 0
      }

      scrollContainer.style.transform = `translateX(-${positionRef.current}px)`
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isHovered])

  return (
    <section id="projects" className="py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 text-center mb-20">
        <h2 className="text-4xl md:text-5xl font-normal mb-6 text-balance font-sans">Featured Solar Projects</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Discover handpicked solar assets from verified developers. Invest with transparency.
        </p>
      </div>

      <div className="relative w-full" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <div ref={scrollRef} className="flex gap-6" style={{ width: "fit-content" }}>
          {duplicatedProjects.map((project, index) => (
            <div key={index} className="flex-shrink-0 w-[85vw] sm:w-[60vw] lg:w-[400px]">
              <PropertyBookingCard {...project} onBook={() => console.log(`Investing in ${project.propertyName}`)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
