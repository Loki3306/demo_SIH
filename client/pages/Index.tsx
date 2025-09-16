import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, Users, Zap, Heart } from "lucide-react";
import SafeHero from "@/components/SafeHero";
import StatsPanel from "@/components/StatsPanel";
import HowItWorks from "@/components/HowItWorks";
import SiteFooter from "@/components/SiteFooter";
import HeritageCarousel from "@/components/HeritageCarousel";
import IndianPatternBackground from "@/components/IndianPatternBackground";

function EnhancedCTAButton({ 
  href, 
  children, 
  variant = "primary", 
  icon: Icon 
}: { 
  href: string; 
  children: React.ReactNode; 
  variant?: "primary" | "secondary"; 
  icon?: any;
}) {
  const isPrimary = variant === "primary";
  
  return (
    <motion.a
      href={href}
      whileHover={{ 
        scale: 1.05, 
        boxShadow: isPrimary 
          ? "0 0 30px rgba(99,102,241,0.6)" 
          : "0 0 20px rgba(255,255,255,0.2)"
      }}
      whileTap={{ scale: 0.95 }}
      className={`group inline-flex items-center gap-3 font-semibold px-8 py-4 rounded-xl transition-all duration-300 ${
        isPrimary
          ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          : "border-2 border-primary/30 hover:border-primary hover:bg-primary/10 text-foreground/90 hover:text-primary"
      }`}
    >
      {Icon && <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />}
      {children}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </motion.a>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  delay = 0 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group p-6 rounded-xl bg-card/50 border border-border hover:bg-card/80 transition-all duration-300"
    >
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-foreground/80 leading-relaxed">{description}</p>
    </motion.div>
  );
}

function TestimonialCard({ 
  quote, 
  author, 
  role, 
  delay = 0 
}: { 
  quote: string; 
  author: string; 
  role: string; 
  delay?: number;
}) {
  return (
    <motion.blockquote
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className="p-6 rounded-xl bg-card/50 border border-border hover:bg-card/80 transition-all duration-300"
    >
      <div className="mb-4">
        <Heart className="w-5 h-5 text-red-400 mb-2" />
        <p className="text-foreground/90 text-base leading-relaxed">"{quote}"</p>
      </div>
      <footer className="text-sm text-muted-foreground">
        <div className="font-medium text-foreground/90">— {author}</div>
        <div>{role}</div>
      </footer>
    </motion.blockquote>
  );
}

export default function Index() {
  // Testimonials data (keep the same data; we will display more slots)
  const testimonials = [
    {
      quote:
        "The live map helped me choose safer routes every day — super handy and easy to use. I felt much more confident exploring new places.",
      author: "Asha",
      role: "International Tourist",
      date: "Jan 2025",
      location: "Mumbai",
      initials: "A",
    },
    {
      quote:
        "Local alerts were clear and timely — improved coordination for our team. The real-time updates made our response much more effective.",
      author: "Inspector R.",
      role: "Local Law Enforcement",
      date: "Mar 2025",
      location: "Delhi",
      initials: "IR",
    },
    {
      quote:
        "The bilingual labels are a lifesaver for communicating with locals. My clients love the cultural sensitivity and safety features.",
      author: "Marco",
      role: "Professional Tour Guide",
      date: "Feb 2025",
      location: "Goa",
      initials: "M",
    },
    {
      quote:
        "The panic button and quick-alert features gave my family peace of mind when we were traveling late at night. Truly thoughtful design.",
      author: "Priya",
      role: "Solo Traveler",
      date: "Apr 2025",
      location: "Kolkata",
      initials: "P",
    },
    {
      quote:
        "As a local business owner, the safety data helped us plan events more responsibly. It's a great community tool.",
      author: "Ramesh",
      role: "Event Organizer",
      date: "May 2025",
      location: "Pune",
      initials: "R",
    },
    {
      quote:
        "The app's offline caching and clear UI meant I could still guide tours in areas with flaky connectivity — huge win.",
      author: "Sofia",
      role: "Tour Operator",
      date: "Jun 2025",
      location: "Jaipur",
      initials: "S",
    },
  ];

  // Testimonial carousel state: active index (center starts at 1)
  const [activeIndex, setActiveIndex] = useState<number>(1);
  // direction: 1 => moving forward (next), -1 => moving backward (prev)
  const [direction, setDirection] = useState<number>(1);
  const intervalRef = useRef<number | null>(null);
  // Make expanded array derive from testimonials length so adding entries stays in sync
  const [expanded, setExpanded] = useState<boolean[]>(() => Array(testimonials.length).fill(false));

  const goNext = () => {
    setDirection(1);
    setActiveIndex((s) => (s + 1) % testimonials.length);
  };
  const goPrev = () => {
    setDirection(-1);
    setActiveIndex((s) => (s + testimonials.length - 1) % testimonials.length);
  };

  const resetInterval = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    // faster auto-rotate interval for snappier feel
    intervalRef.current = window.setInterval(goNext, 2200);
  };

  // Variants for whole-card enter/center/exit. custom={dir, mag, scale}
  const cardVariants = {
    enter: (c: any) => ({ opacity: 0, x: c.dir === 1 ? c.mag : -c.mag, scale: c.scale * 0.98 }),
    center: (c: any) => ({ opacity: 1, x: 0, scale: c.scale }),
    exit: (c: any) => ({ opacity: 0, x: c.dir === 1 ? -c.mag : c.mag, scale: c.scale * 0.98 }),
  };

  useEffect(() => {
    // start auto-rotate
  resetInterval();
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <main className="landing-hero-bg min-h-screen relative">
      <IndianPatternBackground />
      <div className="relative z-10">
        <SafeHero />

      {/* Enhanced Main CTA Section - No duplicate map */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto px-6 py-16"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight">
                Discover Safer Journeys —{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Explore Confidently
                </span>
              </h1>
              <p className="text-lg text-foreground/85 leading-relaxed max-w-xl">
                Real-time safety insights, localized advisories and trusted resources to help 
                travelers and communities make better decisions. Built for tourists, local responders and planners.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <EnhancedCTAButton 
                href="/tourist/dashboard" 
                variant="primary"
                icon={Shield}
              >
                Get Started
              </EnhancedCTAButton>
              <EnhancedCTAButton 
                href="/police/dashboard" 
                variant="secondary"
                icon={Users}
              >
                View Live Data
              </EnhancedCTAButton>
            </div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-sm text-muted-foreground flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Supports English and local languages — Real-time monitoring — 24/7 support
            </motion.p>
          </motion.div>
          
          {/* Replace map with feature highlights */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="space-y-6">
              {/* Safety Features Grid */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-xl bg-card/50 border border-border backdrop-blur"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-3">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">AI Safety Scoring</h3>
                  <p className="text-xs text-muted-foreground mt-1">Real-time risk assessment</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-xl bg-card/50 border border-border backdrop-blur"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Instant Alerts</h3>
                  <p className="text-xs text-muted-foreground mt-1">Emergency response system</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-xl bg-card/50 border border-border backdrop-blur"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Community Network</h3>
                  <p className="text-xs text-muted-foreground mt-1">Connected safety ecosystem</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-xl bg-card/50 border border-border backdrop-blur"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-3">
                    <Heart className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Cultural Guidance</h3>
                  <p className="text-xs text-muted-foreground mt-1">Local insights & tips</p>
                </motion.div>
              </div>
              
              {/* Live Statistics */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-card/60 to-card/30 border border-border backdrop-blur">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-foreground/90 font-medium">Live System Status</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">99.9%</div>
                    <div className="text-xs text-muted-foreground">Uptime</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">&lt; 2s</div>
                    <div className="text-xs text-muted-foreground">Response Time</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Enhanced Trust Section */}
      <section className="bg-muted/20 border-t border-border py-16">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl text-foreground font-bold mb-4">Why people trust us</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Trusted by thousands of travelers and supported by government authorities
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="Realtime Alerts"
              description="Stay informed with timely alerts and incident summaries curated from verified sources. Our AI-powered system ensures you get the most relevant safety information."
              delay={0}
            />
            <FeatureCard
              icon={Shield}
              title="Localized Guidance"
              description="Localized safety tips and language-aware labels make navigation easier for visitors. Experience India with confidence and cultural awareness."
              delay={0.1}
            />
            <FeatureCard
              icon={Users}
              title="Community Partnerships"
              description="We partner with local authorities and tourist bodies to keep info accurate and trustworthy. Official government backing ensures reliability."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials */}
      <section className="bg-gradient-to-br from-muted/10 to-muted/5 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl text-foreground font-bold mb-4">What travellers say</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Real experiences from tourists and responders using our platform
            </p>
          </motion.div>
          
          {/* Testimonial Carousel */}
          <div className="relative flex items-center justify-center">
            {/* Left Navigation Arrow */}
            <motion.button
              onClick={() => {
                goPrev();
                resetInterval();
              }}
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.95 }}
              className="absolute left-4 z-10 p-3 rounded-full bg-card/80 border border-border shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
              aria-label="Previous testimonial"
            >
              <ArrowRight className="w-6 h-6 text-foreground rotate-180" />
            </motion.button>

            {/* Testimonial Cards Container */}
            <div className="flex items-end justify-center gap-8 max-w-7xl mx-auto px-6 lg:px-8">
              {[-1,0,1].map((offset) => {
                const slotIndex = (activeIndex + offset + testimonials.length) % testimonials.length;
                const t = testimonials[slotIndex];
                const isCenter = offset === 0;

                return (
                  <motion.div
                    key={slotIndex}
                    layout
                    layoutId={`testimonial-${slotIndex}`}
                    initial={false}
                    animate={{ opacity: isCenter ? 1 : 0.94, scale: isCenter ? 1 : 0.96 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                    className={`relative will-change-transform ${isCenter ? 'bg-gradient-to-br from-card to-card/80 border-2 border-primary/20' : 'bg-card border border-border'} aspect-square w-64 sm:w-72 md:w-80 lg:w-80 rounded-2xl hover:shadow-2xl transition-all duration-200 ${isCenter ? 'shadow-xl z-20 p-6' : 'shadow-lg p-6'} backdrop-blur-sm flex`}
                  >
                    <div className="flex flex-col h-full justify-between w-full">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className={`rounded-full flex items-center justify-center text-primary font-bold ${isCenter? 'w-14 h-14 bg-primary/20' : 'w-12 h-12 bg-primary/20'}`}>{t.initials}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="flex text-yellow-400">{[1,2,3,4,5].map(i => <svg key={i} className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.897 4.665 24 6 15.596 0 9.748l8.332-1.73z"/></svg>)}</div>
                              <div className="text-xs text-muted-foreground">{t.date} • {t.location}</div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <blockquote className={`text-foreground/90 ${isCenter? 'text-base' : 'text-sm'} leading-relaxed mb-3`}>{expanded[slotIndex] ? t.quote : (t.quote.length > (isCenter?160:120) ? t.quote.slice(0,(isCenter?160:120)) + '...' : t.quote)}</blockquote>
                          <button className="text-sm text-primary font-medium" onClick={() => setExpanded(s => { const n = [...s]; n[slotIndex] = !n[slotIndex]; return n; })}>{expanded[slotIndex] ? 'Show less' : 'Read more'}</button>
                        </div>
                      </div>
                      <footer className="text-sm mt-4">
                        <div className="font-semibold text-foreground">{t.author}</div>
                        <div className="text-muted-foreground">{t.role}</div>
                      </footer>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Right Navigation Arrow */}
            <motion.button
              onClick={() => {
                goNext();
                resetInterval();
              }}
              whileHover={{ scale: 1.1, x: 2 }}
              whileTap={{ scale: 0.95 }}
              className="absolute right-4 z-10 p-3 rounded-full bg-card/80 border border-border shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
              aria-label="Next testimonial"
            >
              <ArrowRight className="w-6 h-6 text-foreground" />
            </motion.button>
          </div>

          {/* (Indicators removed as requested) */}
        </div>
      </section>
//hey
      {/* Enhanced FAQ Section */}
      <section className="bg-muted/20 border-t border-border py-16">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl text-foreground font-bold mb-4">Frequently asked questions</h2>
            <p className="text-muted-foreground">Everything you need to know about YatraRakshak</p>
          </motion.div>
          
          <div className="space-y-6 text-foreground/90">
            {[
              {
                question: "Is the data verified?",
                answer: "We aggregate from official sources and community reports; critical alerts are escalated through partner channels and verified by government authorities."
              },
              {
                question: "Can I contribute local updates?",
                answer: "Yes — community reporting tools are available in the app and reviewed before publish. We value local insights while maintaining data quality."
              },
              {
                question: "Which languages are supported?",
                answer: "English and Hindi for full interface, with local languages for place names. More languages planned based on demand and community feedback."
              },
              {
                question: "How secure is my data?",
                answer: "We use blockchain technology for identity verification and AI for anonymized safety scoring. Your personal data is encrypted and never shared without consent."
              }
            ].map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border hover:bg-muted/50 transition-all duration-300"
              >
                <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <StatsPanel />
      <HeritageCarousel />
      <HowItWorks />
      <SiteFooter />
      </div>
    </main>
  );
}
//heyyy