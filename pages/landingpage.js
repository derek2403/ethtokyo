import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Stars Background with content overlay */}
      <StarsBackground
        starColor="#ffffff"
        factor={0.05}
        speed={50}
        className="absolute inset-0"
      >
        {/* Main content container */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto">
            <h1 className="text-7xl md:text-9xl font-black text-foreground mb-12 tracking-tight leading-none">
              Welcome to{' '}
              <span className="block mt-4 text-primary">
                ETH Tokyo
              </span>
            </h1>
            
            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button 
                size="lg" 
                className="px-12 py-6 text-lg font-bold h-auto"
              >
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="px-12 py-6 text-lg font-bold h-auto"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </StarsBackground>
    </div>
  );
}
