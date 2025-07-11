import Calendarprod from "./components/Calendarprod";
import RealtimeDashboard from "./components/RealtimeDashboard";
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"
import { BentoBox } from "@/components/dashboard/BentoBox";

export default function DashboardPage() {
  return (
    <div className="space-y-8 py-20">
      <BentoBox />
      {/* <RealtimeDashboard /> */}
          <Card className="w-full h-[500px] bg-black/[0.96] relative overflow-hidden">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="flex h-full">
        {/* Left content */}
        <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Verkos AI
          </h1>
          <p className="mt-4 text-neutral-300 max-w-lg">
            Unlocking the Future of AI with Verkos AI
          </p>
        </div>

        {/* Right content */}
        {/* <div className="flex-1 relative">
          <SplineScene 
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </div> */}
      </div>
    </Card>
      <Calendarprod />
    </div>
  )
}
