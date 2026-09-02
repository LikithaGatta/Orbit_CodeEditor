import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="z-20 flex flex-col items-center justify-start min-h-screen py-2 mt-10">

      <div className="flex flex-col justify-center items-center my-5">

        {/* Blue gradient logo - works in both light and dark mode */}
        <Image
          src="/Light-Dark Logo.png"
          alt="Orbit Code Editor"
          height={500}
          width={500}
        />

        <h1 className="z-20 text-6xl mt-5 font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 dark:from-blue-400 dark:via-cyan-400 dark:to-sky-400 tracking-tight leading-[1.3]">
          Code Smarter. Build Better.
        </h1>
      </div>

      <p className="mt-2 text-lg text-center text-gray-600 dark:text-gray-400 px-5 py-10 max-w-2xl">
        The Orbit Code Editor is an intelligent coding environment built to make
        development simpler, faster, and more intuitive. Write code, explore ideas,
        debug problems, and bring your projects to life with AI-powered assistance.
      </p>

      <Link href="/dashboard">
        <Button variant="brand" className="mb-4" size="lg">
          Get Started
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </Link>

    </div>
  );
}