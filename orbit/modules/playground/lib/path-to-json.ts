import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a file in the template structure
 */
export interface TemplateFile {
  filename: string;
  fileExtension: string;
  content: string;
}

/**
 * Represents a folder in the template structure which can contain files and other folders
 */
export interface TemplateFolder {
  folderName: string;
  items: (TemplateFile | TemplateFolder)[];
}

/**
 * Type representing either a file or folder in the template structure
 */
export type TemplateItem = TemplateFile | TemplateFolder;

/**
 * Options for scanning template directories
 */
interface ScanOptions {
  ignoreFiles?: string[];
  ignoreFolders?: string[];
  ignorePatterns?: RegExp[];
  maxFileSize?: number;
}

/**
 * Default folders/files that should not be included in templates.
 */
const DEFAULT_SCAN_OPTIONS: Required<ScanOptions> = {
  ignoreFiles: [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.DS_Store',
    'thumbs.db',
    '.gitignore',
    '.npmrc',
    '.yarnrc',
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
  ],

  ignoreFolders: [
    'node_modules',
    '.git',
    '.vscode',
    '.idea',
    'dist',
    'build',
    'coverage',
    '.next',
    'out',
  ],

  ignorePatterns: [
    /^\..+\.swp$/,
    /^\.#/,
    /~$/,
  ],

  maxFileSize: 1024 * 1024,
};

/**
 * Merge default options with user supplied options.
 */
function mergeScanOptions(options: ScanOptions = {}): ScanOptions {
  return {
    ignoreFiles: [
      ...DEFAULT_SCAN_OPTIONS.ignoreFiles,
      ...(options.ignoreFiles ?? []),
    ],

    ignoreFolders: [
      ...DEFAULT_SCAN_OPTIONS.ignoreFolders,
      ...(options.ignoreFolders ?? []),
    ],

    ignorePatterns: [
      ...DEFAULT_SCAN_OPTIONS.ignorePatterns,
      ...(options.ignorePatterns ?? []),
    ],

    maxFileSize:
      options.maxFileSize ?? DEFAULT_SCAN_OPTIONS.maxFileSize,
  };
}

/**
 * Resolves a template path to an absolute path.
 *
 * Important:
 * Do not assume process.cwd() is the parent of OrbitCode-starters.
 *
 * You can optionally provide TEMPLATE_ROOT in your environment:
 *
 * TEMPLATE_ROOT=/absolute/path/to/OrbitCode-starters
 *
 * Otherwise this function checks a few common locations.
 */
export function resolveTemplatePath(templatePath: string): string {
  if (!templatePath?.trim()) {
    throw new Error('Template path is required');
  }

  // Already absolute
  if (path.isAbsolute(templatePath)) {
    return path.normalize(templatePath);
  }

  const cwd = process.cwd();

  const candidates = [
    // Path relative to current working directory
    path.resolve(cwd, templatePath),

    // Templates located directly in the project
    path.resolve(cwd, 'OrbitCode-starters', templatePath),

    // Templates located one level above the project
    path.resolve(cwd, '..', 'OrbitCode-starters', templatePath),

    // Templates located two levels above the project
    path.resolve(cwd, '..', '..', 'OrbitCode-starters', templatePath),
  ];

  // If TEMPLATE_ROOT is configured, prefer it.
  if (process.env.TEMPLATE_ROOT) {
    candidates.unshift(
      path.resolve(process.env.TEMPLATE_ROOT, templatePath)
    );
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return path.normalize(candidate);
    }
  }

  throw new Error(
    [
      `Template directory does not exist: ${templatePath}`,
      '',
      'Checked the following locations:',
      ...candidates.map((candidate) => `  - ${candidate}`),
      '',
      'Set TEMPLATE_ROOT if your templates are stored elsewhere.',
    ].join('\n')
  );
}

/**
 * Checks that a path exists and is a directory.
 */
async function assertTemplateDirectory(
  templatePath: string
): Promise<void> {
  let stats: fs.Stats;

  try {
    stats = await fs.promises.stat(templatePath);
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException;

    if (fsError.code === 'ENOENT') {
      throw new Error(
        `Template directory '${templatePath}' does not exist`
      );
    }

    throw new Error(
      `Unable to access template directory '${templatePath}': ${fsError.message}`
    );
  }

  if (!stats.isDirectory()) {
    throw new Error(
      `Template path '${templatePath}' exists but is not a directory`
    );
  }
}

/**
 * Scans a template directory and returns a structured JSON representation.
 */
export async function scanTemplateDirectory(
  templatePath: string,
  options: ScanOptions = {}
): Promise<TemplateFolder> {
  try {
    const resolvedTemplatePath = resolveTemplatePath(templatePath);

    await assertTemplateDirectory(resolvedTemplatePath);

    const mergedOptions = mergeScanOptions(options);

    const folderName = path.basename(resolvedTemplatePath);

    return await processDirectory(
      folderName,
      resolvedTemplatePath,
      mergedOptions
    );
  } catch (error) {
    throw new Error(
      `Error scanning template directory: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Process a directory and its contents recursively.
 */
async function processDirectory(
  folderName: string,
  folderPath: string,
  options: ScanOptions
): Promise<TemplateFolder> {
  try {
    const entries = await fs.promises.readdir(folderPath, {
      withFileTypes: true,
    });

    const items: TemplateItem[] = [];

    for (const entry of entries) {
      const entryName = entry.name;
      const entryPath = path.join(folderPath, entryName);

      /*
       * Ignore symbolic links and other special filesystem entries.
       */
      if (!entry.isFile() && !entry.isDirectory()) {
        continue;
      }

      /*
       * Directory
       */
      if (entry.isDirectory()) {
        if (options.ignoreFolders?.includes(entryName)) {
          console.log(`Skipping ignored folder: ${entryPath}`);
          continue;
        }

        const subFolder = await processDirectory(
          entryName,
          entryPath,
          options
        );

        items.push(subFolder);
        continue;
      }

      /*
       * File
       */
      if (options.ignoreFiles?.includes(entryName)) {
        console.log(`Skipping ignored file: ${entryPath}`);
        continue;
      }

      const shouldSkip = options.ignorePatterns?.some((pattern) =>
        pattern.test(entryName)
      );

      if (shouldSkip) {
        console.log(
          `Skipping file matching ignore pattern: ${entryPath}`
        );
        continue;
      }

      try {
        const stats = await fs.promises.stat(entryPath);
        const parsedPath = path.parse(entryName);

        let content: string;

        if (
          options.maxFileSize !== undefined &&
          stats.size > options.maxFileSize
        ) {
          content =
            `[File content not included: size (${stats.size} bytes) ` +
            `exceeds maximum allowed size (${options.maxFileSize} bytes)]`;
        } else {
          content = await fs.promises.readFile(entryPath, 'utf8');
        }

        items.push({
          filename: parsedPath.name,
          fileExtension: parsedPath.ext.replace(/^\./, ''),
          content,
        });
      } catch (error) {
        const parsedPath = path.parse(entryName);

        console.error(`Error reading file ${entryPath}:`, error);

        items.push({
          filename: parsedPath.name,
          fileExtension: parsedPath.ext.replace(/^\./, ''),
          content:
            `Error reading file: ${
              error instanceof Error ? error.message : String(error)
            }`,
        });
      }
    }

    return {
      folderName,
      items,
    };
  } catch (error) {
    throw new Error(
      `Error processing directory '${folderPath}': ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Saves the template structure to a JSON file.
 */
export async function saveTemplateStructureToJson(
  templatePath: string,
  outputPath: string,
  options?: ScanOptions
): Promise<void> {
  try {
    const resolvedTemplatePath = resolveTemplatePath(templatePath);

    console.log(
      `[Template] Scanning: ${resolvedTemplatePath}`
    );

    const templateStructure = await scanTemplateDirectory(
      resolvedTemplatePath,
      options
    );

    const outputDir = path.dirname(outputPath);

    await fs.promises.mkdir(outputDir, {
      recursive: true,
    });

    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(templateStructure, null, 2),
      'utf8'
    );

    console.log(
      `[Template] Structure saved to: ${outputPath}`
    );
  } catch (error) {
    throw new Error(
      `Error saving template structure: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Reads a template structure JSON file.
 */
export async function readTemplateStructureFromJson(
  filePath: string
): Promise<TemplateFolder> {
  try {
    const data = await fs.promises.readFile(
      filePath,
      'utf8'
    );

    return JSON.parse(data) as TemplateFolder;
  } catch (error) {
    throw new Error(
      `Error reading template structure: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}