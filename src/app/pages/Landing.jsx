import { useNavigate } from "react-router";
import {
  TrendingUp,
  Brain,
  PiggyBank,
  MessageCircle,
  ChevronRight,
  Star,
  Shield,
  Zap,
  BarChart2,
  ArrowRight
} from "lucide-react";
const heroImg = "https://images.unsplash.com/photo-1762941177632-fe37c485c428?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjBpbnZlc3RtZW50JTIwZ3Jvd3RoJTIwd2VhbHRoJTIwbWFuYWdlbWVudHxlbnwxfHx8fDE3NzM5OTg4NDh8MA&ixlib=rb-4.1.0&q=80&w=1080";
const testimonial1Img = "https://images.unsplash.com/photo-1727875075949-8b36efd25260?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB5b3VuZyUyMHByb2Zlc3Npb25hbCUyMHNtaWxpbmclMjBjb25maWRlbnR8ZW58MXx8fHwxNzczOTk4ODUxfDA&ixlib=rb-4.1.0&q=80&w=200";
const testimonial2Img = "https://images.unsplash.com/photo-1771240730126-594a8ab66be1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB3b21hbiUyMHByb2Zlc3Npb25hbCUyMG9mZmljZSUyMHBvcnRyYWl0fGVufDF8fHx8MTc3Mzk5ODg1MXww&ixlib=rb-4.1.0&q=80&w=200";
const features = [
  {
    icon: Shield,
    title: "Money Health Score",
    desc: "Get a personalized score that reveals your true financial fitness across savings, debt, and investments.",
    color: "bg-blue-50 text-blue-600"
  },
  {
    icon: Brain,
    title: "AI Investment Planner",
    desc: "AI analyzes your income, expenses, and goals to craft a tailored investment plan just for you.",
    color: "bg-purple-50 text-purple-600"
  },
  {
    icon: PiggyBank,
    title: "Smart Budgeting",
    desc: "Auto-categorize spending, identify leaks, and discover where you can save more every month.",
    color: "bg-green-50 text-green-600"
  },
  {
    icon: MessageCircle,
    title: "AI Chat Advisor",
    desc: "Ask anything \u2014 from 'Can I afford a car?' to 'How do I retire early?' \u2014 and get instant AI answers.",
    color: "bg-orange-50 text-orange-600"
  }
];
const steps = [
  { num: "01", title: "Enter Your Details", desc: "Share your income, expenses, savings and financial goals in 2 minutes." },
  { num: "02", title: "AI Analyzes", desc: "Our AI engine processes your data and calculates your complete financial picture." },
  { num: "03", title: "Get Your Plan", desc: "Receive a personalized investment plan, budget breakdown, and actionable insights." }
];
const testimonials = [
  {
    name: "Rahul Mehta",
    role: "Software Engineer, Bangalore",
    img: testimonial1Img,
    text: "AI Money Mentor helped me go from saving \u20B95,000/month to \u20B925,000/month in just 3 months. The investment plan is spot on!",
    stars: 5
  },
  {
    name: "Priya Kapoor",
    role: "Marketing Manager, Mumbai",
    img: testimonial2Img,
    text: "The AI chat advisor is like having a CFO in your pocket. Got my financial health score up from 58 to 81 in 6 months.",
    stars: 5
  },
  {
    name: "Vikram Singh",
    role: "Startup Founder, Delhi",
    img: "https://ui-avatars.com/api/?name=Vikram+Singh&background=3B82F6&color=fff&size=80",
    text: "The dashboard charts are incredible. I finally understand where my money is going and how to make it work harder.",
    stars: 5
  }
];
function Landing() {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-white">
      {
    /* Navbar */
  }
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              <span className="text-gray-900">AI Money</span>
              <span className="text-blue-600">Mentor</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it Works", "Testimonials"].map((item) => <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="text-gray-500 hover:text-gray-800 transition-colors" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                {item}
              </a>)}
          </div>
          <button
    onClick={() => navigate("/register")}
    className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
    style={{ fontSize: "0.9rem", fontWeight: 600 }}
  >
            Get Started
          </button>
        </div>
      </nav>

      {
    /* Hero */
  }
      <section className="pt-28 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-6" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              <Zap className="w-3.5 h-3.5" />
              AI-Powered Financial Intelligence
            </div>
            <h1 className="text-gray-900 mb-4" style={{ fontSize: "2.8rem", fontWeight: 800, lineHeight: 1.15 }}>
              Your AI Financial Advisor for{" "}
              <span className="text-blue-600">Smarter Investing</span>
            </h1>
            <p className="text-gray-500 mb-8 max-w-lg" style={{ fontSize: "1.1rem", lineHeight: 1.7 }}>
              Plan, save, and grow your wealth with AI-powered insights. Get a personalized investment plan, track your money health, and chat with your AI advisor 24/7.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
    onClick={() => navigate("/register")}
    className="flex items-center gap-2 bg-blue-600 text-white px-7 py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
    style={{ fontWeight: 600, fontSize: "1rem" }}
  >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
    onClick={() => navigate("/login")}
    className="flex items-center gap-2 border border-gray-200 text-gray-700 px-7 py-3.5 rounded-xl hover:bg-gray-50 transition-all"
    style={{ fontWeight: 600, fontSize: "1rem" }}
  >
                View Demo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-6 mt-10">
              {[
    { label: "Users", val: "50K+" },
    { label: "Avg. Savings Increase", val: "3.2\xD7" },
    { label: "Health Score Improved", val: "87%" }
  ].map((stat) => <div key={stat.label}>
                  <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.4rem" }}>{stat.val}</p>
                  <p className="text-gray-400" style={{ fontSize: "0.78rem" }}>{stat.label}</p>
                </div>)}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl transform rotate-3 scale-95 opacity-60" />
            <img
    src={heroImg}
    alt="Financial growth"
    className="relative rounded-3xl w-full object-cover shadow-2xl"
    style={{ height: "420px" }}
  />
            {
    /* Floating cards */
  }
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <p className="text-gray-400 mb-1" style={{ fontSize: "0.75rem" }}>Money Health Score</p>
              <p className="text-blue-600" style={{ fontWeight: 800, fontSize: "1.6rem" }}>72<span className="text-gray-300 text-sm">/100</span></p>
              <div className="w-32 h-2 bg-gray-100 rounded-full mt-2">
                <div className="h-2 bg-blue-600 rounded-full" style={{ width: "72%" }} />
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>Monthly SIP</p>
              </div>
              <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.1rem" }}>₹24,500</p>
              <p className="text-green-500" style={{ fontSize: "0.75rem", fontWeight: 600 }}>+18% from last month</p>
            </div>
          </div>
        </div>
      </section>

      {
    /* Features */
  }
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-gray-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700 }}>
              Everything you need to master your finances
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto" style={{ fontSize: "1rem" }}>
              AI Money Mentor brings together the best of AI and personal finance to give you a complete financial co-pilot.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-gray-900 mb-2" style={{ fontWeight: 600, fontSize: "1rem" }}>{f.title}</h3>
                <p className="text-gray-500" style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>{f.desc}</p>
              </div>)}
          </div>
        </div>
      </section>

      {
    /* How it Works */
  }
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-gray-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700 }}>How it works</h2>
            <p className="text-gray-500" style={{ fontSize: "1rem" }}>Get your personalized financial plan in under 3 minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => <div key={step.num} className="relative text-center">
                {i < steps.length - 1 && <div className="hidden md:block absolute top-8 left-2/3 w-1/3 h-0.5 bg-blue-100" />}
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-200">
                  <span style={{ fontSize: "1.2rem", fontWeight: 700 }}>{step.num}</span>
                </div>
                <h3 className="text-gray-900 mb-2" style={{ fontWeight: 600, fontSize: "1.05rem" }}>{step.title}</h3>
                <p className="text-gray-500" style={{ fontSize: "0.875rem", lineHeight: 1.7 }}>{step.desc}</p>
              </div>)}
          </div>
        </div>
      </section>

      {
    /* Testimonials */
  }
      <section id="testimonials" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-gray-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700 }}>Loved by 50,000+ Indians</h2>
            <p className="text-gray-500" style={{ fontSize: "1rem" }}>Real stories from people who transformed their finances</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-600 mb-5" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t.name}</p>
                    <p className="text-gray-400" style={{ fontSize: "0.78rem" }}>{t.role}</p>
                  </div>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {
    /* CTA Banner */
  }
      <section className="py-20 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-white mb-4" style={{ fontSize: "2rem", fontWeight: 700 }}>
            Start your financial journey today
          </h2>
          <p className="text-blue-100 mb-8" style={{ fontSize: "1rem" }}>
            Join 50,000+ Indians who are already building wealth smarter with AI.
          </p>
          <button
    onClick={() => navigate("/onboarding")}
    className="bg-white text-blue-600 px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
    style={{ fontWeight: 700, fontSize: "1rem" }}
  >
            Analyze My Finances — It's Free
          </button>
        </div>
      </section>

      {
    /* Footer */
  }
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white" style={{ fontWeight: 700 }}>AI MoneyMentor</span>
              </div>
              <p style={{ fontSize: "0.85rem", lineHeight: 1.7 }}>
                India's smartest AI financial advisor for the modern investor.
              </p>
            </div>
            {[
    { title: "Product", links: ["Features", "Dashboard", "AI Advisor", "Reports"] },
    { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
    { title: "Legal", links: ["Privacy Policy", "Terms of Use", "Disclaimer"] }
  ].map((col) => <div key={col.title}>
                <h4 className="text-white mb-3" style={{ fontWeight: 600, fontSize: "0.9rem" }}>{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => <li key={link}>
                      <a href="#" className="hover:text-white transition-colors" style={{ fontSize: "0.85rem" }}>{link}</a>
                    </li>)}
                </ul>
              </div>)}
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p style={{ fontSize: "0.82rem" }}>© 2026 AI Money Mentor. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              <span className="text-blue-400" style={{ fontSize: "0.82rem", fontWeight: 500 }}>SEBI Registered Investment Advisor</span>
            </div>
          </div>
        </div>
      </footer>
    </div>;
}
export {
  Landing
};
