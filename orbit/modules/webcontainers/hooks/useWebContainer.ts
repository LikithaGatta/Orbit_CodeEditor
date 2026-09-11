"use client";

import { useState, useEffect, useCallback } from "react";
import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContaierReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destory: () => void;
}

// Keep one WebContainer instance for the entire browser page
let webContainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export const useWebContainer = ({
  templateData,
}: UseWebContainerProps): UseWebContaierReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(
    webContainerInstance
  );

  useEffect(() => {
    let mounted = true;

    async function initializeWebContainer() {
      try {
        // If WebContainer is already booted, reuse it
        if (webContainerInstance) {
          if (mounted) {
            setInstance(webContainerInstance);
            setIsLoading(false);
          }
          return;
        }

        // If another component is already booting WebContainer,
        // wait for that same boot operation instead of booting again.
        if (!bootPromise) {
          bootPromise = WebContainer.boot();
        }

        const container = await bootPromise;

        webContainerInstance = container;

        if (!mounted) return;

        setInstance(container);
        setIsLoading(false);
      } catch (error) {
        console.error(
          "Failed to initialize WebContainer:",
          error
        );

        if (mounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to initialize WebContainer"
          );
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();

    return () => {
      mounted = false;
    };
  }, []);

  const writeFileSync = useCallback(
    async (path: string, content: string) => {
      if (!instance) {
        throw new Error(
          "WebContainer instance is not available"
        );
      }

      await instance.fs.writeFile(path, content);
    },
    [instance]
  );

  const destory = useCallback(() => {
    if (webContainerInstance) {
      webContainerInstance.teardown();

      webContainerInstance = null;
      bootPromise = null;

      setInstance(null);
      setServerUrl(null);
    }
  }, []);

  return {
    serverUrl,
    isLoading,
    error,
    instance,
    writeFileSync,
    destory,
  };
};