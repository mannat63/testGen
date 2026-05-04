import Link from 'next/link';
import Image from 'next/image';
import { BOARDS } from '@/config/boards';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden flex flex-col transition-colors duration-300" style={{ background: 'var(--bg-gradient)' }}>
      
      {/* Nav Bar */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-3 border-b border-[#2a3050] shrink-0 bg-brand-navbar">
        <div className="flex items-center space-x-3">
          <div className="bg-[#1a2038] p-1 rounded-md border border-[#2a3050] flex items-center justify-center shadow-sm">
            <Image src="/image.png" alt="Logo" width={24} height={24} className="rounded-sm" />
          </div>
          <span className="text-lg font-bold tracking-widest">
            <span className="text-white">INTEL</span><span className="text-brand-gold-light">LOGY</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-xs font-medium tracking-widest uppercase hidden sm:block text-brand-navbar-muted">
            Test Paper Generator
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center lg:justify-between px-6 md:px-12 py-6 lg:py-0 gap-6 lg:gap-12 min-h-0">
        
        {/* Left Side: Text and Board Options */}
        <div className="flex-1 flex flex-col items-start text-left w-full lg:max-w-xl animate-fade-in-up min-h-0 shrink-1">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-3 mt-1">
            <span className="text-foreground">Generate </span>
            <span className="text-brand-gold">Board-Perfect</span><br/>
            <span className="text-foreground">Test Papers</span>
          </h1>
          
          <p className="text-sm md:text-base leading-relaxed mb-5 max-w-md shrink-0 text-brand-muted">
            Advanced question paper generation strictly aligned to Indian educational boards. Select your board to begin configuring.
          </p>
          
          {/* Board Grid */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {BOARDS.map((board) => (
              <Link key={board.id} href={`/configure?board=${board.id}`} className="block">
                <div 
                  className="group relative rounded-xl p-3 md:p-4 flex flex-col items-start justify-center cursor-pointer transition-all duration-300 hover:-translate-y-1 bg-brand-card border border-brand-border hover:border-brand-gold hover:shadow-lg h-full min-h-[70px] md:min-h-[85px] overflow-hidden"
                >
                  <h3 className="text-sm md:text-base font-bold transition-colors duration-300 text-foreground group-hover:text-brand-gold relative z-10">
                    {board.name}
                  </h3>
                  <p className="text-[10px] md:text-xs leading-snug line-clamp-2 text-brand-muted relative z-10 hidden sm:block mt-1">
                    {board.fullName}
                  </p>
                  
                  {/* Subtle right arrow on hover */}
                  <div className="absolute right-3 bottom-3 opacity-0 transform translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-brand-gold z-10 hidden sm:block">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                  
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-brand-gold to-transparent" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Side: Image with Premium Presentation */}
        <div className="w-full lg:w-1/2 flex lg:justify-end animate-fade-in-up shrink-0 relative" style={{ animationDelay: '0.2s' }}>
          
          {/* Luxury Ambient Glow Behind Image */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-brand-gold/15 blur-[60px] rounded-full pointer-events-none z-0"></div>
          <div className="absolute top-1/4 right-1/4 w-[40%] h-[40%] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none z-0 animate-pulse"></div>
          
          <div className="w-full relative group shrink min-h-[250px] lg:min-h-[400px] flex items-center justify-center max-h-[40vh] lg:max-h-[70vh] z-10 transition-all duration-1000 ease-out hover:-translate-y-2" style={{ aspectRatio: '1/1' }}>
            <Image 
              src="/Cover.png" 
              alt="Test Generation Illustration" 
              fill 
              className="object-contain transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:rotate-1 drop-shadow-2xl opacity-90 group-hover:opacity-100" 
              priority 
              style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))' }}
            />
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center py-3 border-t border-brand-border text-[11px] shrink-0 mt-auto text-brand-muted bg-background/50 backdrop-blur-md">
        Powered by <span className="font-semibold ml-1 text-brand-gold">Intellogy LLP</span>
      </footer>
    </div>
  );
}
