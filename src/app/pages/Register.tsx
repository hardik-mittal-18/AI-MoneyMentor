// @ts-nocheck
// Canonical implementation lives in Register.jsx; this file forwards to it.
export { Register } from "./Register.jsx";

/*

      setError(result.message);
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
            <span className="text-gray-900">AI Money</span>
            <span className="text-blue-600">Mentor</span>
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-gray-900 mb-1" style={{ fontWeight: 700, fontSize: "1.4rem" }}>
            Create your account
          </h1>
          <p className="text-gray-400 mb-7" style={{ fontSize: "0.9rem" }}>
            Start your personalized finance journey.
          </p>

          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-red-600" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  autoComplete="name"
                  className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
              style={{ fontWeight: 600, fontSize: "0.95rem" }}
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-gray-500 mt-6" style={{ fontSize: "0.875rem" }}>
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-700" style={{ fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-400 mt-5" style={{ fontSize: "0.8rem" }}>
          🔒 Secured sign-up (JWT)
        </p>
      </div>
    </div>
  );
}

*/
