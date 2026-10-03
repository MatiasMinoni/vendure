import { execFileSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardDirectory = fileURLToPath(new URL('../', import.meta.url));
const repositoryDirectory = path.resolve(dashboardDirectory, '../..');
const outputDirectory = path.join(repositoryDirectory, 'artifacts/argysolutions');
const packageScope = process.argv[2];
if (!packageScope || !/^[a-z0-9][a-z0-9_-]*$/.test(packageScope)) {
    throw new Error('ArgySolutions package scope required: pass your confirmed npm username without @');
}
const packageName = `@${packageScope}/vendure-dashboard`;
const packageVersion = '3.7.3-argysolutions.1';
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryDirectory, encoding: 'utf8',
}).trim();

// Build artifacts must exist before packaging; credentials and workspace dependencies are never copied.
for (const artifact of ['dist/vite/index.js', 'dist/plugin/index.js', 'dist/bundle/lib.js']) {
    await access(path.join(dashboardDirectory, artifact));
}
const stagingDirectory = await mkdtemp(path.join(tmpdir(), 'argysolutions-dashboard-'));
try {
    for (const entry of ['src', 'public', 'lingui.config.js', 'index.html', 'dist/vite', 'dist/plugin', 'dist/bundle']) {
        await cp(path.join(dashboardDirectory, entry), path.join(stagingDirectory, entry), { recursive: true });
    }
    await cp(path.join(repositoryDirectory, 'LICENSE.md'), path.join(stagingDirectory, 'LICENSE.md'));
    await cp(path.join(repositoryDirectory, 'license'), path.join(stagingDirectory, 'license'), { recursive: true });
    const readme = await readFile(path.join(dashboardDirectory, 'README.argysolutions.md'), 'utf8');
    await writeFile(path.join(stagingDirectory, 'README.md'), readme.replaceAll('@argysolutions/vendure-dashboard', packageName));
    const manifest = JSON.parse(await readFile(path.join(dashboardDirectory, 'package.json'), 'utf8'));
    manifest.name = packageName;
    manifest.version = packageVersion;
    manifest.description = 'ArgySolutions dashboard branding for Vendure 3.7.3';
    manifest.license = 'GPL-3.0-or-later';
    manifest.repository = { type: 'git', url: 'git+https://github.com/MatiasMinoni/vendure.git', directory: 'packages/dashboard' };
    manifest.homepage = 'https://github.com/MatiasMinoni/vendure/blob/argysolutions-3.7.3/ARGYSOLUTIONS.md';
    manifest.bugs = { url: 'https://github.com/MatiasMinoni/vendure/issues' };
    manifest.gitHead = sourceCommit;
    manifest.publishConfig = { access: 'public', registry: 'https://registry.npmjs.org/', tag: 'latest' };
    manifest.files = ['dist', 'src', 'public', 'lingui.config.js', 'index.html', 'LICENSE.md', 'license'];
    // Upstream imports this directly but only receives it transitively from gql.tada.
    manifest.dependencies['@gql.tada/cli-utils'] = '1.9.4';
    manifest.peerDependencies = { '@vendure/core': '3.7.3', '@vendure/common': '3.7.3' };
    delete manifest.scripts;
    delete manifest.devDependencies;
    await writeFile(path.join(stagingDirectory, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
    await mkdir(outputDirectory, { recursive: true });
    const result = execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', outputDirectory], {
        cwd: stagingDirectory, encoding: 'utf8',
    });
    await writeFile(path.join(outputDirectory, 'pack-manifest.json'), result);
    const [packed] = JSON.parse(result);
    console.log(`ArgySolutions package ready: ${path.join(outputDirectory, packed.filename)}`);
    console.log(`Files: ${packed.entryCount}; integrity: ${packed.integrity}`);
} finally {
    await rm(stagingDirectory, { recursive: true, force: true });
}
