import { getSyrupPhotosForN8N, getSyrupPhotoById } from '@/lib/supabase'

// API endpoint for N8N to get all syrup photos
export const getSyrupPhotosAPI = async (request: Request): Promise<Response> => {
  try {
    // Handle CORS for N8N
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers })
    }

    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers }
      )
    }

    const url = new URL(request.url)
    const photoId = url.searchParams.get('id')
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    let result

    if (photoId) {
      // Get specific photo
      const photo = await getSyrupPhotoById(photoId)
      if (!photo) {
        return new Response(
          JSON.stringify({ error: 'Photo not found' }), 
          { status: 404, headers }
        )
      }
      result = {
        id: photo.id,
        filename: photo.filename,
        original_name: photo.original_name,
        download_url: photo.public_url,
        file_size: photo.file_size,
        content_type: photo.content_type,
        created_at: photo.created_at,
        description: photo.description,
        tags: photo.tags,
        metadata: photo.metadata
      }
    } else {
      // Get all photos (or paginated)
      const photos = await getSyrupPhotosForN8N()
      
      let paginatedPhotos = photos
      if (limit || offset) {
        const limitNum = limit ? parseInt(limit) : 50
        const offsetNum = offset ? parseInt(offset) : 0
        paginatedPhotos = photos.slice(offsetNum, offsetNum + limitNum)
      }
      
      result = {
        photos: paginatedPhotos,
        total_count: photos.length,
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : null
      }
    }

    return new Response(JSON.stringify(result), { status: 200, headers })

  } catch (error) {
    console.error('API Error:', error)
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500, headers }
    )
  }
} 