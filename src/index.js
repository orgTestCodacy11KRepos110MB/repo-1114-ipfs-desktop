// @ts-check
const { registerAppStartTime, getSecondsSinceAppStart } = require('./metrics/appStart')
registerAppStartTime()
require('v8-compile-cache')

const { app, dialog } = require('electron')

if (process.env.NODE_ENV === 'test') {
  const path = require('path')
  if (process.env.HOME) {
    app.setPath('home', process.env.HOME)
    app.setPath('userData', path.join(process.env.HOME, 'data'))
  }
}

const getCtx = require('./context')

const fixPath = require('fix-path')
const logger = require('./common/logger')
const setupProtocolHandlers = require('./protocol-handlers')
const setupI18n = require('./i18n')
const setupDaemon = require('./daemon')
const setupWebUI = require('./webui')
const setupAutoLaunch = require('./auto-launch')
const setupAutoGc = require('./automatic-gc')
const setupPubsub = require('./enable-pubsub')
const setupNamesysPubsub = require('./enable-namesys-pubsub')
const setupTakeScreenshot = require('./take-screenshot')
const setupAppMenu = require('./app-menu')
const setupArgvFilesHandler = require('./argv-files-handler')
const setupAutoUpdater = require('./auto-updater')
const setupTray = require('./tray')
const setupAnalytics = require('./analytics')
const setupSecondInstance = require('./second-instance')
const { analyticsKeys } = require('./analytics/keys')
const handleError = require('./handleError')

// Hide Dock
if (app.dock) app.dock.hide()

// Sets User Model Id so notifications work on Windows 10
app.setAppUserModelId('io.ipfs.desktop')

// Fixes $PATH on macOS
fixPath()

// Only one instance can run at a time
if (!app.requestSingleInstanceLock()) {
  process.exit(0)
}

// const ctx = {}

app.on('will-finish-launching', async () => {
  setupProtocolHandlers()
})

process.on('uncaughtException', handleError)
process.on('unhandledRejection', handleError)

async function run () {
  try {
    // await Promise.allSettled([app.whenReady(), getCtx().waitForSetup()])
    await app.whenReady()
  } catch (e) {
    dialog.showErrorBox('Electron could not start', e.stack)
    app.exit(1)
  }

  try {
    // await setupAnalytics() // ctx.countlyDeviceId
    // await setupI18n()
    // await setupAppMenu()

    // await setupWebUI() // ctx.webui, launchWebUI
    // await setupAutoUpdater() // ctx.manualCheckForUpdates
    // await setupTray() // ctx.tray
    // await setupDaemon() // ctx.getIpfsd, startIpfs, stopIpfs, restartIpfs

    await Promise.all([
      setupAnalytics(), // ctx.countlyDeviceId
      setupI18n(),
      setupAppMenu(),

      setupWebUI(), // ctx.webui, launchWebUI
      setupAutoUpdater(), // ctx.manualCheckForUpdates
      setupTray(), // ctx.tray
      setupDaemon(), // ctx.getIpfsd, startIpfs, stopIpfs, restartIpfs
      setupArgvFilesHandler(),
      setupAutoLaunch(),
      setupAutoGc(),
      setupPubsub(),
      setupNamesysPubsub(),
      setupSecondInstance(),
      // Setup global shortcuts
      setupTakeScreenshot()
    ])
    const submitAppReady = () => {
      logger.addAnalyticsEvent({ withAnalytics: analyticsKeys.APP_READY, dur: getSecondsSinceAppStart() })
    }
    const webui = await getCtx().getProp('webui')
    if (webui.webContents.isLoading()) {
      webui.webContents.once('dom-ready', submitAppReady)
    } else {
      submitAppReady()
    }
  } catch (e) {
    handleError(e)
  }
}

run()
