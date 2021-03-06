import { Paths, LIVE_RELOAD_PROXY, HMR_PROXY, HmrBrowserSyncConfig, LiveReloadBrowserSyncConfig } from './gulp-config';
import * as gulp from 'gulp';
import { exec } from 'child_process';
import * as compodoc from '@compodoc/gulp-compodoc';
import * as browserSync from 'browser-sync';
import * as nodemon from 'gulp-nodemon';
import { proxyCli } from './gulp-series';
import { TaskFunction } from 'undertaker';

/**
 * Calls electron on the main process in the 'dist/electron' directory
 * Pipes STDOUT from Electron's Main process to the console.
 */
export const launchElectronTask = <TaskFunction>function launchElectron() {
  const electronCmd = exec(`electron ${Paths.electron_dest}main`);
  electronCmd.stdout.pipe(process.stdout);
  return electronCmd;
};
// Gulp-CLI documentation and task registration.
launchElectronTask.displayName = 'launch:electron';
launchElectronTask.description = '<Paralell>: Launches Electron and pipes STDOUT from main process.';

/**
 * This task is only used the HMR Proxy.
 * Spins up the CLI HMR service and pipes its STDOUT to the console.
 * @param done - Callback function to signal task completion.
 */
export const startHMRTask = <TaskFunction>function startHMR(done) {
  let firstRun = true;
  const hmrCmd = exec('ng serve --hmr -e=hmr -dop=false');
  hmrCmd.stdout.pipe(process.stdout);
  hmrCmd.stdout.on('data', data => {
    if (String(data) === 'webpack: Compiled successfully.\n') {
      if (firstRun) {
        firstRun = false;
        done();
        return serveElectronHmrTask(done);
      }
    }
  });
  hmrCmd.on('error', err => {
    throw err;
  });
};
// Gulp-CLI documentation and task registration.
startHMRTask.displayName = 'serve:hmr';
startHMRTask.description = '<Parallel>: Spins up the CLI HMR service';

/**
 * This task generates the angular Compodoc documentation to the 'docs'
 * directory and serves it on default port of 8080.
 * @param done - Callback fruntion to signal task completion.
 */
export const startCompodocTask = <TaskFunction>function startCompodoc(done) {
  return gulp.src('src/**/*.ts').pipe(
    compodoc({
      port: 8080,
      output: 'docs',
      tsconfig: 'src/tsconfig.json',
      serve: true,
      open: true
    })
  );
};
// Gulp-CLI documentation and task registration.
startCompodocTask.displayName = 'start:docs';
startCompodocTask.description = '<Paralell>: Generates Compodoc documentation and serves it up.';

export const serveLiveReloadTask = <TaskFunction>function serveLiveReload() {
  nodemon({
    exec: `electron ${Paths.electron_dest}main`,
    watch: [Paths.electron_dest]
  }).on('start', () => {
    proxyCli(LIVE_RELOAD_PROXY, LiveReloadBrowserSyncConfig);
  });
};
// Gulp-CLI documentation and task registration.
serveLiveReloadTask.displayName = 'serve:live-reload';
serveLiveReloadTask.description = '<Paralell>: Serves Electron via nodemon and proxy browser-sync.';

export const serveElectronHmrTask = <TaskFunction>function serveElectronHmr() {
  return nodemon({
    exec: `electron ${Paths.electron_dest}main`,
    watch: [Paths.electron_dest]
  }).on('start', () => {
    proxyCli(HMR_PROXY, HmrBrowserSyncConfig);
  });
};
// Gulp-CLI documentation and task registration.
serveElectronHmrTask.displayName = 'serve:electron-hmr';
serveElectronHmrTask.description = '<Paralell>: Serves Electron via nodemon and proxy CLI HMR service.';
