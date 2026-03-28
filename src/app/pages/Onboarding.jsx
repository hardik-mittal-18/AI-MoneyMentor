import { useState } from "react";
import { useNavigate } from "react-router";
import { useFinance } from "../context/FinanceContext";
import { TrendingUp, ArrowRight, ArrowLeft, CheckCircle, Loader2, User, IndianRupee, Target } from "lucide-react";
const steps = [
  { id: 1, label: "Personal", icon: User },
  { id: 2, label: "Finances", icon: IndianRupee },
  { id: 3, label: "Goals", icon: Target }
];
function Onboarding() {
  const navigate = useNavigate();
  const { setUserData, setHasOnboarded } = useFinance();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    income: "",
    expenses: "",
    savings: "",
    goals: ""
  });
  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  const handleSubmit = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setUserData({ ...form });
      setHasOnboarded(true);
      navigate("/app/dashboard");
    }, 2800);
  };
  const isStepValid = () => {
    if (currentStep === 1) return form.name.trim().length > 0 && form.age.trim().length > 0;
    if (currentStep === 2) return form.income.trim().length > 0 && form.expenses.trim().length > 0 && form.savings.trim().length > 0;
    return true;
  };
  if (isAnalyzing) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
            <Loader2 className="w-9 h-9 text-white animate-spin" />
          </div>
          <h2 className="text-gray-900 mb-2" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Analyzing Your Finances</h2>
          <p className="text-gray-500 mb-8" style={{ fontSize: "0.95rem" }}>Our AI is processing your financial profile...</p>
          <div className="space-y-3 max-w-xs mx-auto">
            {[
      "Calculating Money Health Score",
      "Generating Investment Plan",
      "Building Wealth Projections"
    ].map((item, i) => <div key={item} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-600" style={{ fontSize: "0.875rem" }}>{item}</span>
              </div>)}
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {
    /* Logo */
  }
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
            <span className="text-gray-900">AI Money</span>
            <span className="text-blue-600">Mentor</span>
          </span>
        </div>

        {
    /* Progress Steps */
  }
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((step, i) => <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${step.id === currentStep ? "bg-blue-600 text-white shadow-md shadow-blue-200" : step.id < currentStep ? "bg-green-500 text-white" : "bg-white text-gray-400 border border-gray-200"}`}>
                {step.id < currentStep ? <CheckCircle className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{step.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 mx-1 ${step.id < currentStep ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>)}
        </div>

        {
    /* Card */
  }
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {currentStep === 1 && <div>
              <h2 className="text-gray-900 mb-1" style={{ fontWeight: 700, fontSize: "1.4rem" }}>Tell us about yourself</h2>
              <p className="text-gray-400 mb-7" style={{ fontSize: "0.9rem" }}>This helps us personalize your financial plan.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-gray-700 mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Full Name</label>
                  <input
    type="text"
    value={form.name}
    onChange={(e) => update("name", e.target.value)}
    placeholder="e.g. Arjun Sharma"
    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Age</label>
                  <input
    type="number"
    value={form.age}
    onChange={(e) => update("age", e.target.value)}
    placeholder="e.g. 28"
    min="18"
    max="70"
    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
  />
                </div>
              </div>
            </div>}

          {currentStep === 2 && <div>
              <h2 className="text-gray-900 mb-1" style={{ fontWeight: 700, fontSize: "1.4rem" }}>Your financial picture</h2>
              <p className="text-gray-400 mb-7" style={{ fontSize: "0.9rem" }}>All values in Indian Rupees (₹). Your data is 100% private.</p>
              <div className="space-y-5">
                {[
    { field: "income", label: "Monthly Income (\u20B9)", placeholder: "e.g. 80000" },
    { field: "expenses", label: "Monthly Expenses (\u20B9)", placeholder: "e.g. 45000" },
    { field: "savings", label: "Current Savings / Investments (\u20B9)", placeholder: "e.g. 200000" }
  ].map(({ field, label, placeholder }) => <div key={field}>
                    <label className="block text-gray-700 mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{label}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: "1rem" }}>₹</span>
                      <input
    type="number"
    value={form[field]}
    onChange={(e) => update(field, e.target.value)}
    placeholder={placeholder}
    className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
  />
                    </div>
                  </div>)}
              </div>
            </div>}

          {currentStep === 3 && <div>
              <h2 className="text-gray-900 mb-1" style={{ fontWeight: 700, fontSize: "1.4rem" }}>What are your goals?</h2>
              <p className="text-gray-400 mb-7" style={{ fontSize: "0.9rem" }}>Optional — helps our AI craft a more targeted plan.</p>
              <div>
                <label className="block text-gray-700 mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Financial Goals</label>
                <textarea
    value={form.goals}
    onChange={(e) => update("goals", e.target.value)}
    placeholder="e.g. Buy a house in 5 years, retire early by 50, fund my child's education..."
    rows={5}
    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 resize-none"
  />
              </div>
              <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-blue-700" style={{ fontSize: "0.85rem", fontWeight: 600 }}>🎯 Popular Goals</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["Buy a house", "Retire by 50", "Child's education", "Dream vacation", "Emergency fund"].map((goal) => <button
    key={goal}
    onClick={() => update("goals", form.goals ? `${form.goals}, ${goal}` : goal)}
    className="text-blue-600 border border-blue-200 bg-white px-3 py-1 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
    style={{ fontSize: "0.78rem", fontWeight: 500 }}
  >
                      + {goal}
                    </button>)}
                </div>
              </div>
            </div>}

          {
    /* Actions */
  }
          <div className="flex items-center justify-between mt-8">
            {currentStep > 1 ? <button
    onClick={handleBack}
    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-all"
    style={{ fontWeight: 500, fontSize: "0.9rem" }}
  >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button> : <div />}
            {currentStep < 3 ? <button
    onClick={handleNext}
    disabled={!isStepValid()}
    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-100"
    style={{ fontWeight: 600, fontSize: "0.9rem" }}
  >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button> : <button
    onClick={handleSubmit}
    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
    style={{ fontWeight: 600, fontSize: "0.9rem" }}
  >
                Analyze My Finances
                <ArrowRight className="w-4 h-4" />
              </button>}
          </div>
        </div>

        <p className="text-center text-gray-400 mt-5" style={{ fontSize: "0.8rem" }}>
          🔒 Your data is encrypted and never shared with third parties
        </p>
      </div>
    </div>;
}
export {
  Onboarding
};
