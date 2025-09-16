import { motion } from "framer-motion";
import { ArrowRight, Shield, Users, Zap, Heart } from "lucide-react";
import SafeHero from "@/components/SafeHero";
import StatsPanel from "@/components/StatsPanel";
import HowItWorks from "@/components/HowItWorks";
import SiteFooter from "@/components/SiteFooter";
import HeritageCarousel from "@/components/HeritageCarousel";
import IndianPatternBackground from "@/components/IndianPatternBackground";
import { useTranslation } from "react-i18next";

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
      className="group p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
    >
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/80 leading-relaxed">{description}</p>
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
      className="p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
    >
      <div className="mb-4">
        <Heart className="w-5 h-5 text-red-400 mb-2" />
        <p className="text-white/90 text-base leading-relaxed">"{quote}"</p>
      </div>
      <footer className="text-sm text-white/70">
        <div className="font-medium text-white/90">— {author}</div>
        <div>{role}</div>
      </footer>
    </motion.blockquote>
  );
}

export default function Index() {
  const { t } = useTranslation();
  const testimonials = t("testimonials.items", { returnObjects: true }) as Array<any>;
  const faqs = t("faq.items", { returnObjects: true }) as Array<any>;
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
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
                {t("hero.titlePrefix")} {" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t("hero.titleHighlight")}
                </span>
              </h1>
              <p className="text-lg text-white/85 leading-relaxed max-w-xl">{t("hero.description")}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <EnhancedCTAButton 
                href="/tourist/dashboard" 
                variant="primary"
                icon={Shield}
              >
                {t("cta.getStarted")}
              </EnhancedCTAButton>
              <EnhancedCTAButton 
                href="/police/dashboard" 
                variant="secondary"
                icon={Users}
              >
                {t("cta.viewLive")}
              </EnhancedCTAButton>
            </div>
            
              <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-sm text-white/70 flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {t("supportsLine")}
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
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-3">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{t("features.aiSafety.title")}</h3>
                  <p className="text-xs text-white/70 mt-1">{t("features.aiSafety.desc")}</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{t("features.instantAlerts.title")}</h3>
                  <p className="text-xs text-white/70 mt-1">{t("features.instantAlerts.desc")}</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{t("features.community.title")}</h3>
                  <p className="text-xs text-white/70 mt-1">{t("features.community.desc")}</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-3">
                    <Heart className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{t("features.cultural.title")}</h3>
                  <p className="text-xs text-white/70 mt-1">{t("features.cultural.desc")}</p>
                </motion.div>
              </div>
              
              {/* Live Statistics */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-white/90 font-medium">{t("live.statusLabel")}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">99.9%</div>
                    <div className="text-xs text-white/70">{t("live.uptime")}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">&lt; 2s</div>
                    <div className="text-xs text-white/70">{t("live.responseTime")}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Enhanced Trust Section */}
      <section className="bg-white/3 border-t border-white/6 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl text-white font-bold mb-4">{t("trust.title")}</h2>
            <p className="text-white/70 max-w-2xl mx-auto">{t("trust.subtitle")}</p>
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
      <section className="max-w-6xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
            <h2 className="text-3xl text-white font-bold mb-4">{t("testimonials.title")}</h2>
            <p className="text-white/70 max-w-2xl mx-auto">{t("testimonials.subtitle")}</p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((tItem, idx) => (
            <TestimonialCard
              key={idx}
              quote={tItem.quote}
              author={tItem.author}
              role={tItem.role}
              delay={idx * 0.1}
            />
          ))}
        </div>
      </section>

      {/* Enhanced FAQ Section */}
      <section className="bg-white/3 border-t border-white/6 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl text-white font-bold mb-4">{t("faq.title")}</h2>
            <p className="text-white/70">{t("faq.subtitle")}</p>
          </motion.div>
          
          <div className="space-y-6 text-white/90">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all duration-300"
              >
                <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                <p className="text-white/70 leading-relaxed">{faq.answer}</p>
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
