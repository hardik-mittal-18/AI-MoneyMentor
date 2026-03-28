import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
function onlyDigits(value) {
  return (value || "").replace(/\D/g, "");
}
function formatSeconds(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
function validateExpiry(expiry) {
  const cleaned = expiry.trim();
  const match = cleaned.match(/^\s*(\d{2})\s*\/\s*(\d{2})\s*$/);
  if (!match) return "Expiry must be MM/YY";
  const mm = Number(match[1]);
  const yy = Number(match[2]);
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) return "Expiry month must be 01-12";
  const fullYear = 2e3 + yy;
  const now = /* @__PURE__ */ new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (fullYear < currentYear) return "Card is expired";
  if (fullYear === currentYear && mm < currentMonth) return "Card is expired";
  return null;
}
function prettifyOtpSendError(message) {
  const msg = String(message || "");
  if (msg.includes("5.7.8") && (msg.toLowerCase().includes("badcredentials") || msg.toLowerCase().includes("username and password not accepted"))) {
    return "Gmail rejected the SMTP login (BadCredentials). Set SMTP_USERNAME to your Gmail address and SMTP_PASSWORD to a Google App Password (not your normal Gmail password), then restart the backend and try again.";
  }
  if (msg.toLowerCase().includes("otp email delivery failed")) {
    return "OTP email could not be delivered. Check backend SMTP settings in backend/.env (Gmail App Password), restart backend, and try again.";
  }
  return msg;
}
function DemoPaymentGatewayDialog(props) {
  const { open, onOpenChange, apiBaseUrl, userEmail, onBalanceUpdated } = props;
  const { authHeaders, logout } = useAuth();
  const [step, setStep] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [amount, setAmount] = useState("");
  const [maskedCard, setMaskedCard] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState(null);
  const [demoOtpEcho, setDemoOtpEcho] = useState(null);
  const [otp, setOtp] = useState("");
  const [expiresAtMs, setExpiresAtMs] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [successBalance, setSuccessBalance] = useState(null);
  const timerRef = useRef(null);
  const remainingSeconds = useMemo(() => {
    if (!expiresAtMs) return null;
    return Math.max(0, Math.floor((expiresAtMs - nowMs) / 1e3));
  }, [expiresAtMs, nowMs]);
  function resetAll() {
    setStep("card");
    setCardNumber("");
    setCardHolder("");
    setExpiry("");
    setCvv("");
    setAmount("");
    setMaskedCard(null);
    setDeliveryMode(null);
    setDemoOtpEcho(null);
    setOtp("");
    setExpiresAtMs(null);
    setError(null);
    setNotice(null);
    setSubmitting(false);
    setResending(false);
    setVerifying(false);
    setSuccessBalance(null);
  }
  useEffect(() => {
    if (!open) {
      resetAll();
      return;
    }
    timerRef.current = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open]);
  const amountNumber = useMemo(() => {
    const n = Number(String(amount).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : NaN;
  }, [amount]);
  const canProceed = useMemo(() => {
    const digits = onlyDigits(cardNumber);
    if (digits.length !== 16) return false;
    if (!cardHolder.trim()) return false;
    if (validateExpiry(expiry)) return false;
    if (onlyDigits(cvv).length !== 3) return false;
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return false;
    return true;
  }, [cardNumber, cardHolder, expiry, cvv, amountNumber]);
  async function callSendOtp() {
    setError(null);
    setNotice(null);
    const digits = onlyDigits(cardNumber);
    const last4 = digits.slice(-4);
    const res = await fetch(`${apiBaseUrl}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        email: (userEmail || "").trim(),
        amount: Number(amountNumber),
        card_last4: last4
      })
    });
    if (res.status === 401) {
      setError("Session expired. Please login again");
      await logout();
      window.location.assign("/login");
      throw new Error("Unauthorized");
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
      throw new Error(String(message));
    }
    const parsed = data;
    setMaskedCard(parsed.masked_card);
    setDeliveryMode(parsed.delivery);
    setDemoOtpEcho(parsed.demo_otp ?? null);
    setExpiresAtMs(Date.now() + parsed.expires_in_seconds * 1e3);
    setStep("otp");
    if (parsed.delivery !== "smtp") {
      setNotice("Email delivery is simulated in Demo Mode. Use the OTP shown below to continue.");
    } else if (parsed.warning) {
      setNotice(String(parsed.warning));
    }
  }
  async function onProceedToPay() {
    setError(null);
    setNotice(null);
    const digits = onlyDigits(cardNumber);
    if (digits.length !== 16) return setError("Card number must be 16 digits");
    if (!cardHolder.trim()) return setError("Card holder name is required");
    const expiryError = validateExpiry(expiry);
    if (expiryError) return setError(expiryError);
    if (onlyDigits(cvv).length !== 3) return setError("CVV must be 3 digits");
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return setError("Amount must be > 0");
    setSubmitting(true);
    try {
      await callSendOtp();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send OTP.";
      setError(prettifyOtpSendError(msg));
    } finally {
      setSubmitting(false);
    }
  }
  async function onResend() {
    if (resending) return;
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await callSendOtp();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to resend OTP.";
      setError(prettifyOtpSendError(msg));
    } finally {
      setResending(false);
    }
  }
  async function onVerifyOtp() {
    if (verifying) return;
    setError(null);
    setNotice(null);
    const otpDigits = onlyDigits(otp);
    if (otpDigits.length !== 6) return setError("OTP must be 6 digits");
    if (remainingSeconds != null && remainingSeconds <= 0) return setError("OTP expired. Please resend OTP.");
    setVerifying(true);
    try {
      const fundsRes = await fetch(`${apiBaseUrl}/add-funds`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email: (userEmail || "").trim(), otp: otpDigits })
      });
      if (fundsRes.status === 401) {
        setError("Session expired. Please login again");
        await logout();
        window.location.assign("/login");
        return;
      }
      const fundsData = await fundsRes.json().catch(() => null);
      if (!fundsRes.ok) {
        const message = fundsData && (fundsData.detail || fundsData.message || fundsData.error) || `API request failed (${fundsRes.status})`;
        throw new Error(String(message));
      }
      const parsed = fundsData;
      setSuccessBalance(Number(parsed.balance) || 0);
      setStep("success");
      onBalanceUpdated?.(Number(parsed.balance) || 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OTP verification failed.";
      setError(msg);
    } finally {
      setVerifying(false);
    }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demo Payment Gateway</DialogTitle>
          <DialogDescription>
            <span className="text-muted-foreground">Demo Mode – No real transaction performed</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Add Funds</Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {userEmail || "No email"}
            </Badge>
            {deliveryMode ? <Badge variant="outline" className="text-muted-foreground">
                OTP delivery: {deliveryMode === "smtp" ? "Email" : "Simulated"}
              </Badge> : null}
          </div>

          {error ? <Alert variant={step === "success" ? "default" : "destructive"}>
              <AlertTitle>{step === "success" ? "Note" : "Payment error"}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert> : null}

          {notice ? <Alert>
              <AlertTitle>Demo notice</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert> : null}

          {step === "card" ? <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="cardNumber">Card Number (16 digits)</Label>
                <Input
    id="cardNumber"
    inputMode="numeric"
    placeholder="1234 5678 9012 3456"
    value={cardNumber}
    onChange={(e) => setCardNumber(e.target.value)}
  />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cardHolder">Card Holder Name</Label>
                <Input
    id="cardHolder"
    placeholder="Arjun Sharma"
    value={cardHolder}
    onChange={(e) => setCardHolder(e.target.value)}
  />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="expiry">Expiry Date (MM/YY)</Label>
                  <Input
    id="expiry"
    inputMode="numeric"
    placeholder="08/29"
    value={expiry}
    onChange={(e) => setExpiry(e.target.value)}
  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cvv">CVV (3 digits)</Label>
                  <Input
    id="cvv"
    inputMode="numeric"
    placeholder="123"
    value={cvv}
    onChange={(e) => setCvv(e.target.value)}
  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
    id="amount"
    inputMode="decimal"
    placeholder="5000"
    value={amount}
    onChange={(e) => setAmount(e.target.value)}
  />
              </div>

              <Button onClick={onProceedToPay} disabled={!canProceed || submitting} className="w-full">
                {submitting ? <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Proceeding…
                  </span> : "Proceed to Pay"}
              </Button>

              <div className="text-xs text-muted-foreground">
                Card details are not stored. This is a demo-only payment simulation.
              </div>
            </div> : null}

          {step === "otp" ? <div className="space-y-4">
              <Alert>
                <AlertTitle>OTP sent</AlertTitle>
                <AlertDescription>
                  We sent an OTP to <span style={{ fontWeight: 700 }}>{userEmail}</span>.
                  {maskedCard ? <span>
                      {" "}Card: <span style={{ fontWeight: 700 }}>{maskedCard}</span>
                    </span> : null}
                </AlertDescription>
              </Alert>

              {demoOtpEcho ? <Alert>
                  <AlertTitle>Demo OTP (local)</AlertTitle>
                  <AlertDescription>
                    <span className="text-muted-foreground">For demo/testing only:</span> <span style={{ fontWeight: 900 }}>{demoOtpEcho}</span>
                  </AlertDescription>
                </Alert> : null}

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Expires in: <span style={{ fontWeight: 800 }}>{remainingSeconds == null ? "\u2014" : formatSeconds(remainingSeconds)}</span>
                </div>
                <Button variant="secondary" onClick={onResend} disabled={resending}>
                  {resending ? <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resending…
                    </span> : "Resend OTP"}
                </Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
    id="otp"
    inputMode="numeric"
    placeholder="123456"
    value={otp}
    onChange={(e) => setOtp(e.target.value)}
  />
              </div>

              <Button onClick={onVerifyOtp} disabled={verifying} className="w-full">
                {verifying ? <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </span> : "Verify OTP"}
              </Button>

              <div className="text-xs text-muted-foreground">Demo Payment Gateway • No real transaction performed</div>
            </div> : null}

          {step === "success" ? <div className="space-y-4">
              <Alert>
                <AlertTitle>Payment Successful ✅</AlertTitle>
                <AlertDescription>
                  Funds added successfully to your demo broker account.
                  {maskedCard ? <span>
                      {" "}Card: <span style={{ fontWeight: 700 }}>{maskedCard}</span>
                    </span> : null}
                </AlertDescription>
              </Alert>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">Updated broker balance</div>
                <div className="text-2xl text-green-600" style={{ fontWeight: 900 }}>
                  ₹{successBalance == null ? "0" : Math.round(successBalance).toLocaleString("en-IN")}
                </div>
              </div>

              <Button onClick={() => onOpenChange(false)} className="w-full">
                Done
              </Button>

              <div className="text-xs text-muted-foreground">Demo Mode – No real transaction performed</div>
            </div> : null}
        </div>
      </DialogContent>
    </Dialog>;
}
export {
  DemoPaymentGatewayDialog
};
