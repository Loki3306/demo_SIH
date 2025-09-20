import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Shield, MapPin, Users, Zap } from "lucide-react";
import Hero3DGlobe from "./Hero3DGlobe";
import MapHero from "./MapHero";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    return !!gl && !!gl.getExtension;
  } catch {
    return false;
  }
}

function TypewriterText({ text, className = "" }: { text: string; className?: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return (
    <span className={className}>
      {displayedText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-0.5 h-8 bg-primary ml-1"
      />
    </span>
  );
}

function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

const quickStats = [
  { icon: Users, label: "Active Tourists", value: 12847, color: "text-blue-400" },
  { icon: Shield, label: "Safety Score", value: 94, color: "text-green-400" },
  { icon: MapPin, label: "Safe Zones", value: 127, color: "text-purple-400" },
  { icon: Zap, label: "Response Time", value: 2, color: "text-yellow-400", suffix: "min" },
];

export default function SafeHero() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-20 h-20 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 blur-xl"
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              delay: i * 0.5,
            }}
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
            }}
          />
        ))}
      </div>

  <div className="container mx-auto grid lg:grid-cols-2 gap-10 items-center py-8 md:py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Powered by AI & Blockchain</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              {isVisible ? (
                <>
                  <TypewriterText text="Travel with" className="block" />
                  <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Confidence
                  </span>
                  <span className="block text-3xl md:text-4xl font-bold text-foreground/80 mt-2">
                    Your Safety, Secured by India
                  </span>
                </>
              ) : (
                <span>Travel with Confidence. Your Safety, Secured by India.</span>
              )}
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg text-foreground/70 max-w-xl leading-relaxed"
          >
            YatraRakshak provides a secure Digital Tourist ID, backed by AI and Blockchain, 
            for a safer and smarter travel experience across India.
          </motion.p>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {quickStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur"
                >
                  <Icon className={`w-5 h-5 mb-2 ${stat.color}`} />
                  <div className="text-xl font-bold">
                    <AnimatedCounter end={stat.value} />
                    {stat.suffix && <span className="text-sm">{stat.suffix}</span>}
                  </div>
                  <div className="text-xs text-foreground/60">{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Enhanced CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-start gap-4"
          >
            <motion.a
              href="/tourist/dashboard"
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(99,102,241,0.6)" }}
              whileTap={{ scale: 0.95 }}
              className="group inline-flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300"
            >
              <Shield className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Get Started Now
            </motion.a>
            
            <motion.a
              href="/police/dashboard"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group inline-flex items-center gap-3 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 text-foreground/90 hover:text-primary font-semibold px-8 py-4 rounded-xl transition-all duration-300"
            >
              <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform" />
              View Live Data
            </motion.a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="text-sm text-foreground/60 flex items-center gap-2"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Supports English and Hindi • Real-time monitoring • 24/7 support
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="relative"
        >
          <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <MapHero />
            
            {/* Map overlay with live indicators */}
            <div className="absolute top-4 left-4 bg-black/30 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 text-white text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live Safety Map
              </div>
            </div>
            
            <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur rounded-lg p-3">
              <div className="text-white text-xs">
                <div>Active Tourists: <span className="font-bold text-green-400">1,247</span></div>
                <div>Safety Score: <span className="font-bold text-blue-400">94%</span></div>
              </div>
            </div>
          </div>
          
          {/* Floating elements around map */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -top-4 -right-4 w-16 h-16 bg-primary/20 rounded-full blur-xl"
          />
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-4 -left-4 w-12 h-12 bg-accent/20 rounded-full blur-xl"
          />
        </motion.div>
      </div>
    </section>
  );
}
