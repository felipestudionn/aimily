export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last updated: November 24, 2025</p>

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

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Sharing</h2>
          <p>
            We do NOT sell your personal information. We may share data with:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Service providers (Supabase for database, Google for AI processing)</li>
            <li>When required by law</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Pinterest Data</h2>
          <p>
            Pinterest data is used exclusively within aimily for creating moodboards and generating insights. We comply with Pinterest's API Terms of Service and do not use Pinterest data for any other purpose.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data, including encryption, secure authentication, and regular security audits.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data</li>
            <li>Disconnect your Pinterest account at any time</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact Us</h2>
          <p>
            For privacy-related questions, contact us at:{" "}
            <a href="mailto:privacy@aimily.app" className="text-primary hover:underline">
              privacy@aimily.app
            </a>
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </div>
      </div>
    </div>
  );
}
