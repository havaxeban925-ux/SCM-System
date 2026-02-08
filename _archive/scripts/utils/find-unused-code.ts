
import fs from 'fs';
import path from 'path';

// Configuration
const SRC_DIR = './'; // Scan from root potentially, or just assume specific folders
const EXTENSIONS = ['.ts', '.tsx'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'tests', 'scripts', 'server', 'brain']; // Ignore server for now as we focus on frontend? Or both? User said "unused code", implying generally.
// Let's scan everything but separate report for server vs client.
// Actually, let's scan directories: 'pages', 'components', 'lib', 'services', 'utils', 'hooks', 'admin'
const SEARCH_DIRS = ['pages', 'components', 'lib', 'services', 'utils', 'hooks', 'admin', 'types.ts'];

const ENTRY_POINTS = [
    'index.tsx',
    'App.tsx',
    'main.tsx',
    'vite.config.ts',
    'admin/index.tsx',
    'admin/App.tsx',
    'server/index.ts'
];

function getAllFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return [];

    if (fs.statSync(dir).isFile()) {
        return [dir];
    }

    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                results = results.concat(getAllFiles(filePath));
            }
        } else {
            if (EXTENSIONS.includes(path.extname(file))) {
                results.push(filePath);
            }
        }
    });
    return results;
}

function getImports(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"](.*?)['"]/g;
    const dynamicImportRegex = /import\(['"](.*?)['"]\)/g;
    const matches = [...content.matchAll(importRegex), ...content.matchAll(dynamicImportRegex)];

    return matches.map(m => m[1]);
}

function resolveImport(sourceFile: string, importPath: string): string | null {
    if (!importPath.startsWith('.')) return null; // Ignore node_modules

    const dir = path.dirname(sourceFile);
    let resolved = path.resolve(dir, importPath);

    // Try extensions
    for (const ext of ['', ...EXTENSIONS]) {
        if (fs.existsSync(resolved + ext)) return resolved + ext;
        if (fs.existsSync(path.join(resolved, 'index' + ext))) return path.join(resolved, 'index' + ext);
    }
    return null;
}

function main() {
    console.log('🔍 Scanning for unused code...');

    // 1. Collect all project files
    let allFiles: string[] = [];
    SEARCH_DIRS.forEach(d => {
        const files = getAllFiles(d);
        allFiles.push(...files);
    });

    // Add known root files if not in dirs
    ENTRY_POINTS.forEach(ep => {
        if (fs.existsSync(ep)) allFiles.push(path.resolve(ep));
    });

    // Normalize paths
    allFiles = allFiles.map(f => path.resolve(f));
    const allFilesSet = new Set(allFiles);

    // 2. Build Import Graph
    const importedFiles = new Set<string>();

    // We should scan ALL files in project to find imports, even those we don't want to report as unused (like scripts)
    // to ensure we don't mark a file as unused checking only a subset.
    const scannerFiles = getAllFiles('./');

    scannerFiles.forEach(file => {
        const absFile = path.resolve(file);
        if (allFilesSet.has(absFile) || IGNORE_DIRS.some(d => file.includes(d))) {
            // scan imports
            const imports = getImports(file);
            imports.forEach(imp => {
                const resolved = resolveImport(absFile, imp);
                if (resolved && allFilesSet.has(resolved)) {
                    importedFiles.add(resolved);
                }
            });
        }
    });

    // 3. Find Unused
    const unused = allFiles.filter(f => !importedFiles.has(f) && !ENTRY_POINTS.some(ep => f.endsWith(ep.replace(/\//g, path.sep))));

    console.log('\nFound ' + unused.length + ' potentially unused files:');
    unused.forEach(f => {
        // Print relative path
        console.log(`- ${path.relative(process.cwd(), f)}`);
    });

    if (unused.length === 0) {
        console.log('✅ No unused files found!');
    }
}

main();
