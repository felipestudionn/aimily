export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-8">Last updated: November 24, 2025</p>

        <div className="prose prose-lg">
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using aimily, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
          <p>
            aimily is a fashion merchandising and collection planning platform that provides:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>AI-powered trend insights and analysis</li>
            <li>Creative moodboard tools with Pinterest integration</li>
            <li>Collection planning and SKU management</li>
            <li>Financial projections and margin analysis</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Accounts</h2>
          <p>
            You are responsible for:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Maintaining the confidentiality of your account</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Pinterest Integration</h2>
          <p>
            When you connect your Pinterest account:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>You grant us read-only access to your boards and pins</li>
            <li>We will NOT post, modify, or delete any content on your Pinterest account</li>
            <li>You can disconnect your Pinterest account at any time</li>
            <li>You agree to comply with Pinterest's Terms of Service</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Acceptable Use</h2>
          <p>You agree NOT to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the service</li>
            <li>Upload malicious code or viruses</li>
            <li>Scrape or harvest data from the platform</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Intellectual Property</h2>
          <p>
            You retain ownership of your content. By using aimily, you grant us a license to use your content solely for providing and improving our services.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. AI-Generated Content</h2>
          <p>
            AI-generated insights and recommendations are provided "as is" for informational purposes. We do not guarantee the accuracy or suitability of AI-generated content for your specific business needs.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Limitation of Liability</h2>
          <p>
            aimily is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">9. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violation of these terms.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to Terms</h2>
          <p>
            We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact</h2>
          <p>
            For questions about these Terms, contact us at:{" "}
            <a href="mailto:legal@aimily.app" className="text-primary hover:underline">
              legal@aimily.app
            </a>
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">12. Governing Law</h2>
          <p>
            These terms are governed by the laws of Spain. Any disputes shall be resolved in the courts of Spain.
          </p>
        </div>
      </div>
    </div>
  );
}
