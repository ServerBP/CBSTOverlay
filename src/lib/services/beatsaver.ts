export interface BeatSaverMap {
    id: string;
    name: string;
    description: string;
    uploader: {
        id: number;
        name: string;
        hash: string;
        avatar: string;
    };
    metadata: {
        bpm: number;
        duration: number;
        songName: string;
        songSubName: string;
        songAuthorName: string;
        levelAuthorName: string;
    };
    stats: {
        plays: number;
        downloads: number;
        upvotes: number;
        downvotes: number;
        score: number;
    };
    uploaded: string;
    automapper: boolean;
    ranked: boolean;
    qualified: boolean;
    versions: Array<{
        hash: string;
        key: string;
        state: string;
        createdAt: string;
        sageScore: number;
        diffs: Array<{
            njs: number;
            offset: number;
            notes: number;
            bombs: number;
            obstacles: number;
            nps: number;
            length: number;
            characteristic: string;
            difficulty: string;
            events: number;
            chroma: boolean;
            me: boolean;
            ne: boolean;
            cinema: boolean;
            seconds: number;
            paritySummary: {
                errors: number;
                warns: number;
                resets: number;
            };
            stars: number;
            maxScore: number;
        }>;
        downloadURL: string;
        previewURL: string;
        coverURL: string;
    }>;
}

const BEATSAVER_API_BASE = 'https://api.beatsaver.com';
const BATCH_SIZE = 50;

/**
 * Fetches multiple maps from BeatSaver by their hashes or keys
 * Automatically batches requests into groups of 50 as per BeatSaver API limits
 * Separates keys and hashes to use appropriate endpoints
 */
export async function fetchMapsByHashesOrKeys(identifiers: string[]): Promise<BeatSaverMap[]> {
    if (identifiers.length === 0) {
        return [];
    }

    // Separate keys and hashes
    const keys: string[] = [];
    const hashes: string[] = [];
    
    for (const identifier of identifiers) {
        if (isKey(identifier)) {
            keys.push(identifier);
        } else if (isHash(identifier)) {
            hashes.push(identifier);
        } else {
            console.warn(`Skipping invalid identifier: ${identifier}`);
        }
    }

    const allMaps: BeatSaverMap[] = [];

    // Process keys in batches
    if (keys.length > 0) {
        const keyBatches: string[][] = [];
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
            keyBatches.push(keys.slice(i, i + BATCH_SIZE));
        }

        for (const batch of keyBatches) {
            try {
                const idsParam = batch.join(',');
                const response = await fetch(`${BEATSAVER_API_BASE}/maps/ids/${idsParam}`);
                
                if (!response.ok) {
                    throw new Error(`BeatSaver API error for keys: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                const maps = Object.values(data) as BeatSaverMap[];
                allMaps.push(...maps);
            } catch (error) {
                console.error('Error fetching key batch:', error);
                throw error;
            }
        }
    }

    // Process hashes in batches
    if (hashes.length == 1) {
        try {
            const response = await fetch(`${BEATSAVER_API_BASE}/maps/hash/${hashes[0]}`);
            
            if (!response.ok) {
                throw new Error(`BeatSaver API error for hashes: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const maps = [data];
            allMaps.push(...maps);
        } catch (error) {
            console.error('Error fetching hash batch:', error);
            throw error;
        }
    } else if (hashes.length > 0) {
        const hashBatches: string[][] = [];
        for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
            hashBatches.push(hashes.slice(i, i + BATCH_SIZE));
        }

        for (const batch of hashBatches) {
            try {
                const hashesParam = batch.join(',');
                const response = await fetch(`${BEATSAVER_API_BASE}/maps/hash/${hashesParam}`);
                
                if (!response.ok) {
                    throw new Error(`BeatSaver API error for hashes: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                const maps = Object.values(data) as BeatSaverMap[];
                allMaps.push(...maps);
            } catch (error) {
                console.error('Error fetching hash batch:', error);
                throw error;
            }
        }
    }

    return allMaps;
}

/**
 * Determines if an identifier is a BeatSaver key (numeric) or hash (hex string)
 */
function isKey(identifier: string): boolean {
    return /^\d+$/.test(identifier);
}

/**
 * Determines if an identifier is a hash (40-character hex string)
 */
function isHash(identifier: string): boolean {
    return /^[a-fA-F0-9]{40}$/.test(identifier);
}

/**
 * Fetches a single map by its hash or key
 */
export async function fetchMapByHashOrKey(identifier: string): Promise<BeatSaverMap | null> {
    try {
        let endpoint: string;
        
        if (isKey(identifier)) {
            endpoint = `${BEATSAVER_API_BASE}/maps/id/${identifier}`;
        } else if (isHash(identifier)) {
            endpoint = `${BEATSAVER_API_BASE}/maps/hash/${identifier}`;
        } else {
            throw new Error(`Invalid identifier format. Expected either a numeric key or 40-character hex hash, got: ${identifier}`);
        }

        const response = await fetch(endpoint);
        
        if (response.status === 404) {
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`BeatSaver API error: ${response.status} ${response.statusText}`);
        }

        return await response.json() as BeatSaverMap;
    } catch (error) {
        console.error('Error fetching map:', error);
        throw error;
    }
}

/**
 * Extracts the hash from a Beat Saber level ID string (format: custom_level_levelhash)
 */
export function extractHashFromLevelId(levelId: string): string {
    const prefix = 'custom_level_';
    if (!levelId.startsWith(prefix)) {
        throw new Error(`Invalid level ID format. Expected format: ${prefix}[hash]`);
    }
    return levelId.substring(prefix.length);
}

/**
 * Fetches a map by Beat Saber level ID string (custom_level_levelhash format)
 */
export async function fetchMapByLevelId(levelId: string): Promise<BeatSaverMap | null> {
    try {
        const hash = extractHashFromLevelId(levelId);
        return await fetchMapByHashOrKey(hash);
    } catch (error) {
        console.error('Error fetching map by level ID:', error);
        throw error;
    }
}

/**
 * Fetches multiple maps by Beat Saber level ID strings
 * Automatically extracts hashes and batches requests
 */
export async function fetchMapsByLevelIds(levelIds: string[]): Promise<BeatSaverMap[]> {
    try {
        const hashes = levelIds.map(levelId => extractHashFromLevelId(levelId));
        return await fetchMapsByHashesOrKeys(hashes);
    } catch (error) {
        console.error('Error fetching maps by level IDs:', error);
        throw error;
    }
}