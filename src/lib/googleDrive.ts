/**
 * Google Drive helpers — extract folder IDs from URLs, build embeddable
 * iframe URLs, and launch the Google Picker API for folder selection.
 */

/**
 * Extract the folder ID from any Google Drive folder URL.
 * Handles formats:
 *   https://drive.google.com/drive/folders/FOLDER_ID
 *   https://drive.google.com/drive/u/0/folders/FOLDER_ID
 *   https://drive.google.com/open?id=FOLDER_ID
 *   https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
 */
export function extractFolderId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  const patterns = [
    /\/folders\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
    /open\?id=([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

/**
 * Build the embeddable folder view URL for an iframe src.
 * Uses the #list resource key for a grid/list view.
 */
export function buildEmbedUrl(folderUrl: string): string | null {
  const folderId = extractFolderId(folderUrl);
  if (!folderId) return null;
  return `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
}

/**
 * Build the regular Google Drive folder URL (for opening in a new tab).
 */
export function buildDriveUrl(folderUrl: string): string | null {
  const folderId = extractFolderId(folderUrl);
  if (!folderId) return null;
  return `https://drive.google.com/drive/folders/${folderId}`;
}

// ---- Google Picker API ----

let pickerApiLoaded = false;
let oauthToken: string | null = null;

function loadPickerApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pickerApiLoaded) {
      resolve();
      return;
    }
    if ((window as any).google?.picker) {
      pickerApiLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('picker', () => {
        pickerApiLoaded = true;
        resolve();
      });
    };
    script.onerror = () => reject(new Error('Failed to load Google Picker API'));
    document.head.appendChild(script);
  });
}

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

async function getOAuthToken(clientId: string): Promise<string> {
  if (oauthToken) return oauthToken;

  await loadGsiScript();

  return new Promise((resolve, reject) => {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        oauthToken = response.access_token;
        resolve(oauthToken);
      },
    });
    tokenClient.requestAccessToken();
  });
}

export interface PickerResult {
  folderId: string;
  folderName: string;
  folderUrl: string;
}

/**
 * Launch the Google Picker dialog to browse and select a Drive folder.
 * Requires a Google API key and OAuth client ID configured in company settings.
 */
export async function pickDriveFolder(
  apiKey: string,
  clientId: string
): Promise<PickerResult> {
  if (!apiKey || !clientId) {
    throw new Error('Google Picker is not configured. Ask your admin to set the API key and Client ID in Organization Settings.');
  }

  await loadPickerApi();
  const token = await getOAuthToken(clientId);

  return new Promise((resolve, reject) => {
    const view = new (window as any).google.picker.DocsView(
      (window as any).google.picker.ViewId.FOLDERS
    );
    view.setIncludeFolders(true);
    view.setSelectFolderEnabled(true);
    view.setMode((window as any).google.picker.DocsViewMode.LIST);

    const picker = new (window as any).google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setTitle('Select a customer folder')
      .setCallback((data: any) => {
        if (data.action === (window as any).google.picker.Action.PICKED) {
          const doc = data.docs[0];
          if (!doc) {
            reject(new Error('No folder selected'));
            return;
          }
          const folderId = doc.id;
          const folderName = doc.name;
          const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
          resolve({ folderId, folderName, folderUrl });
        } else if (data.action === (window as any).google.picker.Action.CANCEL) {
          reject(new Error('Picker cancelled'));
        }
      })
      .build();
    picker.setVisible(true);
  });
}
