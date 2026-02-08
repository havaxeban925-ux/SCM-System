
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const ARCHIVE_DIR = path.join(ROOT_DIR, '_archive');

const DIRS = {
    LOGS: path.join(ARCHIVE_DIR, 'logs'),
    DATA: path.join(ARCHIVE_DIR, 'data'),
    SCRIPTS_ROOT: path.join(ARCHIVE_DIR, 'scripts', 'root'),
    SCRIPTS_UTILS: path.join(ARCHIVE_DIR, 'scripts', 'utils'),
    DB: path.join(ARCHIVE_DIR, 'db')
};

// Create directories
Object.values(DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

const moveFile = (src: string, destDir: string) => {
    const filename = path.basename(src);
    const dest = path.join(destDir, filename);
    if (fs.existsSync(src)) {
        try {
            fs.renameSync(src, dest);
            console.log(`Moved: ${filename} -> ${destDir}`);
        } catch (err: any) {
            console.error(`Failed to move ${filename}: ${err.message}`);
        }
    }
};

// 1. Move Logs
const logsToMove = ['server_error.log', 'server_error_utf8.log'];
logsToMove.forEach(f => moveFile(path.join(ROOT_DIR, f), DIRS.LOGS));

// 2. Move Data
const dataFiles = [
    'failed_shops.csv',
    '商家情况.csv',
    '商家情况.xlsx',
    'verify_output.txt',
    'db_test_output.txt',
    'db_test_result.txt',
    'debug_output.txt',
    'endpoint_test_result.txt',
    'health_check.txt',
    'test_styles_output.txt',
    '申请同款同价-3424432-2026-02-06.xlsx',
    '小铃子组报价单辅助生成 - 版本 v1.27（内测2版）.html'
];
dataFiles.forEach(f => moveFile(path.join(ROOT_DIR, f), DIRS.DATA));

// 3. Move Root Scripts
const rootScriptsPatterns = [
    /^repro_.*\.ts$/,
    /^check-.*\.ts$/,
    /^debug_.*\.ts$/, // Carefully allow debug_ scripts, but check if any are critical?
    /^test_.*\.ts$/,
    /^test_.*\.js$/,
    /^verify_.*\.ts$/,
    /^verify_.*\.js$/,
    /^fix_.*\.ts$/,
    /^create_.*\.ts$/,
    /^prepare-.*\.ts$/
];

// Exceptions to KEEP in root
const rootScriptsKeep = [
    'verify_spu_flow.ts', // Keep as core test
    'vite.config.ts',
    'types.ts',
    'constants.tsx',
    'App.tsx',
    'index.tsx'
];

const filesInRoot = fs.readdirSync(ROOT_DIR);
filesInRoot.forEach(file => {
    if (rootScriptsKeep.includes(file)) return;

    const isMatch = rootScriptsPatterns.some(pattern => pattern.test(file));
    if (isMatch) {
        moveFile(path.join(ROOT_DIR, file), DIRS.SCRIPTS_ROOT);
    }
});

// 4. Move Unused Scripts in scripts/ folder
// For now, we will move ALL scripts in scripts/ to _archive/scripts/utils
// UNLESS they are explicitly known to be active tools.
// Based on current usage, most are one-off.
// We will move them to _archive/scripts/utils but keep the `seed.ts` if it's main seeder (it is).
const scriptsDir = path.join(ROOT_DIR, 'scripts');
if (fs.existsSync(scriptsDir)) {
    const scriptFiles = fs.readdirSync(scriptsDir);
    const scriptsKeep = ['seed.ts', 'verify_push_data.ts']; // Keep verified tools

    scriptFiles.forEach(file => {
        if (!scriptsKeep.includes(file) && (file.endsWith('.ts') || file.endsWith('.js'))) {
            moveFile(path.join(scriptsDir, file), DIRS.SCRIPTS_UTILS);
        }
    });
}


console.log('Archiving completed.');
