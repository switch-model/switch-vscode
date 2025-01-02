# Switch VSCode Extension

VSCode extension to support Switch. A description of Switch can be found on [this page](https://switch-model.org/).

## Getting Started
Run from the root to make necessary installations and compilation

```
mkdir -p ./out/webview # if needed
npm i
npm run package
```
To start the extension
* Go to `Run and Debug` pane (left side of VS Code window)
* Click "play" triangle next to `Run Extension` (top of `Run and Debug` pane)

If you want to change code, you have to watch code changes in parallel:
```
npm run watch
```
