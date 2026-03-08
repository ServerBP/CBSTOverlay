import { fetchMapByHashOrKey, type BeatSaverMap } from './beatsaver';

/**
 * Represents a map from the tournament pool
 */
export interface PoolMap {
    guid: string;
    name: string;
    artist?: string;
    mapper?: string;
    hash?: string;
    imageUrl?: string;
}

/**
 * Result of a map matching operation
 */
export interface MapMatchResult {
    matched: boolean;
    poolMap: PoolMap | null;
    similarity: number;
    beatSaverData: BeatSaverMap | null;
    songName: string;
    songArtist: string;
    mapper: string;
    coverUrl: string;
}

/**
 * Calculate the Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // Create a 2D array for memoization
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Initialize base cases
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill the DP table
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1],     // insertion
                    dp[i - 1][j - 1]  // substitution
                );
            }
        }
    }
    
    return dp[m][n];
}

/**
 * Calculate similarity ratio between two strings (0 to 1)
 * Uses Levenshtein distance normalized by the length of the longer string
 */
function stringSimilarity(str1: string, str2: string): number {
    if (!str1 && !str2) return 1;
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    
    return 1 - (distance / maxLength);
}

/**
 * Normalize a string for comparison by removing special characters and extra spaces
 */
function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
}

/**
 * Calculate weighted similarity between BeatSaver map data and a pool map
 * Returns a score from 0 to 1
 */
function calculateMapSimilarity(
    bsData: BeatSaverMap,
    poolMap: PoolMap
): number {
    const bsSongName = normalizeString(bsData.metadata.songName);
    const bsArtist = normalizeString(bsData.metadata.songAuthorName);
    const bsMapper = normalizeString(bsData.metadata.levelAuthorName);
    
    const poolName = normalizeString(poolMap.name);
    const poolArtist = normalizeString(poolMap.artist || '');
    const poolMapper = normalizeString(poolMap.mapper || '');
    
    // Calculate individual similarities
    const songNameSimilarity = stringSimilarity(bsSongName, poolName);
    const artistSimilarity = stringSimilarity(bsArtist, poolArtist);
    const mapperSimilarity = stringSimilarity(bsMapper, poolMapper);
    
    // Sometimes the pool name contains both song name and artist, so check that too
    const combinedBsName = normalizeString(`${bsData.metadata.songName} ${bsData.metadata.songSubName || ''}`);
    const combinedSimilarity = stringSimilarity(combinedBsName, poolName);
    
    // Also check if the pool name contains the song name as a substring
    const containsSongName = poolName.includes(bsSongName) || bsSongName.includes(poolName);
    const containsBonus = containsSongName ? 0.1 : 0;
    
    // Weighted average with song name being most important
    // If artist or mapper are empty in pool, don't penalize
    let weights = { song: 0.5, artist: 0.25, mapper: 0.25 };
    let totalWeight = weights.song;
    let weightedSum = Math.max(songNameSimilarity, combinedSimilarity) * weights.song;
    
    if (poolArtist) {
        totalWeight += weights.artist;
        weightedSum += artistSimilarity * weights.artist;
    }
    
    if (poolMapper) {
        totalWeight += weights.mapper;
        weightedSum += mapperSimilarity * weights.mapper;
    }
    
    const baseSimilarity = weightedSum / totalWeight;
    
    return Math.min(1, baseSimilarity + containsBonus);
}

/**
 * Find the best matching map from the pool based on BeatSaver data
 * Returns the match if similarity is above the threshold
 */
export function findBestPoolMatch(
    bsData: BeatSaverMap,
    mapPool: PoolMap[],
    similarityThreshold: number = 0.85
): { poolMap: PoolMap; similarity: number } | null {
    if (!mapPool || mapPool.length === 0) return null;
    
    let bestMatch: PoolMap | null = null;
    let bestSimilarity = 0;
    
    for (const poolMap of mapPool) {
        const similarity = calculateMapSimilarity(bsData, poolMap);
        
        if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = poolMap;
        }
    }
    
    if (bestMatch && bestSimilarity >= similarityThreshold) {
        return {
            poolMap: bestMatch,
            similarity: bestSimilarity
        };
    }
    
    return null;
}

/**
 * Attempt to resolve an unknown map by fetching from BeatSaver and matching to pool
 * 
 * @param mapHash - The hash of the map to look up
 * @param mapPool - Array of maps in the tournament pool
 * @param similarityThreshold - Minimum similarity score to consider a match (default 0.85 = 85%)
 */
export async function resolveUnknownMap(
    mapHash: string,
    mapPool: PoolMap[],
    similarityThreshold: number = 0.85
): Promise<MapMatchResult> {
    const result: MapMatchResult = {
        matched: false,
        poolMap: null,
        similarity: 0,
        beatSaverData: null,
        songName: 'Unknown Map',
        songArtist: '',
        mapper: '',
        coverUrl: ''
    };
    
    if (!mapHash) return result;
    
    try {
        // Fetch map data from BeatSaver
        const bsData = await fetchMapByHashOrKey(mapHash);
        
        if (!bsData) {
            console.warn(`Map not found on BeatSaver: ${mapHash}`);
            return result;
        }
        
        result.beatSaverData = bsData;
        result.songName = bsData.metadata.songName;
        result.songArtist = bsData.metadata.songAuthorName;
        result.mapper = bsData.metadata.levelAuthorName;
        result.coverUrl = bsData.versions?.[0]?.coverURL || '';
        
        // Try to find a matching map in the pool
        if (mapPool && mapPool.length > 0) {
            const match = findBestPoolMatch(bsData, mapPool, similarityThreshold);
            
            if (match) {
                result.matched = true;
                result.poolMap = match.poolMap;
                result.similarity = match.similarity;
                
                console.log(
                    `Matched unknown map "${bsData.metadata.songName}" to pool map "${match.poolMap.name}" ` +
                    `with ${(match.similarity * 100).toFixed(1)}% similarity`
                );
            }
        }
        
        return result;
    } catch (error) {
        console.error('Error resolving unknown map:', error);
        return result;
    }
}

/**
 * Batch resolve multiple unknown maps
 * Uses caching to avoid duplicate BeatSaver requests
 */
export async function resolveUnknownMaps(
    mapHashes: string[],
    mapPool: PoolMap[],
    similarityThreshold: number = 0.85
): Promise<Map<string, MapMatchResult>> {
    const results = new Map<string, MapMatchResult>();
    
    // Remove duplicates
    const uniqueHashes = [...new Set(mapHashes.filter(h => h))];
    
    // Process in parallel with a small batch size to avoid rate limiting
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < uniqueHashes.length; i += BATCH_SIZE) {
        const batch = uniqueHashes.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(hash => resolveUnknownMap(hash, mapPool, similarityThreshold))
        );
        
        batch.forEach((hash, index) => {
            results.set(hash, batchResults[index]);
        });
    }
    
    return results;
}