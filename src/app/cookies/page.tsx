export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last updated: March 11, 2026</p>

        <div className="prose prose-lg">
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. What Are Cookies</h2>
          <p>
            Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Cookies</h2>
          <p>aimily uses cookies for the following purposes:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Essential cookies:</strong> Required for the platform to function. These include authentication tokens and session management cookies provided by Supabase.</li>
            <li><strong>Functional cookies:</strong> Remember your preferences such as language settings and display options.</li>
            <li><strong>Analytics cookies:</strong> Help us understand how users interact with our platform so we can improve the experience.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Essential Cookies</h2>
          <p>These cookies are strictly necessary for the operation of our platform:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>sb-access-token / sb-refresh-token:</strong> Authentication session managed by Supabase. Expires when you sign out or after the session timeout.</li>
            <li><strong>sb-auth-token:</strong> Maintains your authenticated state across page navigation.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Third-Party Services</h2>
          <p>We use the following third-party services that may set their own cookies:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Supabase:</strong> Authentication and database services</li>
            <li><strong>Vercel:</strong> Hosting and deployment platform</li>
            <li><strong>Google (Gemini AI):</strong> AI-powered trend analysis and insights</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Managing Cookies</h2>
          <p>
            You can control and manage cookies through your browser settings. Please note that disabling essential cookies may prevent you from using certain features of aimily, including signing in to your account.
          </p>
          <p>Most browsers allow you to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>View what cookies are stored and delete them individually</li>
            <li>Block third-party cookies</li>
            <li>Block cookies from specific sites</li>
            <li>Block all cookies</li>
            <li>Delete all cookies when you close your browser</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights (GDPR)</h2>
          <p>
            Under the General Data Protection Regulation (GDPR) and the Spanish LSSI-CE, you have the right to:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Be informed about what cookies are used and why</li>
            <li>Choose whether to accept non-essential cookies</li>
            <li>Withdraw your consent at any time</li>
            <li>Request deletion of your data</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in technology or legislation. We will notify you of significant changes by posting a notice on our platform.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact</h2>
          <p>
            For questions about our use of cookies, contact us at:{" "}
            <a href="mailto:studionn.agency@gmail.com" className="text-primary hover:underline">
              studionn.agency@gmail.com
            </a>
          </p>
          <p className="mt-2">
            StudioNN Agency — Spain
          </p>
        </div>
      </div>
    </div>
  );
}
