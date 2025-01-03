//@ts-check
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

const success = watch ? ' watch build succeeded' : ' build succeeded';

function getTime() {
    const date = new Date();
    return `[${`${padZeroes(date.getHours())}:${padZeroes(date.getMinutes())}:${padZeroes(date.getSeconds())}`}] `;
}

function padZeroes(i) {
    return i.toString().padStart(2, '0');
}

const vscodePlugins = [{
    name: 'watch-plugin',
    setup(build) {
        build.onEnd(result => {
            if (result.errors.length === 0) {
                console.log(getTime() + 'Extension' + success);
            }
        });
    },
}];

const webviewPlugins = [{
    name: 'watch-plugin',
    setup(build) {
        build.onEnd(result => {
            if (result.errors.length === 0) {
                console.log(getTime() + 'Webview' + success);
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
    plugins: vscodePlugins
});

const webviewCtx = await esbuild.context({
    entryPoints: [
        'src/webview/inputs.tsx',
        'src/webview/outputs.tsx',
        'src/webview/modules.tsx',
        'src/webview/scenario.tsx',
        'src/webview/solver.tsx',
        'src/webview/solver-tab.tsx',
        'src/webview/csv-table-view.tsx',
    ],
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
    plugins: webviewPlugins
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
