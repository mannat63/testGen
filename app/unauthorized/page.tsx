import { UserButton } from "@clerk/nextjs";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-red-900 opacity-10 blur-[120px] rounded-full"></div>
      </div>
      
      <div className="z-10 w-full max-w-md text-center space-y-6">
        <h1 className="text-4xl font-garamond text-red-500 mb-2 tracking-wider">Access Denied</h1>
        <p className="text-neutral-400">
          Your account is not authorized to access this portal. Please contact the administrator to request access.
        </p>
        
        <div className="mt-8 flex justify-center">
          <UserButton />
        </div>
        <p className="text-neutral-500 text-sm mt-4">
          Click above to sign out and try a different account.
        </p>
      </div>
    </div>
  );
}
