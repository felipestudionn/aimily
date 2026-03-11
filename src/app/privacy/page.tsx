export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last updated: March 11, 2026</p>

        <div className="prose prose-lg">
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>
            aimily ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information when you use our fashion merchandising platform.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3">2.1 Information You Provide</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Account information (name, email)</li>
            <li>Collection planning data</li>
            <li>Uploaded images and moodboards</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">2.2 Pinterest Integration</h3>
          <p>
            When you connect your Pinterest account, we access:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Your Pinterest boards (read-only)</li>
            <li>Pins from your boards (read-only)</li>
            <li>Board names and descriptions</li>
          </ul>
          <p>
            We use this information solely to help you create fashion moodboards and generate AI-powered collection insights. We do NOT post, modify, or delete any content on your Pinterest account.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 mb-4">
            <li>To provide and improve our services</li>
            <li>To generate AI-powered fashion insights and recommendations</li>
            <li>To analyze trends and patterns in fashion data</li>
            <li>To communicate with you about your account</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Sharing &amp; Sub-Processors</h2>
          <p>
            We do NOT sell your personal information. We share data with the following service providers (sub-processors) as necessary to operate our platform:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Supabase</strong> (Singapore Pte. Ltd.) — Database hosting, authentication, and user management</li>
            <li><strong>Stripe</strong> (Stripe, Inc.) — Payment processing and subscription billing</li>
            <li><strong>Google</strong> (Google LLC) — AI processing (Gemini), OAuth authentication</li>
            <li><strong>Anthropic</strong> (Anthropic PBC) — AI processing (Claude, SketchFlow)</li>
            <li><strong>Resend</strong> (Resend, Inc.) — Transactional email delivery</li>
            <li><strong>Vercel</strong> (Vercel, Inc.) — Application hosting and CDN</li>
            <li>When required by law or to protect our rights</li>
          </ul>
          <p>
            All sub-processors are bound by data processing agreements and comply with applicable data protection regulations.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Payment Data</h2>
          <p>
            Payment information is processed directly by Stripe. We do not store credit card numbers, CVVs, or full payment details on our servers. Stripe acts as an independent data controller for payment data. See{" "}
            <a href="https://stripe.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Stripe&apos;s Privacy Policy
            </a>{" "}
            for details.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Pinterest Data</h2>
          <p>
            Pinterest data is used exclusively within aimily for creating moodboards and generating insights. We comply with Pinterest's API Terms of Service and do not use Pinterest data for any other purpose.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data, including encryption, secure authentication, and regular security audits.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Your Rights (GDPR)</h2>
          <p>Under EU/EEA data protection law, you have the right to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Access</strong> — Download all your personal data from your{" "}
              <a href="/account" className="text-primary hover:underline">account settings</a>
            </li>
            <li><strong>Rectification</strong> — Correct inaccurate data in your account</li>
            <li><strong>Erasure</strong> — Permanently delete your account and all associated data from your{" "}
              <a href="/account" className="text-primary hover:underline">account settings</a>
            </li>
            <li><strong>Portability</strong> — Export your data in JSON format</li>
            <li><strong>Objection</strong> — Object to processing of your data</li>
            <li>Disconnect your Pinterest account at any time</li>
          </ul>
          <p>
            To exercise any of these rights, visit your{" "}
            <a href="/account" className="text-primary hover:underline">account settings</a>{" "}
            or contact us at the email below.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">9. Data Controller</h2>
          <p>
            The data controller is StudioNN Agency S.L. (NIF: B42978130), based in Alicante, Spain.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">10. Contact Us</h2>
          <p>
            For privacy-related questions, contact us at:{" "}
            <a href="mailto:privacy@aimily.app" className="text-primary hover:underline">
              privacy@aimily.app
            </a>
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </div>
      </div>
    </div>
  );
}
