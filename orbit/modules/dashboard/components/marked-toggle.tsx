"use client"

import { Button } from "@/components/ui/button"

import { StarIcon, StarOffIcon } from "lucide-react"
import type React from "react"
import { useState, useEffect, forwardRef } from "react"
import { toast } from "sonner"
import { toggleStarMarked } from "../actions"

interface MarkedToggleButtonProps
  extends React.ComponentPropsWithoutRef<typeof Button> {
  markedForRevision: boolean
  id: string
}

export const MarkedToggleButton = forwardRef<
  HTMLButtonElement,
  MarkedToggleButtonProps
>(({ markedForRevision, id, onClick, className, children, ...props }, ref) => {
  const [isMarked, setIsMarked] = useState(markedForRevision)

  useEffect(() => {
    setIsMarked(markedForRevision)
  }, [markedForRevision])

  const handleToggle = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onClick?.(event)

    const newMarkedState = !isMarked
    setIsMarked(newMarkedState)

    try {
      const res = await toggleStarMarked(id, newMarkedState)
      const { success, error, isMarked } = res

      if (isMarked && !error && success) {
        toast.success("Added to Favorites successfully")
      } else {
        toast.success("Removed from Favorites successfully")
      }
    } catch (error) {
      console.error("Failed to toggle mark for revision:", error)
      setIsMarked(!newMarkedState)
    }
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      className={`flex w-full cursor-pointer items-center justify-start rounded-md px-2 py-1.5 text-sm text-white shadow-xs
        bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500
        dark:from-blue-400 dark:via-cyan-400 dark:to-sky-400
        hover:from-blue-600 hover:via-cyan-600 hover:to-sky-600
        dark:hover:from-blue-500 dark:hover:via-cyan-500 dark:hover:to-sky-500
        ${className || ""}`}
      onClick={handleToggle}
      {...props}
    >
      {isMarked ? (
        <StarIcon size={16} className="mr-2 text-white" />
      ) : (
        <StarOffIcon size={16} className="mr-2 text-white" />
      )}

      {children || (isMarked ? "Remove Favorite" : "Add to Favorite")}
    </Button>
  )
})

MarkedToggleButton.displayName = "MarkedToggleButton"
