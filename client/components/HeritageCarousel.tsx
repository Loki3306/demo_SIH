import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Calendar, Users } from "lucide-react";

interface HeritagePlace {
  id: string;
  name: string;
  location: string;
  heritage: string;
  description: string;
  yearBuilt: string;
  visitors: string;
  image: string;
  significance: string;
}

const heritagePlaces: HeritagePlace[] = [
  {
    id: "1",
    name: "Taj Mahal",
    location: "Agra, Uttar Pradesh",
    heritage: "UNESCO World Heritage Site",
    description: "An ivory-white marble mausoleum commissioned by Mughal emperor Shah Jahan as a tomb for his beloved wife Mumtaz Mahal. A symbol of eternal love and architectural marvel.",
    yearBuilt: "1632-1653",
    visitors: "6-8 million annually",
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&h=400&fit=crop",
    significance: "Symbol of love, Mughal architecture masterpiece"
  },
  {
    id: "2", 
    name: "Red Fort",
    location: "Delhi",
    heritage: "UNESCO World Heritage Site",
    description: "A historic fortified palace that served as the main residence of the Mughal emperors. Known for its impressive red sandstone walls and Indo-Islamic architecture.",
    yearBuilt: "1638-1648",
    visitors: "2-3 million annually", 
  image: "https://img.freepik.com/premium-photo/red-red-fort-delhi-image_181020-130.jpg?semt=ais_incoming&w=740&q=80",
    significance: "Symbol of Mughal power, Independence Day venue"
  },
  {
    id: "3",
    name: "Hawa Mahal",
    location: "Jaipur, Rajasthan", 
    heritage: "Cultural Heritage Monument",
    description: "Palace of Winds with distinctive pink sandstone facade featuring 953 small windows. Built for royal women to observe street festivals while remaining unseen.",
    yearBuilt: "1799",
    visitors: "1.5 million annually",
    image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&h=400&fit=crop",
    significance: "Rajputana architecture, women's liberation symbol"
  },
  {
    id: "4",
    name: "Gateway of India",
    location: "Mumbai, Maharashtra",
    heritage: "National Monument",
    description: "An arch monument built to commemorate the visit of King George V and Queen Mary. Iconic symbol of Mumbai and witness to India's colonial history.",
    yearBuilt: "1924",
    visitors: "3-4 million annually",
  image: "https://media.gettyimages.com/id/532038517/photo/gateway-to-india.jpg?s=612x612&w=0&k=20&c=tXI2DM5RotXKph1JX7gfbRevVjMuNfFWD5tch6WnolY=",
    significance: "Colonial heritage, Mumbai's iconic landmark"
  },
  {
    id: "5",
    name: "Mysore Palace",
    location: "Mysore, Karnataka",
    heritage: "Cultural Heritage Palace",
    description: "Official residence of the Wadiyar dynasty and seat of the Kingdom of Mysore. Known for its Indo-Saracenic architecture and magnificent Dussehra celebrations.",
    yearBuilt: "1912",
    visitors: "6 million annually",
  image: "https://www.savaari.com/blog/wp-content/uploads/2024/01/Mysore_Palace_with_Gardens-1.webp",
    significance: "Royal heritage, architectural fusion, cultural festivals"
  },
  {
    id: "6",
    name: "Qutub Minar",
    location: "Delhi",
    heritage: "UNESCO World Heritage Site", 
    description: "A 73-meter tall tapering tower of victory, built of red sandstone and marble. Represents the beginning of Muslim rule in India and Indo-Islamic architecture.",
    yearBuilt: "1192-1220",
    visitors: "1.5 million annually",
  image: "https://www.vacationindia.com/wp-content/uploads/2022/05/50-qutub-minar-complex-new-delhi.jpg",
    significance: "Islamic architecture, victory monument, cultural synthesis"
  }
];

export default function HeritageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  // direction: 1 = next (enter from right), -1 = prev (enter from left)
  const [direction, setDirection] = useState(1);

  // Auto-slide functionality
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % heritagePlaces.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % heritagePlaces.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + heritagePlaces.length) % heritagePlaces.length);
  };

  const goToSlide = (index: number) => {
    if (index === currentIndex) return;
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  return (
    <section className="py-16 bg-gradient-to-b from-background/50 to-background/30">
      <div className="container mx-auto mobile-padding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Discover India's Heritage
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto text-lg">
            Explore magnificent monuments that tell the story of India's rich cultural legacy
          </p>
        </motion.div>

        <div 
          className="relative max-w-6xl mx-auto"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          {/* Main carousel container */}
          <div className="relative h-96 md:h-[500px] overflow-hidden rounded-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: direction > 0 ? 300 : -300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -300 : 300 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <div className="grid md:grid-cols-2 h-full bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
                  {/* Image Section */}
                  <div className="relative overflow-hidden">
                    <motion.img
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.3 }}
                      src={heritagePlaces[currentIndex].image}
                      alt={heritagePlaces[currentIndex].name}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: 'center 45%' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <div className="flex items-center gap-2 text-sm bg-black/40 text-white px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                        <MapPin className="w-4 h-4" />
                        <span>{heritagePlaces[currentIndex].location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6 md:p-8 flex flex-col justify-center space-y-4">
                    <div className="space-y-2">
                      <div className="inline-block px-3 py-1 bg-primary/20 text-primary text-xs rounded-full border border-primary/30">
                        {heritagePlaces[currentIndex].heritage}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                        {heritagePlaces[currentIndex].name}
                      </h3>
                    </div>

                    <p className="text-foreground/80 leading-relaxed line-clamp-4">
                      {heritagePlaces[currentIndex].description}
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center gap-6 text-sm text-foreground/70">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{heritagePlaces[currentIndex].yearBuilt}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{heritagePlaces[currentIndex].visitors}</span>
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-foreground/60 mb-1">Cultural Significance</div>
                        <div className="text-sm text-foreground/90">{heritagePlaces[currentIndex].significance}</div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="self-start px-6 py-2 bg-white/60 backdrop-blur-sm text-primary rounded-lg font-medium border-2 border-primary transition-all duration-200 hover:shadow-md"
                    >
                      Explore More
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full text-primary shadow-lg border border-white/30 transition-all duration-200 hover:scale-105"
            aria-label="Previous heritage site"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full text-primary shadow-lg border border-white/30 transition-all duration-200 hover:scale-105"
            aria-label="Next heritage site"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-6 gap-2">
            {heritagePlaces.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? "bg-primary scale-125" 
                    : "bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Auto-play indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-white/70">
            <div className={`w-2 h-2 rounded-full ${isAutoPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <span>{isAutoPlaying ? 'Auto-playing' : 'Paused'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}