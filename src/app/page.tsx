"use client"
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ActionButton from "@/components/ui/action-button";
import { LavaLamp } from "@/components/ui/fluid-blob";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Sparkles } from "lucide-react";
import GradientButton from "@/components/ui/button-1";
export default function Home() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false);

  function handleClick() {
    setIsPending(true);
    // setTimeout(() => setIsPending(false), 3000);
    router.push('/dashboard')  
  }
  useEffect(() => {
    // router.push('/dashboard')  
  }, [])
  return (
    <div className="fixed h-screen w-screen flex flex-col justify-center items-center  overflow-hidden gap-4 select-none">
      <LavaLamp/>
      <h1 className="text-6xl md:text-8xl font-bold tracking-tight mix-blend-exclusion text-white whitespace-nowrap">
      Apex AI
    </h1>
    <ActionButton variant="ghost2" onClick={handleClick} isPending={isPending} className="text-lg md:text-xl text-center text-white mix-blend-exclusion max-w-2xl leading-relaxed h-12 flex justify-center items-center rounded-fulll cursor-pointer" >
      {/* <p className="text-lg md:text-xl text-center text-white mix-blend-exclusion max-w-2xl leading-relaxed h-12" > */}
      {/* <LoaderCircle className="w-4 h-4 animate-spin" /> */}
      {/* <LoaderCircle
        className="-ms-1 me-2 animate-spin"
        size={16}
        strokeWidth={2}
        aria-hidden="true"
      /> */}
      {/* </p> */}
      {/* <GradientButton
        onClick={() => console.log('clicked')}
        width="300px"
        height="60px"
        disabled={false}
        className="text-lg md:text-xl text-center text-black mix-blend-exclusion max-w-2xl leading-relaxed h-12 flex justify-center items-center rounded-fulll cursor-pointer"
      > */}
              Start Ideating  <Sparkles className="-me-1 ms-2 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />

      {/* </GradientButton> */}
    </ActionButton>
    </div>
  );
}
