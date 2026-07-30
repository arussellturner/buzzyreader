const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
}

interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

export class DriveStorage {
  private accessToken: string;
  private headers: HeadersInit;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.headers = {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Gets or creates the app data folder. Google Drive's special 'appDataFolder'
   * space is used to store app-specific data invisible to the user.
   * Returns the root appDataFolder ID.
   */
  async getOrCreateAppFolder(): Promise<string> {
    const response = await fetch(`${DRIVE_API_BASE}/files/root?fields=id`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new DriveError('Failed to get root folder', response.status);
    }

    // The appDataFolder is a special space, so we just return 'appDataFolder'
    // as the parent ID for all app data operations.
    return 'appDataFolder';
  }

  /**
   * Read a JSON file from the app data space.
   * Returns null if the file doesn't exist.
   */
  async readJsonFile<T>(fileName: string, folder?: string): Promise<T | null> {
    const parentId = folder ?? 'appDataFolder';
    const file = await this.findFile(fileName, parentId);

    if (!file) {
      return null;
    }

    const response = await fetch(
      `${DRIVE_API_BASE}/files/${file.id}?alt=media`,
      { headers: this.headers }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new DriveError(
        `Failed to read file: ${fileName}`,
        response.status
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Write or update a JSON file in the app data space.
   * If the file already exists, it will be updated; otherwise, a new file is created.
   * Returns the file ID.
   */
  async writeJsonFile(
    fileName: string,
    data: unknown,
    folder?: string
  ): Promise<string> {
    const parentId = folder ?? 'appDataFolder';
    const existingFile = await this.findFile(fileName, parentId);
    const jsonBody = JSON.stringify(data, null, 2);

    if (existingFile) {
      return this.updateFile(existingFile.id, jsonBody);
    }

    return this.createFile(fileName, jsonBody, 'application/json', parentId);
  }

  /**
   * Get or create a subfolder within the app data space.
   * Returns the folder ID.
   */
  async getOrCreateSubFolder(
    folderName: string,
    parentId: string
  ): Promise<string> {
    const existing = await this.findFile(folderName, parentId, true);

    if (existing) {
      return existing.id;
    }

    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };

    const response = await fetch(`${DRIVE_API_BASE}/files?fields=id`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new DriveError(
        `Failed to create folder: ${folderName}`,
        response.status
      );
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Download an ePub file from the user's regular Google Drive.
   * This uses the standard drive space (not appDataFolder).
   */
  async getEpubFileContent(fileId: string): Promise<ArrayBuffer> {
    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
      { headers: this.headers }
    );

    if (!response.ok) {
      throw new DriveError(
        `Failed to download ePub file: ${fileId}`,
        response.status
      );
    }

    return response.arrayBuffer();
  }

  /**
   * List all ePub files in the user's Google Drive.
   * Searches across the entire drive for files with the epub MIME type.
   */
  async listEpubFiles(): Promise<{ id: string; name: string }[]> {
    const allFiles: { id: string; name: string }[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        q: "mimeType='application/epub+zip' and trashed=false",
        fields: 'nextPageToken,files(id,name)',
        pageSize: '100',
        orderBy: 'modifiedTime desc',
      });

      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const response = await fetch(
        `${DRIVE_API_BASE}/files?${params.toString()}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new DriveError('Failed to list ePub files', response.status);
      }

      const data: DriveFileList = await response.json();
      allFiles.push(
        ...data.files.map((f) => ({ id: f.id, name: f.name }))
      );
      pageToken = data.nextPageToken;
    } while (pageToken);

    return allFiles;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Search for a file by name within a given parent folder.
   * When searching in appDataFolder, uses the 'appDataFolder' space.
   */
  private async findFile(
    name: string,
    parentId?: string,
    folderOnly = false
  ): Promise<DriveFile | null> {
    const queryParts: string[] = [
      `name='${this.escapeQuery(name)}'`,
      'trashed=false',
    ];

    if (folderOnly) {
      queryParts.push("mimeType='application/vnd.google-apps.folder'");
    }

    if (parentId) {
      queryParts.push(`'${parentId}' in parents`);
    }

    const params = new URLSearchParams({
      q: queryParts.join(' and '),
      fields: 'files(id,name,mimeType)',
      pageSize: '1',
    });

    // Use appDataFolder space when the parent is appDataFolder
    if (parentId === 'appDataFolder' || !parentId) {
      params.set('spaces', 'appDataFolder');
    }

    const response = await fetch(
      `${DRIVE_API_BASE}/files?${params.toString()}`,
      { headers: this.headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Drive API Error:', errorText);
      throw new DriveError(`Failed to search for file: ${name} - ${errorText}`, response.status);
    }

    const data: DriveFileList = await response.json();
    return data.files.length > 0 ? data.files[0] : null;
  }

  /**
   * Create a new file in Drive using multipart upload.
   * Returns the new file's ID.
   */
  private async createFile(
    name: string,
    content: string,
    mimeType: string,
    parentId: string
  ): Promise<string> {
    const metadata = {
      name,
      parents: [parentId],
    };

    const boundary = '---buzzyreader-boundary-' + Date.now();
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      `Content-Type: ${mimeType}`,
      '',
      content,
      `--${boundary}--`,
    ].join('\r\n');

    const response = await fetch(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!response.ok) {
      throw new DriveError(`Failed to create file: ${name}`, response.status);
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Update an existing file's content.
   * Returns the file's ID.
   */
  private async updateFile(fileId: string, content: string): Promise<string> {
    const response = await fetch(
      `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: content,
      }
    );

    if (!response.ok) {
      throw new DriveError(
        `Failed to update file: ${fileId}`,
        response.status
      );
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Escape single quotes in Drive API query strings.
   */
  private escapeQuery(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}

/**
 * Custom error class for Drive API errors.
 */
export class DriveError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'DriveError';
    this.statusCode = statusCode;
  }
}
