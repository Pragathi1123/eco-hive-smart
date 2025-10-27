import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Leaf, TrendingUp, Award, Users } from "lucide-react";
import heroImage from "@/assets/hero-sustainability.jpg";

const Hero = () => {
  return (
    <div className="relative min-h-screen">
      {/* Hero Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
      </div>

      {/* Hero Content */}
      <div className="relative container mx-auto px-4 py-20">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          {/* Logo */}
          <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-xl animate-in fade-in duration-700">
            <Leaf className="h-10 w-10 text-primary-foreground" />
          </div>

          {/* Headline */}
          <div className="space-y-4 animate-in slide-in-from-bottom duration-700 delay-100">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-primary-light to-secondary bg-clip-text text-transparent">
              Transform Waste into Impact
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Track, analyze, and reduce your environmental footprint. Join a community committed to sustainable living.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom duration-700 delay-200">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                Get Started Free
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-16 animate-in slide-in-from-bottom duration-700 delay-300">
            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-xl border shadow-md hover:shadow-lg transition-all">
              <div className="h-12 w-12 rounded-lg bg-gradient-accent flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Your Impact</h3>
              <p className="text-muted-foreground">
                Log waste, visualize trends, and see your environmental savings in real-time
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-xl border shadow-md hover:shadow-lg transition-all">
              <div className="h-12 w-12 rounded-lg bg-gradient-success flex items-center justify-center mb-4">
                <Award className="h-6 w-6 text-success-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Earn Rewards</h3>
              <p className="text-muted-foreground">
                Unlock achievements and compete on leaderboards for sustainable actions
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-xl border shadow-md hover:shadow-lg transition-all">
              <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Join the Movement</h3>
              <p className="text-muted-foreground">
                Connect with eco-conscious communities and share best practices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
