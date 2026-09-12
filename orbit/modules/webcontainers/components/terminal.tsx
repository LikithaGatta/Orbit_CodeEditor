"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { Terminal as XTerm } from "xterm";
import type { FitAddon as XTermFitAddon } from "xterm-addon-fit";
import type { SearchAddon as XTermSearchAddon } from "xterm-addon-search";
import "xterm/css/xterm.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalProps {
  webcontainerUrl?: string;
  className?: string;
  theme?: "dark" | "light";
  webContainerInstance?: any;
}

export interface TerminalRef {
  writeToTerminal: (data: string) => void;
  clearTerminal: () => void;
  focusTerminal: () => void;
}

const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(
  (
    {
      webcontainerUrl,
      className,
      theme = "dark",
      webContainerInstance,
    },
    ref
  ) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<XTerm | null>(null);
    const fitAddon = useRef<XTermFitAddon | null>(null);
    const searchAddon = useRef<XTermSearchAddon | null>(null);

    const [isConnected, setIsConnected] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    const currentLine = useRef<string>("");
    const cursorPosition = useRef<number>(0);
    const commandHistory = useRef<string[]>([]);
    const historyIndex = useRef<number>(-1);
    const currentProcess = useRef<any>(null);
    const shellProcess = useRef<any>(null);

    const terminalThemes = {
      dark: {
        background: "#09090B",
        foreground: "#FAFAFA",
        cursor: "#FAFAFA",
        cursorAccent: "#09090B",
        selection: "#27272A",
        black: "#18181B",
        red: "#EF4444",
        green: "#22C55E",
        yellow: "#EAB308",
        blue: "#3B82F6",
        magenta: "#A855F7",
        cyan: "#06B6D4",
        white: "#F4F4F5",
        brightBlack: "#3F3F46",
        brightRed: "#F87171",
        brightGreen: "#4ADE80",
        brightYellow: "#FDE047",
        brightBlue: "#60A5FA",
        brightMagenta: "#C084FC",
        brightCyan: "#22D3EE",
        brightWhite: "#FFFFFF",
      },
      light: {
        background: "#FFFFFF",
        foreground: "#18181B",
        cursor: "#18181B",
        cursorAccent: "#FFFFFF",
        selection: "#E4E4E7",
        black: "#18181B",
        red: "#DC2626",
        green: "#16A34A",
        yellow: "#CA8A04",
        blue: "#2563EB",
        magenta: "#9333EA",
        cyan: "#0891B2",
        white: "#F4F4F5",
        brightBlack: "#71717A",
        brightRed: "#EF4444",
        brightGreen: "#22C55E",
        brightYellow: "#EAB308",
        brightBlue: "#3B82F6",
        brightMagenta: "#A855F7",
        brightCyan: "#06B6D4",
        brightWhite: "#FAFAFA",
      },
    };

    const writePrompt = useCallback(() => {
      const terminal = term.current;

      if (!terminal) {
        return;
      }

      terminal.write("\r\n$ ");
      currentLine.current = "";
      cursorPosition.current = 0;
    }, []);

    const clearTerminal = useCallback(() => {
      const terminal = term.current;

      if (!terminal) {
        return;
      }

      terminal.clear();
      terminal.writeln("🚀 WebContainer Terminal");
      writePrompt();
    }, [writePrompt]);

    useImperativeHandle(
      ref,
      () => ({
        writeToTerminal: (data: string) => {
          const terminal = term.current;

          if (terminal) {
            terminal.write(data);
          }
        },

        clearTerminal: () => {
          clearTerminal();
        },

        focusTerminal: () => {
          const terminal = term.current;

          if (terminal) {
            terminal.focus();
          }
        },
      }),
      [clearTerminal]
    );

    const executeCommand = useCallback(
      async (command: string) => {
        const terminal = term.current;

        if (!webContainerInstance || !terminal) {
          return;
        }

        if (
          command.trim() &&
          commandHistory.current[
            commandHistory.current.length - 1
          ] !== command
        ) {
          commandHistory.current.push(command);
        }

        historyIndex.current = -1;

        try {
          if (command.trim() === "clear") {
            terminal.clear();
            writePrompt();
            return;
          }

          if (command.trim() === "history") {
            commandHistory.current.forEach((cmd, index) => {
              if (term.current) {
                term.current.writeln(`  ${index + 1}  ${cmd}`);
              }
            });

            writePrompt();
            return;
          }

          if (command.trim() === "") {
            writePrompt();
            return;
          }

          const parts = command.trim().split(/\s+/);
          const cmd = parts[0];
          const args = parts.slice(1);

          terminal.writeln("");

          const process = await webContainerInstance.spawn(cmd, args, {
            terminal: {
              cols: terminal.cols,
              rows: terminal.rows,
            },
          });

          currentProcess.current = process;

          process.output.pipeTo(
            new WritableStream({
              write(data) {
                const activeTerminal = term.current;

                if (activeTerminal) {
                  activeTerminal.write(data);
                }
              },
            })
          );

          const exitCode = await process.exit;

          currentProcess.current = null;

          if (exitCode !== 0) {
            terminal.writeln(
              `\r\nProcess exited with code ${exitCode}`
            );
          }

          writePrompt();
        } catch (error) {
          const activeTerminal = term.current;

          if (activeTerminal) {
            activeTerminal.writeln(
              `\r\nCommand failed: ${command}`
            );
            writePrompt();
          }

          currentProcess.current = null;

          console.error("Command execution error:", error);
        }
      },
      [webContainerInstance, writePrompt]
    );

    const handleTerminalInput = useCallback(
      (data: string) => {
        const terminal = term.current;

        if (!terminal) {
          return;
        }

        switch (data) {
          case "\r":
            executeCommand(currentLine.current);
            break;

          case "\u007F":
            if (cursorPosition.current > 0) {
              currentLine.current =
                currentLine.current.slice(
                  0,
                  cursorPosition.current - 1
                ) +
                currentLine.current.slice(cursorPosition.current);

              cursorPosition.current--;

              terminal.write("\b \b");
            }
            break;

          case "\u0003":
            if (currentProcess.current) {
              currentProcess.current.kill();
              currentProcess.current = null;
            }

            terminal.writeln("^C");
            writePrompt();
            break;

          case "\u001b[A":
            if (commandHistory.current.length > 0) {
              if (historyIndex.current === -1) {
                historyIndex.current =
                  commandHistory.current.length - 1;
              } else if (historyIndex.current > 0) {
                historyIndex.current--;
              }

              const historyCommand =
                commandHistory.current[historyIndex.current];

              terminal.write(
                "\r$ " +
                  " ".repeat(currentLine.current.length) +
                  "\r$ "
              );

              terminal.write(historyCommand);

              currentLine.current = historyCommand;
              cursorPosition.current = historyCommand.length;
            }
            break;

          case "\u001b[B":
            if (historyIndex.current !== -1) {
              if (
                historyIndex.current <
                commandHistory.current.length - 1
              ) {
                historyIndex.current++;

                const historyCommand =
                  commandHistory.current[historyIndex.current];

                terminal.write(
                  "\r$ " +
                    " ".repeat(currentLine.current.length) +
                    "\r$ "
                );

                terminal.write(historyCommand);

                currentLine.current = historyCommand;
                cursorPosition.current = historyCommand.length;
              } else {
                historyIndex.current = -1;

                terminal.write(
                  "\r$ " +
                    " ".repeat(currentLine.current.length) +
                    "\r$ "
                );

                currentLine.current = "";
                cursorPosition.current = 0;
              }
            }
            break;

          default:
            if (data >= " " || data === "\t") {
              currentLine.current =
                currentLine.current.slice(
                  0,
                  cursorPosition.current
                ) +
                data +
                currentLine.current.slice(cursorPosition.current);

              cursorPosition.current++;
              terminal.write(data);
            }
            break;
        }
      },
      [executeCommand, writePrompt]
    );

    const initializeTerminal = useCallback(async () => {
      if (!terminalRef.current || term.current) {
        return;
      }

      const [
        { Terminal },
        { FitAddon },
        { WebLinksAddon },
        { SearchAddon },
      ] = await Promise.all([
        import("xterm"),
        import("xterm-addon-fit"),
        import("xterm-addon-web-links"),
        import("xterm-addon-search"),
      ]);

      if (!terminalRef.current || term.current) {
        return;
      }

      const terminal = new Terminal({
        cursorBlink: true,
        fontFamily:
          '"Fira Code", "JetBrains Mono", "Consolas", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        letterSpacing: 0,
        theme: terminalThemes[theme],
        allowTransparency: false,
        convertEol: true,
        scrollback: 1000,
        tabStopWidth: 4,
      });

      const fitAddonInstance = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddonInstance = new SearchAddon();

      terminal.loadAddon(fitAddonInstance);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(searchAddonInstance);

      terminal.open(terminalRef.current);

      term.current = terminal;
      fitAddon.current = fitAddonInstance;
      searchAddon.current = searchAddonInstance;

      terminal.onData(handleTerminalInput);

      requestAnimationFrame(() => {
        if (term.current !== terminal) {
          return;
        }

        try {
          fitAddonInstance.fit();
        } catch (error) {
          console.warn("Initial terminal fit failed:", error);
        }
      });

      terminal.writeln("🚀 WebContainer Terminal");
      terminal.writeln("Type 'help' for available commands");
      writePrompt();
    }, [theme, handleTerminalInput, writePrompt]);

    const connectToWebContainer = useCallback(async () => {
      const terminal = term.current;

      if (!webContainerInstance || !terminal) {
        return;
      }

      try {
        setIsConnected(true);
        terminal.writeln("✅ Connected to WebContainer");
        terminal.writeln("Ready to execute commands");
        writePrompt();
      } catch (error) {
        setIsConnected(false);

        if (term.current) {
          term.current.writeln(
            "❌ Failed to connect to WebContainer"
          );
        }

        console.error(
          "WebContainer connection error:",
          error
        );
      }
    }, [webContainerInstance, writePrompt]);

    const copyTerminalContent = useCallback(async () => {
      const terminal = term.current;

      if (!terminal) {
        return;
      }

      const content = terminal.getSelection();

      if (!content) {
        return;
      }

      try {
        await navigator.clipboard.writeText(content);
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
      }
    }, []);

    const downloadTerminalLog = useCallback(() => {
      const terminal = term.current;

      if (!terminal) {
        return;
      }

      const buffer = terminal.buffer.active;
      let content = "";

      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);

        if (line) {
          content += line.translateToString(true) + "\n";
        }
      }

      const blob = new Blob([content], {
        type: "text/plain",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `terminal-log-${new Date()
        .toISOString()
        .slice(0, 19)}.txt`;

      anchor.click();

      URL.revokeObjectURL(url);
    }, []);

    const searchInTerminal = useCallback((value: string) => {
      const addon = searchAddon.current;

      if (addon && value) {
        addon.findNext(value);
      }
    }, []);

    useEffect(() => {
      let disposed = false;

      const setupTerminal = async () => {
        await initializeTerminal();

        if (disposed) {
          return;
        }
      };

      setupTerminal();

      const resizeObserver = new ResizeObserver(() => {
        if (disposed) {
          return;
        }

        requestAnimationFrame(() => {
          if (disposed) {
            return;
          }

          const terminal = term.current;
          const fitAddonInstance = fitAddon.current;

          if (!terminal || !fitAddonInstance) {
            return;
          }

          try {
            fitAddonInstance.fit();
          } catch (error) {
            console.warn(
              "Terminal resize skipped:",
              error
            );
          }
        });
      });

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      return () => {
        disposed = true;
        resizeObserver.disconnect();

        if (currentProcess.current) {
          currentProcess.current.kill();
          currentProcess.current = null;
        }

        if (shellProcess.current) {
          shellProcess.current.kill();
          shellProcess.current = null;
        }

        const terminal = term.current;

        term.current = null;
        fitAddon.current = null;
        searchAddon.current = null;

        if (terminal) {
          terminal.dispose();
        }
      };
    }, [initializeTerminal]);

    useEffect(() => {
      if (
        webContainerInstance &&
        term.current &&
        !isConnected
      ) {
        connectToWebContainer();
      }
    }, [
      webContainerInstance,
      connectToWebContainer,
      isConnected,
    ]);

    return (
      <div
        className={cn(
          "flex flex-col h-full bg-background border rounded-lg overflow-hidden",
          className
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>

            <span className="text-sm font-medium">
              WebContainer Terminal
            </span>

            {isConnected && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Connected
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {showSearch && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    searchInTerminal(event.target.value);
                  }}
                  className="h-6 w-32 text-xs"
                />
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch((value) => !value)}
              className="h-6 w-6 p-0"
            >
              <Search className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={copyTerminalContent}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={downloadTerminalLog}
              className="h-6 w-6 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearTerminal}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 relative">
          <div
            ref={terminalRef}
            className="absolute inset-0 p-2"
            style={{
              background: terminalThemes[theme].background,
            }}
          />
        </div>
      </div>
    );
  }
);

TerminalComponent.displayName = "TerminalComponent";

export default TerminalComponent;