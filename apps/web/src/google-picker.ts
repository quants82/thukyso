interface PickerDocument {
  id: string;
  name?: string;
}

interface PickerResponse {
  action: string;
  docs?: PickerDocument[];
}

interface PickerBuilder {
  addView(view: unknown): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(appId: string): PickerBuilder;
  setOrigin(origin: string): PickerBuilder;
  setCallback(callback: (data: PickerResponse) => void): PickerBuilder;
  build(): { setVisible(value: boolean): void };
}

interface GooglePickerApi {
  Action: { PICKED: string; CANCEL: string };
  ViewId: { FOLDERS: string };
  DocsView: new (viewId: string) => {
    setIncludeFolders(value: boolean): unknown;
    setSelectFolderEnabled(value: boolean): unknown;
  };
  PickerBuilder: new () => PickerBuilder;
}

declare global {
  interface Window {
    gapi: { load(name: string, callback: () => void): void };
    google: { picker: GooglePickerApi };
  }
}

let pickerApiPromise: Promise<void> | undefined;

function loadPickerApi() {
  if (pickerApiPromise) return pickerApiPromise;
  pickerApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://apis.google.com/js/api.js"]'
    );
    const ready = () => window.gapi.load("picker", resolve);
    if (existing) {
      if (window.gapi) ready();
      else existing.addEventListener("load", ready, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("Không tải được Google Picker"));
    document.head.append(script);
  });
  return pickerApiPromise;
}

export async function chooseDriveFolder(configuration: {
  accessToken: string;
  apiKey: string;
  appId: string;
}) {
  await loadPickerApi();
  return new Promise<PickerDocument | null>((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS);
    view.setIncludeFolders(true);
    view.setSelectFolderEnabled(true);
    new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(configuration.accessToken)
      .setDeveloperKey(configuration.apiKey)
      .setAppId(configuration.appId)
      .setOrigin(window.location.origin)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          resolve(data.docs?.[0] ?? null);
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build()
      .setVisible(true);
  });
}
