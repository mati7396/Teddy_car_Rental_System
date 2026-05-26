import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api } from '../api';
import { toast } from 'sonner';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setError('Email is required.');
        return;
      }

      const response = await api.post('/auth/forgot-password', { email: normalizedEmail });
      const successMessage = response?.message || 'Reset code sent successfully. Please check your email.';
      setMessage(successMessage);
      toast.success(successMessage);
    } catch (err) {
      console.error('Forgot password request failed:', err);
      const errorMessage = err.message || 'Unable to send reset code.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">Forgot Password</h1>
          <p className="text-gray-600">Enter your email and we will send you a reset code.</p>
        </div>

        <div className="bg-white py-10 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10 relative">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-md">
              <p className="text-sm font-medium text-green-700">{message}</p>
              <Link
                to={`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                className="mt-2 inline-block text-sm font-semibold text-green-700 underline hover:text-green-800"
              >
                Continue to reset password
              </Link>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
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
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-gray-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" isLoading={loading} className="w-full py-3.5 text-base font-bold shadow-md hover:shadow-lg">
                Send reset code
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
