const PLAN_RANK = {
  free: 0,
  normal: 1,
  silver: 2,
  gold: 3
};

function normalizePlan(plan) {
  const p = String(plan || "free").trim().toLowerCase();
  return p in PLAN_RANK ? p : "free";
}

function rank(plan) {
  return PLAN_RANK[normalizePlan(plan)] ?? 0;
}

function requiredPlanForFeature(featureName) {
  const f = String(featureName || "").trim().toLowerCase();

  // Keep feature visibility for all; only gate execution.
  if (f === "automation" || f === "run_ai_pipeline") return "gold";
  if (f === "portfolio_risk_analysis" || f === "analyze_portfolio") return "silver";
  if (f === "ai_advanced" || f === "ai_advisor_validated") return "silver";

  // By default, allow.
  return "free";
}

function canAccessFeature(featureName, userPlan) {
  const required = requiredPlanForFeature(featureName);
  return rank(userPlan) >= rank(required);
}

export { canAccessFeature, normalizePlan, requiredPlanForFeature };
