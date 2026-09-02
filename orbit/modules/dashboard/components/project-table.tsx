"use client";

import Image from "next/image";
import { format } from "date-fns";
import type { Project } from "../types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useState } from "react";
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Download,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { MarkedToggleButton } from "./marked-toggle";

interface ProjectTableProps {
  projects: Project[];
  onUpdateProject?: (
    id: string,
    data: { title: string; description: string }
  ) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  onDuplicateProject?: (id: string) => Promise<void>;
}

interface EditProjectData {
  title: string;
  description: string;
}

export default function ProjectTable({
  projects,
  onUpdateProject,
  onDeleteProject,
  onDuplicateProject,
}: ProjectTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [editData, setEditData] = useState<EditProjectData>({
    title: "",
    description: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleEditClick = (project: Project) => {
    setSelectedProject(project);

    setEditData({
      title: project.title,
      description: project.description || "",
    });

    setEditDialogOpen(true);
  };

  const handleDeleteClick = async (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !onUpdateProject) return;

    setIsLoading(true);

    try {
      await onUpdateProject(selectedProject.id, editData);

      setEditDialogOpen(false);

      toast.success("Project updated successfully");
    } catch (error) {
      toast.error("Failed to update project");
      console.error("Error updating project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject || !onDeleteProject) return;

    setIsLoading(true);

    try {
      await onDeleteProject(selectedProject.id);

      setDeleteDialogOpen(false);
      setSelectedProject(null);

      toast.success("Project deleted successfully");
    } catch (error) {
      toast.error("Failed to delete project");
      console.error("Error deleting project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    if (!onDuplicateProject) return;

    setIsLoading(true);

    try {
      await onDuplicateProject(project.id);

      toast.success("Project duplicated successfully");
    } catch (error) {
      toast.error("Failed to duplicate project");
      console.error("Error duplicating project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyProjectUrl = (projectId: string) => {
    const url = `${window.location.origin}/playground/${projectId}`;

    navigator.clipboard.writeText(url);

    toast.success("Project URL copied to clipboard");
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-sky-950/30">
              <TableHead>Project</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {projects.map((project) => (
              <TableRow
                key={project.id}
                className="transition-colors hover:bg-gradient-to-r hover:from-blue-50/50 hover:via-cyan-50/50 hover:to-sky-50/50 dark:hover:from-blue-950/20 dark:hover:via-cyan-950/20 dark:hover:to-sky-950/20"
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <Link
                      href={`/playground/${project.id}`}
                      className="hover:text-cyan-600 transition-colors"
                    >
                      <span className="font-semibold">
                        {project.title}
                      </span>
                    </Link>

                    <span className="text-sm text-gray-500 line-clamp-1">
                      {project.description}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-sky-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500"
                  >
                    {project.template}
                  </Badge>
                </TableCell>

                <TableCell>
                  <span className="text-sm text-gray-500">
                    {format(
                      new Date(project.createdAt),
                      "MMM dd, yyyy"
                    )}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-cyan-100 dark:ring-cyan-900">
                      <Image
                        src={project.user.image || "/placeholder.svg"}
                        alt={project.user.name}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>

                    <span className="text-sm">
                      {project.user.name}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-950/40"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">
                          Open menu
                        </span>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      className="w-48"
                    >
                      <DropdownMenuItem asChild>
                        <MarkedToggleButton
                          markedForRevision={
                            project.Starmark[0]?.isMarked
                          }
                          id={project.id}
                        />
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href={`/playground/${project.id}`}
                          className="flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-2 text-cyan-500" />
                          Open Project
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href={`/playground/${project.id}`}
                          target="_blank"
                          className="flex items-center"
                        >
                          <ExternalLink className="h-4 w-4 mr-2 text-blue-500" />
                          Open in New Tab
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleEditClick(project)}
                      >
                        <Edit3 className="h-4 w-4 mr-2 text-cyan-500" />
                        Edit Project
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() =>
                          handleDuplicateProject(project)
                        }
                      >
                        <Copy className="h-4 w-4 mr-2 text-blue-500" />
                        Duplicate
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => copyProjectUrl(project.id)}
                      >
                        <Download className="h-4 w-4 mr-2 text-sky-500" />
                        Copy URL
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() =>
                          handleDeleteClick(project)
                        }
                        className="text-cyan-600 focus:text-cyan-700 focus:bg-cyan-50 dark:text-cyan-400 dark:focus:text-cyan-300 dark:focus:bg-cyan-950/40"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Project Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle
              className="bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 bg-clip-text text-transparent"
            >
              Edit Project
            </DialogTitle>

            <DialogDescription>
              Make changes to your project details here. Click save
              when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Project Title
              </Label>

              <Input
                id="title"
                value={editData.title}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Enter project title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Description
              </Label>

              <Textarea
                id="description"
                value={editData.description}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter project description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              className="bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 hover:from-blue-600 hover:via-cyan-600 hover:to-sky-600 text-white"
              onClick={handleUpdateProject}
              disabled={
                isLoading || !editData.title.trim()
              }
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className="bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 bg-clip-text text-transparent"
            >
              Delete Project
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to delete "
              {selectedProject?.title}"? This action cannot be
              undone. All files and data associated with this project
              will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 hover:from-blue-600 hover:via-cyan-600 hover:to-sky-600 text-white"
            >
              {isLoading ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
