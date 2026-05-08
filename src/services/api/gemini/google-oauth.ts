import { OAuth2Client } from 'google-auth-library'
import { AuthCodeListener } from 'src/services/oauth/auth-code-listener.js'
import { openBrowser } from 'src/utils/browser.js'
import { updateSettingsForSource } from 'src/utils/settings/settings.js'
import { getInitialSettings as getSettings } from 'src/utils/settings/settings.js'
import { logEvent } from 'src/services/analytics/index.js'
import * as crypto from 'crypto' // For state generation if needed

const GOOGLE_CLIENT_ID = '32555940559.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = 'ZmssLNjJy2998hD4CTg2ejr2'
const SCOPES = ['https://www.googleapis.com/auth/cloud-platform']

export async function loginToGoogle(): Promise<void> {
  const listener = new AuthCodeListener('/')
  try {
    const port = await listener.start()
    const redirectUri = `http://localhost:${port}/`

    const oauth2Client = new OAuth2Client({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri,
    })

    const state = crypto.randomBytes(16).toString('hex')

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state,
      prompt: 'consent', // Force to get refresh token
    })

    const authCode = await listener.waitForAuthorization(state, async () => {
      await openBrowser(authorizeUrl)
    })

    const { tokens } = await oauth2Client.getToken(authCode)

    // Save tokens
    updateSettingsForSource('userSettings', {
      googleOAuth: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
    } as any)

    listener.handleSuccessRedirect(SCOPES, res => {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(`
        <html>
          <body>
            <h1>Successfully logged in to Google!</h1>
            <p>You can close this tab and return to Claude Code.</p>
            <script>window.close();</script>
          </body>
        </html>
      `)
    })

    logEvent('tengu_google_oauth_success', {})
  } catch (error) {
    listener.handleErrorRedirect()
    logEvent('tengu_google_oauth_error', {})
    throw error
  } finally {
    listener.close()
  }
}

export async function getGoogleAccessToken(): Promise<string | null> {
  const settings = getSettings()
  const googleOAuth = (settings as any).googleOAuth

  if (!googleOAuth || !googleOAuth.refresh_token) {
    return null
  }

  const oauth2Client = new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
  })

  oauth2Client.setCredentials({
    refresh_token: googleOAuth.refresh_token,
    access_token: googleOAuth.access_token,
    expiry_date: googleOAuth.expiry_date,
  })

  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    if (credentials.access_token !== googleOAuth.access_token) {
      updateSettingsForSource('userSettings', {
        googleOAuth: {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || googleOAuth.refresh_token,
          expiry_date: credentials.expiry_date,
        },
      } as any)
    }
    return credentials.access_token || null
  } catch (error) {
    // If refresh fails, clear it
    updateSettingsForSource('userSettings', {
      googleOAuth: undefined,
    } as any)
    return null
  }
}
