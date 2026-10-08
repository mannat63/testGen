import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { DEMO_ADMIN_ENABLED } from '@/lib/demoAdmin';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Image Section */}
      <div className="hidden lg:flex w-1/2 relative bg-white border-r border-slate-200 shadow-2xl z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent z-10" />
        <img 
          src="/login_landscape.png" 
          alt="Landscape" 
          className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-10000"
        />
        <div className="absolute bottom-16 left-16 z-20">
          <h2 className="text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-md">Empowering Education</h2>
          <p className="text-white/90 text-lg max-w-md drop-shadow leading-relaxed font-medium">Generate board-perfect test papers seamlessly with Intellogy Corporation's advanced AI platform.</p>
        </div>
      </div>

      {/* Right Login Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative bg-slate-50 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        {/* Decorative Light Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] bg-[#d4af37] opacity-20 blur-[100px] rounded-full mix-blend-multiply"></div>
          <div className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-blue-400 opacity-20 blur-[100px] rounded-full mix-blend-multiply"></div>
          <div className="absolute top-[40%] left-[20%] w-[40%] h-[40%] bg-amber-200 opacity-20 blur-[120px] rounded-full mix-blend-multiply"></div>
        </div>

        <div className="z-10 w-full max-w-md p-6 animate-fade-in-up">
          <div className="flex flex-col items-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-serif text-slate-900 tracking-wider text-center leading-tight mb-2 font-semibold">
              INTELLOGY<br />
              <span className="text-[#d4af37]">CORPORATION</span>
            </h1>
          </div>
          
          <SignIn
            appearance={{
              elements: {
                card: 'bg-white/70 backdrop-blur-xl border border-white shadow-2xl shadow-slate-200/50 mx-auto rounded-2xl',
                headerTitle: 'text-slate-900 font-extrabold text-xl',
                headerSubtitle: 'text-slate-500 font-medium',
                socialButtonsBlockButton: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors',
                dividerLine: 'bg-slate-200',
                dividerText: 'text-slate-400',
                formFieldLabel: 'text-slate-700 font-bold',
                formFieldInput: 'bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold rounded-lg shadow-sm',
                formButtonPrimary: 'bg-brand-gold text-white hover:bg-[#c19b28] transition-colors font-bold rounded-lg py-2.5 shadow-md shadow-brand-gold/20',
                footerActionText: 'text-slate-500 font-medium',
                footerActionLink: 'text-brand-gold hover:text-[#c19b28] font-bold',
                identityPreviewText: 'text-slate-700 font-medium',
                identityPreviewEditButton: 'text-brand-gold hover:text-[#c19b28]',
              },
            }}
          />

          {DEMO_ADMIN_ENABLED && (
            <div className="mt-6 text-center">
              <Link href="/admin-login" className="text-sm font-semibold text-[#c19b28] hover:underline">
                Admin demo login (username / password)
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
