const LOG_PREFIX = '[JioSaavn]';

// ⚠️ REPLACE THIS with your actual hosted JioSaavn API URL
// Do not include a trailing slash!
const API_BASE = 'https://cyberboysumanjay.github.io/JioSaavnAPI'; 

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
async function searchTracks(query, limit = 20) {
    try {
        const response = await fetch(`${API_BASE}/result/?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`${LOG_PREFIX} Search failed: HTTP ${response.status}`);
        
        const data = await response.json();
        
        // Handle variations in the API response structure safely
        let rawTracks = [];
        if (Array.isArray(data)) {
            rawTracks = data;
        } else if (data && data.songs) {
            rawTracks = data.songs;
        } else if (typeof data === 'object') {
            rawTracks = [data];
        }

        const tracks = rawTracks.slice(0, limit).map(song => ({
            // Sumanjay's API requires the perma_url for fetching the actual stream later
            id: song.perma_url || song.id || song.songid,
            title: song.title || song.song || 'Unknown Title',
            artist: song.singers || song.primary_artists || 'Unknown Artist',
            album: song.album || 'Unknown Album',
            // MUST be albumCover to match 8SPINE's internal UI schema
            albumCover: song.image || song.image_url || '',
            duration: parseInt(song.duration) || 0
        }));

        return { tracks, total: tracks.length };
    } catch (error) {
        console.error(LOG_PREFIX, 'Search error:', error);
        return { tracks: [], total: 0 };
    }
}

// ---------------------------------------------------------------------------
// Player Stream
// ---------------------------------------------------------------------------
async function getTrackStreamUrl(trackId, preferredQuality, context) {
    console.log(LOG_PREFIX, 'Getting stream for', trackId);
    try {
        // TrackId here is the perma_url we assigned in searchTracks
        const response = await fetch(`${API_BASE}/song/?query=${encodeURIComponent(trackId)}`);
        if (!response.ok) throw new Error(`${LOG_PREFIX} Stream failed: HTTP ${response.status}`);
        
        const data = await response.json();
        const songData = Array.isArray(data) ? data[0] : data;
        
        // The API usually returns 'media_url' or 'url' as the direct audio link
        const directUrl = songData.media_url || songData.url;

        if (directUrl) {
            return {
                streamUrl: directUrl,
                streamType: 'mp4', // Fallback type, works for standard audio
                track: { 
                    id: trackId, 
                    audioQuality: 'HIGH' 
                }
            };
        }
        
        throw new Error(`${LOG_PREFIX} No playable audio found for ${trackId}`);
    } catch (error) {
        console.error(LOG_PREFIX, 'Stream error:', error);
        throw error;
    }
}

// ---------------------------------------------------------------------------
// Album (Required to prevent undefined errors in 8SPINE)
// ---------------------------------------------------------------------------
async function getAlbum(albumId) {
    throw new Error(`${LOG_PREFIX} Album fetch not supported for JioSaavn yet`);
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------
return {
    id: 'jiosaavn-api',
    name: 'JioSaavn',
    author: 'community',
    version: '1.0.1',
    labels: ['JioSaavn', 'Bollywood', 'Audio'],
    description: 'Stream from JioSaavn via custom API.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/35/JioSaavn-logo.png',

    // Use shorthand function references just like the working modules
    searchTracks,
    getTrackStreamUrl,
    getAlbum
};
