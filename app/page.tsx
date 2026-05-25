import DualAudience from "@/app/sections/DualAudience";
import FinalCTA from "@/app/sections/FinalCTA";
import Hero from "@/app/sections/Hero";
import HowItWorks from "@/app/sections/HowItWorks";
import Pricing from "@/app/sections/Pricing";
import ProblemSolution from "@/app/sections/ProblemSolution";
import SecurityCompliance from "@/app/sections/SecurityCompliance";
import SocialProof from "@/app/sections/SocialProof";

export default function Home() {
  return (
    <main>
      <Hero />
      <ProblemSolution />
      <HowItWorks />
      <DualAudience />
      <SocialProof />
      <SecurityCompliance />
      <Pricing />
      <FinalCTA />
    </main>
  );
}
