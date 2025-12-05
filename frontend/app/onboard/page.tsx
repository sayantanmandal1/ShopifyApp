'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Tenant Onboarding Page
 * 
 * This page allows new Shopify store owners to onboard their store to the platform.
 * It collects Shopify credentials (shop domain and access token), validates them
 * against the Shopify API, and creates a new tenant record along with a user account.
 * 
 * Flow:
 * 1. User enters Shopify credentials and account details
 * 2. Form validates input format
 * 3. Backend validates credentials with Shopify API
 * 4. Tenant record is created with encrypted credentials
 * 5. User account is created and linked to tenant
 * 6. User is automatically logged in and redirected to dashboard
 * 
 * Requirements: 1.1, 1.2
 */
export default function OnboardPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const [shopDomain, setShopDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const validateForm = (): boolean => {
    if (!shopDomain || !accessToken || !email || !password || !confirmPassword) {
      setError('Shop domain, access token, email, and password are required');
      return false;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9](\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])*\.[a-zA-Z]{2,}$/;
    const normalizedDomain = shopDomain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .trim();

    if (!domainRegex.test(normalizedDomain) && !normalizedDomain.includes('.myshopify.com')) {
      setError('Invalid shop domain format. Use format: yourstore.myshopify.com');
      return false;
    }

    if (accessToken.length < 10) {
      setError('Access token appears to be invalid (too short)');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return false;
    }

    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Onboard tenant
      const tenantRequestBody: any = {
        shopDomain,
        accessToken,
      };

      // Include optional fields if provided
      if (apiKey) {
        tenantRequestBody.apiKey = apiKey;
      }
      if (apiSecret) {
        tenantRequestBody.apiSecret = apiSecret;
      }

      const tenantResponse = await fetch('http://localhost:3001/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantRequestBody),
      });

      const tenantData = await tenantResponse.json();

      if (!tenantResponse.ok) {
        // Handle specific error cases
        if (tenantResponse.status === 409) {
          throw new Error('This Shopify store has already been onboarded');
        }
        throw new Error(tenantData.error || tenantData.details?.[0] || 'Tenant onboarding failed');
      }

      const tenantId = tenantData.data?.id;
      if (!tenantId) {
        throw new Error('Failed to retrieve tenant ID');
      }

      // Step 2: Register user account
      const userResponse = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          tenantId,
        }),
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error(userData.error || userData.details?.[0] || 'User registration failed');
      }

      // Step 3: Log in the user automatically
      if (userData.data?.token && userData.data?.user) {
        login(userData.data.token, userData.data.user);
        
        // Success - show message and redirect to dashboard
        setSuccessMessage('Onboarding successful! Redirecting to dashboard...');
        
        // Redirect to dashboard after 1.5 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        throw new Error('Failed to authenticate after registration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Onboard Your Shopify Store
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your Shopify store to start analyzing your data
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            Already onboarded?{' '}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </a>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            {/* Shopify Credentials Section */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Shopify Store Credentials</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-1">
                    Shop Domain <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="shopDomain"
                    name="shopDomain"
                    type="text"
                    required
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="yourstore.myshopify.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Your Shopify store domain (e.g., yourstore.myshopify.com)
                  </p>
                </div>
                <div>
                  <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="accessToken"
                    name="accessToken"
                    type="password"
                    required
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="shpat_..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Your Shopify Admin API access token
                  </p>
                </div>
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                    API Key <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    id="apiKey"
                    name="apiKey"
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="API Key"
                  />
                </div>
                <div>
                  <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700 mb-1">
                    API Secret <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    id="apiSecret"
                    name="apiSecret"
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="API Secret"
                  />
                </div>
              </div>
            </div>

            {/* User Account Section */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Create Your Account</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="relative block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{successMessage}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Setting up your account...' : 'Complete Onboarding'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By onboarding, you agree to securely store your Shopify credentials.
              <br />
              All credentials are encrypted before storage.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
