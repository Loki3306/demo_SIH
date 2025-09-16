import { UserPlus, ShieldCheck, MapPin, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: UserPlus,
    title: "Register & Submit KYC",
    description: "Create your profile and upload your Aadhaar or Passport for verification.",
    color: "from-blue-500 to-blue-600"
  },
  {
    icon: ShieldCheck,
    title: "AI-Powered Pre-Verification",
    description: "Our AI system conducts an initial check of your documents for authenticity.",
    color: "from-purple-500 to-indigo-600"
  },
  {
    icon: CheckCircle,
    title: "Authority Approval",
    description: "Your application is reviewed and approved by authorized government personnel.",
    color: "from-green-500 to-emerald-600"
  },
  {
    icon: MapPin,
    title: "Receive Your Digital ID",
    description: "Get your secure, blockchain-based Digital Tourist ID and travel with peace of mind.",
    color: "from-orange-500 to-red-500"
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="container mx-auto py-16 mobile-padding">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          How It Works
        </h2>
        <p className="text-foreground/70 max-w-2xl mx-auto text-lg">
          Get your secure Digital Tourist ID in just 4 simple steps
        </p>
      </motion.div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        {/* Connection lines for desktop */}
        <div className="hidden lg:block absolute top-20 left-0 right-0 mx-10 h-0.5 border-t-2 border-dotted border-foreground/20" aria-hidden />
        
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                delay: index * 0.2, 
                duration: 0.6,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
              className="group relative"
            >
              {/* Step number */}
              <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center z-10">
                {index + 1}
              </div>
              
              {/* Card */}
              <div className="card-mobile hover:bg-white/8 transition-all duration-300 h-full">
                {/* Icon with gradient background */}
                <div className={`p-4 rounded-xl bg-gradient-to-br ${step.color} text-white shadow-lg w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">{step.description}</p>
                </div>
                
                {/* Hover glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-300`} />
              </div>
              
              {/* Mobile connection indicator */}
              {index < steps.length - 1 && (
                <div className="lg:hidden flex justify-center mt-4 mb-4">
                  <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-transparent" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="text-center mt-12"
      >
        <motion.a
          href="/auth/register"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300"
        >
          <UserPlus className="w-5 h-5" />
          Start Your Registration
        </motion.a>
        <p className="text-sm text-foreground/60 mt-4">
          Join thousands of travelers who trust YatraRakshak for safe journeys
        </p>
      </motion.div>
    </section>
  );
}