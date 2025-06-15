"use client"
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.push('/calls')
  }, [])
  return (
    <div className="h-full w-full flex items-center justify-center">
      loading
    </div>
  );
}
