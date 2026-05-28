import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api } from '../api';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => {
    const queryEmail = searchParams.get('email');
    return queryEmail ? queryEmail.trim().toLowerCase() : '';
  }, [searchParams]);
  const [formData, setFormData] = useState({ email: initialEmail, code: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalizedEmail = formData.email.trim().toLowerCase();
    const normalizedCode = formData.code.trim();

    if (!normalizedEmail) {
      setError('Email is required');
      return;
    }

    if (!normalizedCode) {
      setError('Reset code is required');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: normalizedEmail,
        code: normalizedCode,
        newPassword: formData.newPassword
      });

      toast.success('Password reset successfully. Please login.');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      console.error('Reset password request failed:', err);
      const errorMessage = err.message || 'Unable to reset password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">Reset Password</h1>
          <p className="text-muted-foreground">Enter the code from your email and choose a new password.</p>
        </div>

        <div className="bg-card py-10 px-6 shadow-xl rounded-2xl border border-border sm:px-10 relative">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-muted-foreground">
                Email Address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Enter your email"
                  className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-foreground bg-muted/20"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-muted-foreground">
                Reset Code
              </label>
              <div className="mt-2">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  placeholder="Enter the code from your email"
                  className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-foreground bg-muted/20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-muted-foreground">
                New Password
              </label>
              <div className="mt-2">
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  placeholder="Enter new password"
                  className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-foreground bg-muted/20"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-muted-foreground">
                Confirm Password
              </label>
              <div className="mt-2">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="Confirm new password"
                  className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-foreground bg-muted/20"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" isLoading={loading} className="w-full py-3.5 text-base font-bold shadow-md hover:shadow-lg">
                Reset password
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
