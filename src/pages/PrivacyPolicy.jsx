import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Bell, Users, FileText, Phone } from 'lucide-react';

const Section = ({ icon: Icon, title, children }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#10B981]" strokeWidth={2} />
      </div>
      <h2 className="text-white font-semibold text-base">{title}</h2>
    </div>
    <div className="pl-11 text-[#A0A0A0] text-sm leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1A1A1A] border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-[#2C2C2C] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
        </button>
        <h1 className="text-white font-bold text-lg">Privacy Policy</h1>
      </div>

      <div className="px-4 py-6 pb-24">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] p-5 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7 text-white" strokeWidth={2} />
            <h2 className="text-white font-bold text-lg">Green Vision Trader</h2>
          </div>
          <p className="text-white/90 text-sm leading-relaxed">
            Driver App — Privacy Policy
          </p>
          <p className="text-white/70 text-xs mt-2">Last Updated: March 20, 2025</p>
        </div>

        {/* Introduction */}
        <div className="bg-[#2C2C2C] rounded-2xl p-4 mb-6">
          <p className="text-[#A0A0A0] text-sm leading-relaxed">
            Welcome to the <span className="text-white font-medium">Green Vision Trader Driver App</span>.
            This Privacy Policy explains how we collect, use, and protect your personal information.
            This app is intended exclusively for verified drivers whose accounts are created by an authorized administrator.
            By using this app, you agree to the practices described in this policy.
          </p>
        </div>

        {/* Sections */}
        <Section icon={Users} title="Who Can Use This App">
          <p>
            This Driver App is a <strong className="text-white">closed-access application</strong>.
            Only verified drivers whose login credentials (email and password) are created by the
            Green Vision Trader admin team can access this app. There is no public self-registration
            available.
          </p>
        </Section>

        <div className="h-px bg-white/10 mb-6" />

        <Section icon={Database} title="Information We Collect">
          <p>We collect the following information to operate the Driver App:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Full name, email address, and phone number</li>
            <li>Home and delivery addresses</li>
            <li>Driver's license number and expiry date</li>
            <li>Vehicle details (type, number, capacity, condition)</li>
            <li>Insurance and permit documents</li>
            <li>Bank account details for payment processing</li>
            <li>Order and delivery activity logs</li>
            <li>Fuel expense and kilometer records</li>
            <li>Advance payment requests</li>
          </ul>
        </Section>

        <div className="h-px bg-white/10 mb-6" />

        <Section icon={Eye} title="How We Use Your Information">
          <ul className="list-disc list-inside space-y-1">
            <li>To authenticate and authorize your access to the app</li>
            <li>To assign and manage delivery orders</li>
            <li>To track and record delivery activity</li>
            <li>To process fuel expense reimbursements and advance payments</li>
            <li>To send notifications about orders and route information</li>
            <li>To maintain driver profiles and vehicle records</li>
            <li>To comply with legal and regulatory requirements</li>
          </ul>
        </Section>

        <div className="h-px bg-white/10 mb-6" />

        <Section icon={Lock} title="Data Security">
          <p>
            We take the security of your personal information seriously. Your data is:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Stored on secure, encrypted servers</li>
            <li>Accessible only to authorized administrators and the driver themselves</li>
            <li>Protected with secure authentication tokens for every session</li>
            <li>Never sold or shared with third parties for marketing purposes</li>
          </ul>
          <p className="mt-2">
            Your login credentials are created and managed exclusively by the Green Vision Trader admin team.
            Please keep your password confidential and do not share it with anyone.
          </p>
        </Section>

        <div className="h-px bg-white/10 mb-6" />

        <Section icon={Bell} title="Notifications">
          <p>
            This app may send you push notifications related to:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>New order assignments</li>
            <li>Order status updates</li>
            <li>Route and delivery information alerts</li>
            <li>Administrative announcements</li>
          </ul>
          <p className="mt-2">
            You can manage notification preferences through your device settings. Disabling
            notifications may affect your ability to receive timely order updates.
          </p>
        </Section>

        <div className="h-px bg-white/10 mb-6" />

        <Section icon={FileText} title="Data Retention">
          <p>
            We retain your personal data for as long as your driver account is active or as required
            by law. If your account is deactivated by the admin, we may retain certain records for
            compliance, accounting, and legal purposes for a period of up to 5 years.
          </p>
        </Section>

        <div className="h-px bg-white/10 mb-6" />

        <Section icon={Shield} title="Your Rights">
          <p>As a driver using this app, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Access the personal information we hold about you</li>
            <li>Request corrections to inaccurate data</li>
            <li>Request deletion of your data (subject to legal obligations)</li>
            <li>Raise concerns about how your data is used</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, please contact the Green Vision Trader admin team.
          </p>
        </Section>

        <div className="h-px bg-white/10 mb-6" />

        <Section icon={Phone} title="Contact Us">
          <p>
            If you have any questions or concerns about this Privacy Policy or your personal data,
            please contact us:
          </p>
          <div className="mt-3 bg-[#1A1A1A] rounded-xl p-3 space-y-2">
            <p className="text-white font-medium text-sm">Green Vision Trader</p>
            <p>Email: <span className="text-[#10B981]">admin@greenvisiontrader.com</span></p>
            <p>This policy applies to the Green Vision Trader Driver mobile application.</p>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-6 rounded-2xl bg-[#2C2C2C] p-4 text-center">
          <p className="text-[#A0A0A0] text-xs leading-relaxed">
            By continuing to use the Green Vision Trader Driver App, you acknowledge that you have
            read and understood this Privacy Policy.
          </p>
          <p className="text-[#10B981] text-xs mt-2 font-medium">
            © 2025 Green Vision Trader. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
