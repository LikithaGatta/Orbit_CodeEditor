"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LoadingStep from "@/modules/playground/components/loader";
import { PlaygroundEditor } from "@/modules/playground/components/playground-editor";
import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";
import ToggleAI from "@/modules/playground/components/toggle-ai";
import { useAISuggestions } from "@/modules/playground/hooks/useAISuggestion";
import { useFileExplorer } from "@/modules/playground/hooks/useFileExplorer";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import { findFilePath } from "@/modules/playground/lib";
import {
  TemplateFile,
  TemplateFolder,
} from "@/modules/playground/lib/path-to-json";
import WebContainerPreview from "@/modules/webcontainers/components/webcontainer-preview";
import { useWebContainer } from "@/modules/webcontainers/hooks/useWebContainer";
import {
  AlertCircle,
  Bot,
  FileText,
  FolderOpen,
  Save,
  Settings,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const MainPlaygroundPage = () => {
  const { id } = useParams<{ id: string }>();
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);

  const aiSuggestions = useAISuggestions();

  const {
    setTemplateData,
    setActiveFileId,
    setPlaygroundId,
    setOpenFiles,
    activeFileId,
    closeAllFiles,
    closeFile,
    openFile,
    openFiles,
    handleAddFile,
    handleAddFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleRenameFile,
    handleRenameFolder,
    updateFileContent,
  } = useFileExplorer();

  const {
    serverUrl,
    isLoading: containerLoading,
    error: containerError,
    instance,
    writeFileSync,
    // @ts-ignore
  } = useWebContainer({ templateData });

  const lastSyncedContent = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    setPlaygroundId(id);
  }, [id, setPlaygroundId]);

  useEffect(() => {
    if (templateData && !openFiles.length) {
      setTemplateData(templateData);
    }
  }, [templateData, setTemplateData, openFiles.length]);

  // ============================================================
  // File actions
  // ============================================================

  const wrappedHandleAddFile = useCallback(
    (newFile: TemplateFile, parentPath: string) => {
      return handleAddFile(
        newFile,
        parentPath,
        writeFileSync!,
        instance,
        saveTemplateData
      );
    },
    [handleAddFile, writeFileSync, instance, saveTemplateData]
  );

  const wrappedHandleAddFolder = useCallback(
    (newFolder: TemplateFolder, parentPath: string) => {
      return handleAddFolder(
        newFolder,
        parentPath,
        instance,
        saveTemplateData
      );
    },
    [handleAddFolder, instance, saveTemplateData]
  );

  const wrappedHandleDeleteFile = useCallback(
    (file: TemplateFile, parentPath: string) => {
      return handleDeleteFile(file, parentPath, saveTemplateData);
    },
    [handleDeleteFile, saveTemplateData]
  );

  const wrappedHandleDeleteFolder = useCallback(
    (folder: TemplateFolder, parentPath: string) => {
      return handleDeleteFolder(folder, parentPath, saveTemplateData);
    },
    [handleDeleteFolder, saveTemplateData]
  );

  const wrappedHandleRenameFile = useCallback(
    (
      file: TemplateFile,
      newFilename: string,
      newExtension: string,
      parentPath: string
    ) => {
      return handleRenameFile(
        file,
        newFilename,
        newExtension,
        parentPath,
        saveTemplateData
      );
    },
    [handleRenameFile, saveTemplateData]
  );

  const wrappedHandleRenameFolder = useCallback(
    (folder: TemplateFolder, newFolderName: string, parentPath: string) => {
      return handleRenameFolder(
        folder,
        newFolderName,
        parentPath,
        saveTemplateData
      );
    },
    [handleRenameFolder, saveTemplateData]
  );

  const activeFile = openFiles.find((file) => file.id === activeFileId);
  const hasUnsavedChanges = openFiles.some(
    (file) => file.hasUnsavedChanges
  );

  const handleFileSelect = (file: TemplateFile) => {
    openFile(file);
  };

  // ============================================================
  // Save
  // ============================================================

  const handleSave = useCallback(
    async (fileId?: string) => {
      const targetFileId = fileId || activeFileId;

      if (!targetFileId) return;

      const fileToSave = openFiles.find((f) => f.id === targetFileId);

      if (!fileToSave) return;

      const latestTemplateData = useFileExplorer.getState().templateData;

      if (!latestTemplateData) return;

      try {
        const filePath = findFilePath(fileToSave, latestTemplateData);

        if (!filePath) {
          toast.error(
            `Could not find path for file: ${fileToSave.filename}.${fileToSave.fileExtension}`
          );
          return;
        }

        const updatedTemplateData = JSON.parse(
          JSON.stringify(latestTemplateData)
        );

        const updateFileContent = (items: (TemplateFile | TemplateFolder)[]): (TemplateFile | TemplateFolder)[] => {
          return items.map((item) => {
            if ("folderName" in item) {
              return {
                ...item,
                items: updateFileContent(item.items),
              };
            }

            if (
              item.filename === fileToSave.filename &&
              item.fileExtension === fileToSave.fileExtension
            ) {
              return {
                ...item,
                content: fileToSave.content,
              };  
            }

            return item;
          });
        };


        updatedTemplateData.items = updateFileContent(
          updatedTemplateData.items
        );

        // Sync with WebContainer
        if (writeFileSync) {
          await writeFileSync(filePath, fileToSave.content);

          lastSyncedContent.current.set(
            fileToSave.id,
            fileToSave.content
          );

          if (instance && instance.fs) {
            await instance.fs.writeFile(
              filePath,
              fileToSave.content
            );
          }
        }

        // Save to database
        await saveTemplateData(updatedTemplateData);

        setTemplateData(updatedTemplateData);

        // Update open files
        const updatedOpenFiles = openFiles.map((f) =>
          f.id === targetFileId
            ? {
                ...f,
                content: fileToSave.content,
                originalContent: fileToSave.content,
                hasUnsavedChanges: false,
              }
            : f
        );

        setOpenFiles(updatedOpenFiles);

        toast.success(
          `Saved ${fileToSave.filename}.${fileToSave.fileExtension}`
        );
      } catch (error) {
        console.error("Error saving file:", error);

        toast.error(
          `Failed to save ${fileToSave.filename}.${fileToSave.fileExtension}`
        );

        throw error;
      }
    },
    [
      activeFileId,
      openFiles,
      writeFileSync,
      instance,
      saveTemplateData,
      setTemplateData,
      setOpenFiles,
    ]
  );

  const handleSaveAll = async () => {
    const unsavedFiles = openFiles.filter(
      (file) => file.hasUnsavedChanges
    );

    if (unsavedFiles.length === 0) {
      toast.info("No unsaved changes");
      return;
    }

    try {
      await Promise.all(
        unsavedFiles.map((file) => handleSave(file.id))
      );

      toast.success(`Saved ${unsavedFiles.length} file(s)`);
    } catch (error) {
      toast.error("Failed to save some files");
    }
  };

  // ============================================================
  // Keyboard shortcuts
  // ============================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // ============================================================
  // Error state
  // ============================================================

  if (error) {
    return (
      <div
        className="
          flex flex-col items-center justify-center
          h-[calc(100vh-4rem)]
          p-4
          bg-gradient-to-br
          from-white
          via-blue-50
          to-cyan-50
          dark:from-zinc-950
          dark:via-blue-950/30
          dark:to-cyan-950/20
        "
      >
        <div
          className="
            flex flex-col items-center
            p-8 rounded-2xl
            border
            border-blue-100
            dark:border-blue-900/50
            bg-white/80
            dark:bg-zinc-950/70
            backdrop-blur-md
            shadow-[0_10px_40px_-10px_rgba(37,99,235,0.25)]
          "
        >
          <AlertCircle className="h-12 w-12 text-blue-500 mb-4" />

          <h2
            className="
              text-xl font-semibold mb-2
              bg-gradient-to-r
              from-blue-500
              via-cyan-500
              to-sky-500
              bg-clip-text
              text-transparent
            "
          >
            Something went wrong
          </h2>

          <p className="text-blue-900/70 dark:text-blue-200/70 mb-4">
            {error}
          </p>

          <Button
            onClick={() => window.location.reload()}
            className="
              bg-gradient-to-r
              from-blue-600
              via-cyan-600
              to-sky-600
              hover:from-blue-700
              hover:via-cyan-700
              hover:to-sky-700
              text-white
              shadow-lg
              shadow-blue-500/20
            "
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Loading state
  // ============================================================

  if (isLoading) {
    return (
      <div
        className="
          flex flex-col items-center justify-center
          h-[calc(100vh-4rem)]
          p-4
          bg-gradient-to-br
          from-white
          via-blue-50
          to-cyan-50
          dark:from-zinc-950
          dark:via-blue-950/30
          dark:to-cyan-950/20
        "
      >
        <div
          className="
            w-full max-w-md
            p-6 rounded-2xl
            border
            border-blue-100
            dark:border-blue-900/50
            bg-white/80
            dark:bg-zinc-950/70
            backdrop-blur-md
            shadow-[0_10px_40px_-10px_rgba(37,99,235,0.2)]
          "
        >
          <h2
            className="
              text-xl font-semibold mb-6 text-center
              bg-gradient-to-r
              from-blue-500
              via-cyan-500
              to-sky-500
              bg-clip-text
              text-transparent
            "
          >
            Loading Playground
          </h2>

          <div className="mb-8">
            <LoadingStep
              currentStep={1}
              step={1}
              label="Loading playground data"
            />

            <LoadingStep
              currentStep={2}
              step={2}
              label="Setting up environment"
            />

            <LoadingStep
              currentStep={3}
              step={3}
              label="Ready to code"
            />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // No template data
  // ============================================================

  if (!templateData) {
    return (
      <div
        className="
          flex flex-col items-center justify-center
          h-[calc(100vh-4rem)]
          p-4
          bg-gradient-to-br
          from-white
          via-blue-50
          to-cyan-50
          dark:from-zinc-950
          dark:via-blue-950/30
          dark:to-cyan-950/20
        "
      >
        <FolderOpen className="h-12 w-12 text-cyan-500 mb-4" />

        <h2
          className="
            text-xl font-semibold mb-2
            bg-gradient-to-r
            from-blue-500
            via-cyan-500
            to-sky-500
            bg-clip-text
            text-transparent
          "
        >
          No template data available
        </h2>

        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="
            border-blue-200
            text-blue-600
            hover:bg-blue-50
            hover:text-cyan-600
            dark:border-blue-800
            dark:text-blue-400
            dark:hover:bg-blue-950/40
          "
        >
          Reload Template
        </Button>
      </div>
    );
  }

  // ============================================================
  // Main playground
  // ============================================================

  return (
    <TooltipProvider>
      <div
        className="
          min-h-full
          bg-gradient-to-br
          from-white
          via-blue-50/50
          to-cyan-50/70
          dark:from-zinc-950
          dark:via-blue-950/20
          dark:to-cyan-950/20
        "
      >
        <TemplateFileTree
          data={templateData}
          onFileSelect={handleFileSelect}
          selectedFile={activeFile}
          title="File Explorer"
          onAddFile={wrappedHandleAddFile}
          onAddFolder={wrappedHandleAddFolder}
          onDeleteFile={wrappedHandleDeleteFile}
          onDeleteFolder={wrappedHandleDeleteFolder}
          onRenameFile={wrappedHandleRenameFile}
          onRenameFolder={wrappedHandleRenameFolder}
        />

        <SidebarInset
          className="
            bg-transparent
          "
        >
          {/* ================================================== */}
          {/* Header */}
          {/* ================================================== */}

          <header
            className="
              flex h-16 shrink-0 items-center gap-2
              border-b
              border-blue-100/80
              dark:border-blue-900/50
              px-4
              bg-gradient-to-r
              from-white/95
              via-blue-50/90
              to-white/95
              dark:from-zinc-900/95
              dark:via-blue-950/40
              dark:to-zinc-900/95
              backdrop-blur-md
              shadow-[0_2px_20px_-2px_rgba(37,99,235,0.12)]
            "
          >
            <SidebarTrigger
              className="
                text-blue-600
                hover:text-cyan-600
                hover:bg-blue-50
                dark:text-blue-400
                dark:hover:text-cyan-400
                dark:hover:bg-blue-950/40
              "
            />

            <Separator
              orientation="vertical"
              className="
                mr-2 h-4
                bg-blue-200
                dark:bg-blue-900
              "
            />

            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-col flex-1">
                <h1
                  className="
                    text-sm font-semibold
                    bg-gradient-to-r
                    from-blue-600
                    via-cyan-600
                    to-sky-600
                    dark:from-blue-400
                    dark:via-cyan-400
                    dark:to-sky-400
                    bg-clip-text
                    text-transparent
                  "
                >
                  {playgroundData?.title || "Code Playground"}
                </h1>

                <p className="text-xs text-blue-700/60 dark:text-blue-300/60">
                  {openFiles.length} File(s) Open
                  {hasUnsavedChanges && " • Unsaved changes"}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {/* Save */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave()}
                      disabled={
                        !activeFile || !activeFile.hasUnsavedChanges
                      }
                      className="
                        border-blue-200
                        text-blue-600
                        hover:text-cyan-600
                        hover:bg-blue-50
                        hover:border-cyan-300
                        dark:border-blue-800
                        dark:text-blue-400
                        dark:hover:bg-blue-950/40
                        dark:hover:border-cyan-700
                      "
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent>
                    Save (Ctrl+S)
                  </TooltipContent>
                </Tooltip>

                {/* Save All */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveAll}
                      disabled={!hasUnsavedChanges}
                      className="
                        border-blue-200
                        text-blue-600
                        hover:text-cyan-600
                        hover:bg-blue-50
                        hover:border-cyan-300
                        dark:border-blue-800
                        dark:text-blue-400
                        dark:hover:bg-blue-950/40
                        dark:hover:border-cyan-700
                      "
                    >
                      <Save className="h-4 w-4" />
                      <span className="ml-1">All</span>
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent>
                    Save All (Ctrl+Shift+S)
                  </TooltipContent>
                </Tooltip>

                {/* AI */}
                <ToggleAI
                  isEnabled={aiSuggestions.isEnabled}
                  onToggle={aiSuggestions.toggleEnabled}
                  suggestionLoading={aiSuggestions.isLoading}
                />

                {/* Settings */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="
                        border-blue-200
                        text-blue-600
                        hover:text-cyan-600
                        hover:bg-blue-50
                        hover:border-cyan-300
                        dark:border-blue-800
                        dark:text-blue-400
                        dark:hover:bg-blue-950/40
                        dark:hover:border-cyan-700
                      "
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="
                      border-blue-100
                      dark:border-blue-900
                      bg-white/95
                      dark:bg-zinc-950/95
                      backdrop-blur-md
                    "
                  >
                    <DropdownMenuItem
                      onClick={() =>
                        setIsPreviewVisible(!isPreviewVisible)
                      }
                      className="
                        focus:bg-blue-50
                        focus:text-blue-600
                        dark:focus:bg-blue-950/40
                        dark:focus:text-blue-400
                      "
                    >
                      {isPreviewVisible ? "Hide" : "Show"} Preview
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-blue-100 dark:bg-blue-900" />

                    <DropdownMenuItem
                      onClick={closeAllFiles}
                      className="
                        focus:bg-blue-50
                        focus:text-blue-600
                        dark:focus:bg-blue-950/40
                        dark:focus:text-blue-400
                      "
                    >
                      Close All Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* ================================================== */}
          {/* Editor area */}
          {/* ================================================== */}

          <div className="h-[calc(100vh-4rem)]">
            {openFiles.length > 0 ? (
              <div className="h-full flex flex-col">
                {/* Tabs */}
                <div
                  className="
                    border-b
                    border-blue-100
                    dark:border-blue-900/60
                    bg-gradient-to-r
                    from-white/90
                    via-blue-50/70
                    to-cyan-50/70
                    dark:from-zinc-900/90
                    dark:via-blue-950/30
                    dark:to-cyan-950/20
                    backdrop-blur-md
                  "
                >
                  <Tabs
                    value={activeFileId || ""}
                    onValueChange={setActiveFileId}
                  >
                    <div className="flex items-center justify-between px-4 py-2">
                      <TabsList
                        className="
                          h-8
                          bg-transparent
                          p-0
                        "
                      >
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className="
                              relative
                              h-8
                              px-3
                              text-blue-700/70
                              hover:text-blue-600
                              data-[state=active]:bg-white
                              data-[state=active]:text-blue-600
                              data-[state=active]:shadow-sm
                              data-[state=active]:shadow-blue-500/10
                              dark:text-blue-300/70
                              dark:hover:text-blue-300
                              dark:data-[state=active]:bg-zinc-900
                              dark:data-[state=active]:text-cyan-400
                              group
                            "
                          >
                            <div className="flex items-center gap-2">
                              <FileText
                                className="
                                  h-3 w-3
                                  text-blue-500
                                  dark:text-blue-400
                                "
                              />

                              <span>
                                {file.filename}.{file.fileExtension}
                              </span>

                              {file.hasUnsavedChanges && (
                                <span
                                  className="
                                    h-2 w-2
                                    rounded-full
                                    bg-gradient-to-r
                                    from-blue-500
                                    to-cyan-500
                                    shadow-[0_0_8px_rgba(6,182,212,0.7)]
                                  "
                                />
                              )}

                              <span
                                className="
                                  ml-2
                                  h-4 w-4
                                  rounded-sm
                                  flex items-center justify-center
                                  opacity-0
                                  group-hover:opacity-100
                                  transition-opacity
                                  cursor-pointer
                                  text-blue-500
                                  hover:bg-red-500
                                  hover:text-white
                                "
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeFile(file.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {openFiles.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={closeAllFiles}
                          className="
                            h-6
                            px-2
                            text-xs
                            text-blue-600
                            hover:text-cyan-600
                            hover:bg-blue-50
                            dark:text-blue-400
                            dark:hover:text-cyan-400
                            dark:hover:bg-blue-950/40
                          "
                        >
                          Close All
                        </Button>
                      )}
                    </div>
                  </Tabs>
                </div>

                {/* Editor + Preview */}
                <div className="flex-1">
                  <ResizablePanelGroup
                    orientation="horizontal"
                    className="h-full"
                  >
                    <ResizablePanel
                      defaultSize={isPreviewVisible ? 50 : 100}
                      className="
                        bg-white
                        dark:bg-zinc-950
                      "
                    >
                      <PlaygroundEditor
                        activeFile={activeFile}
                        content={activeFile?.content || ""}
                        onContentChange={(value) =>
                          activeFileId &&
                          updateFileContent(activeFileId, value)
                        }
                        suggestion={aiSuggestions.suggestion}
                        suggestionLoading={aiSuggestions.isLoading}
                        suggestionPosition={aiSuggestions.position}
                        onAcceptSuggestion={(editor, monaco) =>
                          aiSuggestions.acceptSuggestion(
                            editor,
                            monaco
                          )
                        }
                        onRejectSuggestion={(editor) =>
                          aiSuggestions.rejectSuggestion(editor)
                        }
                        onTriggerSuggestion={(type, editor) =>
                          aiSuggestions.fetchSuggestion(
                            type,
                            editor
                          )
                        }
                      />
                    </ResizablePanel>

                    {isPreviewVisible && (
                      <>
                        <ResizableHandle
                          className="
                            bg-blue-100
                            hover:bg-gradient-to-b
                            hover:from-blue-400
                            hover:via-cyan-400
                            hover:to-sky-400
                            dark:bg-blue-900
                          "
                        />

                        <ResizablePanel
                          defaultSize={50}
                          className="
                            bg-gradient-to-br
                            from-white
                            via-blue-50/30
                            to-cyan-50/40
                            dark:from-zinc-950
                            dark:via-blue-950/10
                            dark:to-cyan-950/10
                          "
                        >
                          <WebContainerPreview
                            templateData={templateData}
                            instance={instance}
                            writeFileSync={writeFileSync}
                            isLoading={containerLoading}
                            error={containerError}
                            serverUrl={serverUrl!}
                            forceResetup={false}
                          />
                        </ResizablePanel>
                      </>
                    )}
                  </ResizablePanelGroup>
                </div>
              </div>
            ) : (
              <div
                className="
                  flex flex-col h-full
                  items-center justify-center
                  text-blue-400/70
                  dark:text-blue-300/50
                  gap-4
                  bg-gradient-to-br
                  from-white
                  via-blue-50/50
                  to-cyan-50/60
                  dark:from-zinc-950
                  dark:via-blue-950/20
                  dark:to-cyan-950/20
                "
              >
                <div
                  className="
                    p-5
                    rounded-2xl
                    bg-gradient-to-br
                    from-blue-50
                    via-cyan-50
                    to-sky-50
                    dark:from-blue-950/40
                    dark:via-cyan-950/30
                    dark:to-sky-950/20
                    border
                    border-blue-100
                    dark:border-blue-900/50
                    shadow-[0_10px_30px_-10px_rgba(37,99,235,0.2)]
                  "
                >
                  <FileText
                    className="
                      h-16 w-16
                      text-blue-400
                      dark:text-blue-500
                    "
                  />
                </div>

                <div className="text-center">
                  <p
                    className="
                      text-lg font-semibold
                      bg-gradient-to-r
                      from-blue-500
                      via-cyan-500
                      to-sky-500
                      bg-clip-text
                      text-transparent
                    "
                  >
                    No files open
                  </p>

                  <p
                    className="
                      text-sm
                      text-blue-700/60
                      dark:text-blue-300/50
                    "
                  >
                    Select a file from the sidebar to start editing
                  </p>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;
