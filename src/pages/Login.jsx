import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center px-6 pt-24">
      <Truck className="w-[75px] h-12 text-[#34C759] mb-9" strokeWidth={2} />
      <h1 className="text-white text-3xl font-bold text-center mb-11">
        Driver Login
      </h1>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[380px] space-y-4"
      >
        {error && (
          <div className="py-3 px-4 rounded-xl bg-red-500/20 border border-red-500/50">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={Mail}
          className="border border-white/20"
          autoComplete="email"
          disabled={isLoading}
        />
        <div className="relative">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
              <Lock className="w-5 h-5" strokeWidth={2} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-3 pl-12 pr-12 rounded-xl bg-[#303030] text-white placeholder-[#9CA3AF] border border-white"
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" strokeWidth={2} />
              ) : (
                <Eye className="w-5 h-5" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
        <Button type="submit" className="mt-7" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <div className="w-[150px] h-1 bg-white rounded-full mt-12" />
    </div>
  );
}
