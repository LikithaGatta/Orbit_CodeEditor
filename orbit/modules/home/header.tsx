import Link from "next/link";
import UserButton from "../auth/components/user-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Header() {
  return (
    <>
      <div className="sticky top-0 left-0 right-0 z-50">
        <div className="bg-white dark:bg-black/5 w-full">
          <div className="flex items-center justify-center w-full flex-col">
            <div
              className={`
                flex items-center justify-between
                bg-linear-to-b from-white/95 via-blue-50/90 to-white/95
                dark:from-zinc-900/95 dark:via-blue-950/40 dark:to-zinc-900/95
                shadow-[0_2px_20px_-2px_rgba(0,0,0,0.1)]
                backdrop-blur-md
                border-x border-b
                border-[rgba(210,225,245,0.8)]
                dark:border-[rgba(50,70,100,0.7)]
                w-full sm:min-w-[800px] sm:max-w-[1200px]
                rounded-b-[28px]
                px-4 py-2.5
                relative
                transition-all duration-300 ease-in-out
              `}
            >
              <div className="relative z-10 flex items-center justify-between w-full gap-2">

                {/* Logo Section with Navigation Links */}
                <div className="flex items-center gap-6 justify-center">
                  <Link
                    href="/"
                    className="flex items-center gap-2 justify-center"
                  >

                    

                    <span
                      className="
                        hidden sm:block
                        font-extrabold text-lg
                        bg-clip-text text-transparent
                        bg-gradient-to-r
                        from-blue-500
                        via-cyan-500
                        to-sky-500
                        dark:from-blue-400
                        dark:via-cyan-400
                        dark:to-sky-400
                      "
                    >
                      Orbit Code Editor
                    </span>
                  </Link>

                  <span className="text-blue-200 dark:text-blue-900">|</span>

                  {/* Desktop Navigation Links */}
                  <div className="hidden sm:flex items-center gap-4">
                    <Link
                      href="/docs/components/background-paths"
                      className="
                        text-sm
                        text-zinc-600
                        hover:text-cyan-600
                        dark:text-zinc-400
                        dark:hover:text-blue-400
                        transition-colors
                      "
                    >
                      Docs
                    </Link>

                    <Link
                      href="https://codesnippetui.pro/templates?utm_source=codesnippetui.com&utm_medium=header"
                      target="_blank"
                      className="
                        text-sm
                        text-zinc-600
                        hover:text-cyan-600
                        dark:text-zinc-400
                        dark:hover:text-blue-400
                        transition-colors
                        flex items-center gap-2
                      "
                    >
                      API

                      <span
                        className="
                          text-cyan-600
                          dark:text-cyan-400
                          border
                          border-cyan-500
                          dark:border-cyan-400
                          rounded-lg
                          px-1
                          py-0.5
                          text-xs
                        "
                      >
                        New
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Right Side Items */}
                <div className="hidden sm:flex items-center gap-3">
                  <span className="text-blue-200 dark:text-blue-900">|</span>

                  <ThemeToggle />
                  <UserButton />
                </div>

                {/* Mobile Navigation */}
                <div className="flex sm:hidden items-center gap-4">
                  <Link
                    href="/docs/components/action-search-bar"
                    className="
                      text-sm
                      text-zinc-600
                      hover:text-blue-600
                      dark:text-zinc-400
                      dark:hover:text-blue-400
                      transition-colors
                    "
                  >
                    Docs
                  </Link>

                  <Link
                    href="/pricing"
                    className="
                      text-sm
                      text-zinc-600
                      hover:text-blue-600
                      dark:text-zinc-400
                      dark:hover:text-blue-400
                      transition-colors
                    "
                  >
                    API
                  </Link>

                  <ThemeToggle />
                  <UserButton />
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}