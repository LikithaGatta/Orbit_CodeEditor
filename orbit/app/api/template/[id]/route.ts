import {
  readTemplateStructureFromJson,
  saveTemplateStructureToJson,
} from "@/modules/playground/lib/path-to-json";
import { db } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import path from "path";
import fs from "fs/promises";
import { NextRequest } from "next/server";

function validateJsonStructure(data: unknown): boolean {
  try {
    JSON.parse(JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Invalid JSON structure:", error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return Response.json(
      { error: "Missing playground ID" },
      { status: 400 }
    );
  }

  try {
    // Find the playground
    const playground = await db.playground.findUnique({
      where: { id },
    });

    if (!playground) {
      return Response.json(
        { error: "Playground not found" },
        { status: 404 }
      );
    }

    // Get the template path
    const templateKey =
      playground.template as keyof typeof templatePaths;

    const templatePath = templatePaths[templateKey];

    if (!templatePath) {
      return Response.json(
        {
          error: "Invalid template",
          template: playground.template,
        },
        { status: 404 }
      );
    }

    const inputPath = path.join(
      process.cwd(),
      templatePath
    );

    const outputDirectory = path.join(
      process.cwd(),
      "output"
    );

    const outputFile = path.join(
      outputDirectory,
      `${templateKey}.json`
    );

    console.log("=================================");
    console.log("Loading template");
    console.log("Playground ID:", id);
    console.log("Template:", templateKey);
    console.log("Template path:", inputPath);
    console.log("Output file:", outputFile);
    console.log("=================================");

    // Make sure the output directory exists
    await fs.mkdir(outputDirectory, {
      recursive: true,
    });

    // Make sure the source template exists
    try {
      await fs.access(inputPath);
    } catch (error) {
      console.error(
        "Template source does not exist:",
        inputPath
      );

      return Response.json(
        {
          error: "Template source does not exist",
          path: inputPath,
        },
        { status: 500 }
      );
    }

    // Generate JSON representation of the template
    await saveTemplateStructureToJson(
      inputPath,
      outputFile
    );

    console.log(
      "Template structure saved successfully"
    );

    // Read generated JSON
    const result =
      await readTemplateStructureFromJson(outputFile);

    console.log("Template JSON loaded successfully");

    // Validate generated structure
    if (!validateJsonStructure(result.items)) {
      return Response.json(
        { error: "Invalid JSON structure" },
        { status: 500 }
      );
    }

    // Delete temporary JSON file
    try {
      await fs.unlink(outputFile);
    } catch (error) {
      console.warn(
        "Could not remove temporary output file:",
        error
      );
    }

    return Response.json(
      {
        success: true,
        templateJson: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "================================="
    );
    console.error(
      "ERROR GENERATING TEMPLATE"
    );
    console.error(
      "================================="
    );
    console.error(error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    return Response.json(
      {
        error: "Failed to generate template",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}