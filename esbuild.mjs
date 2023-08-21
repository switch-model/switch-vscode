//@ts-check
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

const success = watch ? 'Watch build succeeded' : 'Build succeeded';

function getTime() {
    const date = new Date();
    return `[${`${padZeroes(date.getHours())}:${padZeroes(date.getMinutes())}:${padZeroes(date.getSeconds())}`}] `;
}

function padZeroes(i) {
    return i.toString().padStart(2, '0');
}

const plugins = [{
    name: 'watch-plugin',
    setup(build) {
        build.onEnd(result => {
            if (result.errors.length === 0) {
                console.log(getTime() + success);
            }
        });
    },
}];

const vscodeCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    outdir: 'out',
    bundle: true,
    target: "ES2017",
    loader: { '.ts': 'ts' },
    external: ['vscode'],
    platform: 'node',
    sourcemap: !minify,
    minify,
    plugins
});

const webviewCtx = await esbuild.context({
    entryPoints: ['src/webview/app.tsx'],
    outdir: 'out/webview',
    bundle: true,
    target: 'ES2017',
    loader: {
        '.ts': 'ts',
        '.tsx': 'tsx'
    },
    platform: 'browser',
    sourcemap: !minify,
    minify,
});

if (watch) {
    await Promise.all([
        vscodeCtx.watch(),
        webviewCtx.watch()
    ]);
} else {
    await webviewCtx.rebuild();
    await vscodeCtx.rebuild();
    vscodeCtx.dispose();
    webviewCtx.dispose();
}
