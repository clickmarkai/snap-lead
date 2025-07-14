import { createClient } from '@supabase/supabase-js'
import { config, features } from './config'

// Create Supabase client
export const supabase = createClient(config.supabase.url, config.supabase.anonKey)

// Database types for better TypeScript support
export interface Lead {
  id: string
  email: string
  whatsapp: string
  status: 'new' | 'contacted' | 'qualified' | 'closed'
  source: string
  created_at: string
  notes?: string
  image_url?: string // Field for storage URLs
}

export interface SyrupPhoto {
  id: string
  filename: string
  original_name?: string
  file_path: string
  public_url: string
  file_size?: number
  content_type: string
  created_at: string
  updated_at: string
  metadata?: any
  tags?: string[]
  description?: string
}

export interface DrinkMenu {
  id: number
  name: string
  description: string | null
  category: string
}

export interface Fortune {
  id: number
  mood: string
  gimmick: string
  fortune_story: string
}

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at'>
        Update: Partial<Omit<Lead, 'id' | 'created_at'>>
      }
    }
  }
}

// Helper functions for database operations
export const createLead = async (leadData: Omit<Lead, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message} (Code: ${error.code})`)
  }
  
  return data
}

export const updateLead = async (id: string, updates: Partial<Omit<Lead, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteLead = async (id: string) => {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const getLeads = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Image Storage Functions
export const uploadLeadImage = async (imageBlob: Blob, leadId: string): Promise<string> => {
  try {
    // Generate unique filename
    const timestamp = new Date().getTime()
    const filename = `lead-${leadId}-${timestamp}.jpg`
    const filePath = `${filename}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('lead-images')
      .upload(filePath, imageBlob, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('lead-images')
      .getPublicUrl(data.path)

    return urlData.publicUrl

  } catch (error) {
    throw error
  }
}

export const deleteLeadImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/')
    const filename = urlParts[urlParts.length - 1]

    const { error } = await supabase.storage
      .from('lead-images')
      .remove([filename])

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`)
    }

  } catch (error) {
    throw error
  }
}

export const createLeadWithImage = async (
  leadData: Omit<Lead, 'id' | 'created_at' | 'image_url'>, 
  imageBlob?: Blob
): Promise<Lead> => {
  try {
    // First, create the lead without image
    const newLead = await createLead(leadData)
    
    let finalLead = newLead
    
    // If image is provided, upload it and update the lead
    if (imageBlob) {
      const imageUrl = await uploadLeadImage(imageBlob, newLead.id)
      
      // Update lead with image URL
      finalLead = await updateLead(newLead.id, { image_url: imageUrl })
      
      // Send to N8N webhook after successful Supabase operations
      // Note: This function is deprecated in favor of calling sendToN8NWebhook directly from components
      // await sendToN8NWebhook(...) - moved to component level
    }
    
    return finalLead
  } catch (error) {
    throw error
  }
}

// Helper function to convert base64 to Blob
export const base64ToBlob = (base64String: string, contentType: string = 'image/jpeg'): Blob => {
  const byteCharacters = atob(base64String.split(',')[1])
  const byteNumbers = new Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: contentType })
}

// Syrup Bottle Photo Storage Functions
export const uploadSyrupPhoto = async (
  imageBlob: Blob, 
  originalName?: string,
  description?: string,
  tags?: string[]
): Promise<SyrupPhoto> => {
  try {
    // Generate unique filename
    const timestamp = new Date().getTime()
    const fileExtension = originalName?.split('.').pop() || 'jpg'
    const filename = `syrup-bottle-${timestamp}.${fileExtension}`
    const filePath = `syrup-bottles/${filename}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('syrup-bottles')
      .upload(filePath, imageBlob, {
        contentType: imageBlob.type || 'image/jpeg',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload syrup photo: ${uploadError.message}`)
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('syrup-bottles')
      .getPublicUrl(uploadData.path)

    // Record in database 
    const { data: dbData, error: dbError } = await supabase
      .from('syrup_photos')
      .insert({
        filename,
        original_name: originalName,
        file_path: uploadData.path,
        public_url: urlData.publicUrl,
        file_size: imageBlob.size,
        content_type: imageBlob.type || 'image/jpeg',
        description,
        tags: tags || []
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error details:', {
        error: dbError,
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        table: 'syrup_photos',
        operation: 'INSERT',
        data: {
          filename,
          original_name: originalName,
          file_path: uploadData.path,
          public_url: urlData.publicUrl,
          file_size: imageBlob.size,
          content_type: imageBlob.type || 'image/jpeg',
          description,
          tags: tags || []
        }
      })
      
      throw new Error(`Failed to record syrup photo: ${dbError.message} (Code: ${dbError.code})`)
    }

    return dbData

  } catch (error) {
    throw error
  }
}

export const getSyrupPhotos = async (limit?: number, offset?: number): Promise<SyrupPhoto[]> => {
  try {
    let query = supabase
      .from('syrup_photos')
      .select('*')
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }
    
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    throw error
  }
}

export const getSyrupPhotoById = async (id: string): Promise<SyrupPhoto | null> => {
  try {
    const { data, error } = await supabase
      .from('syrup_photos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    throw error
  }
}

export const deleteSyrupPhoto = async (id: string): Promise<void> => {
  try {
    // First get the photo data to find the file path
    const photo = await getSyrupPhotoById(id)
    if (!photo) {
      throw new Error('Syrup photo not found')
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('syrup-bottles')
      .remove([photo.file_path])

    if (storageError) {
      throw new Error(`Failed to delete syrup photo from storage: ${storageError.message}`)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('syrup_photos')
      .delete()
      .eq('id', id)

    if (dbError) {
      throw new Error(`Failed to delete syrup photo from database: ${dbError.message}`)
    }

  } catch (error) {
    throw error
  }
}

// N8N Integration for Syrup Photos
export const getSyrupPhotosForN8N = async (): Promise<any[]> => {
  try {
    const photos = await getSyrupPhotos()
    
    // Format data for N8N consumption
    return photos.map(photo => ({
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
    }))
  } catch (error) {
    throw error
  }
}

// N8N Webhook Integration from configuration
const N8N_WEBHOOK_URL = config.n8n.webhookUrl
// const N8N_WEBHOOK_URL = 'https://primary-production-b68a.up.railway.app/webhook-test/gen-ai'
const N8N_ANALYZE_URL = config.n8n.analyzeUrl

export const sendToN8NWebhook = async (
  email: string, 
  phone: string, 
  imageBlob: Blob,
  name: string,
  gender: string,
  coffeePreference: string,
  alcoholPreference: string,
  category: string,
  analysisResults?: any,
  drinkDescription?: string
): Promise<string | null> => {
  // Check if N8N integration is enabled
  if (!features.aiAnalysis || !N8N_WEBHOOK_URL) {
    return null
  }

  try {
    
    // Create FormData to send binary data and all customer information
    const formData = new FormData()
    formData.append('email', email)
    formData.append('phone', phone)
    formData.append('photo', imageBlob, 'lead-photo.jpg')
    formData.append('name', name)
    formData.append('gender', gender)
    formData.append('coffeePreference', coffeePreference)
    formData.append('alcoholPreference', alcoholPreference)
    formData.append('category', category)
    
    // Add drink description if available
    if (drinkDescription) {
      formData.append('drinkDescription', drinkDescription)
    }
    
    // Add analysis results if available
    if (analysisResults) {
      formData.append('analysisResults', JSON.stringify(analysisResults))
      
      // Add individual analysis fields for easy access
      if (analysisResults.mood) formData.append('mood', analysisResults.mood)
      if (analysisResults.age) formData.append('age', analysisResults.age)
      if (analysisResults.drink) formData.append('recommendedDrink', analysisResults.drink)
    }
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      body: formData
      // No timeout - let N8N workflow complete regardless of how long it takes
    })

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`)
    }

    // Check if response contains image data
    const contentType = response.headers.get('content-type')
    
    if (contentType && contentType.startsWith('image/')) {
      // Response is an image, convert to base64 data URL
      const imageBlob = await response.blob()
      const reader = new FileReader()
      return new Promise((resolve) => {
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.readAsDataURL(imageBlob)
      })
    } else {
      // Try to get JSON response or text response
      const responseText = await response.text()
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        return null
      }
      
      // Check if response contains image URL or base64 data
      try {
        const jsonResponse = JSON.parse(responseText)
        
        if (Array.isArray(jsonResponse)) {
          // Handle OpenAI DALL-E response format: [{ data: [{ b64_json: "..." }] }]
          if (jsonResponse.length > 0 && jsonResponse[0].data && Array.isArray(jsonResponse[0].data)) {
            const firstDataItem = jsonResponse[0].data[0]
            if (firstDataItem && firstDataItem.b64_json) {
              const base64Data = firstDataItem.b64_json
              // Convert raw base64 to data URL format
              const dataUrl = `data:image/png;base64,${base64Data}`
              return dataUrl
            }
          }
        } else {
          // Handle Supabase storage upload response: { Key: "...", Id: "..." }
          if (jsonResponse.Key) {
            // Construct public URL from storage key
            const supabaseUrl = config.supabase.url
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${jsonResponse.Key}`
            return publicUrl
          }
        }
        
        // Check for standard image fields
        if (jsonResponse.image || jsonResponse.imageUrl || jsonResponse.base64) {
          const imageData = jsonResponse.image || jsonResponse.imageUrl || jsonResponse.base64
          return imageData
        }
      } catch (e) {
        // Not JSON, might be direct base64 or URL
        if (responseText.startsWith('data:image/') || responseText.startsWith('http')) {
          return responseText
        }
      }
    }
    
    return null
    
  } catch (error) {
    // Don't throw error - webhook failure shouldn't block lead creation
    // In production, you might want to queue this for retry
    return null
  }
}

// N8N Image Analysis Integration
export const analyzeImageWithN8N = async (
  imageBlob: Blob, 
  category: string, 
  name: string, 
  gender: string,
  coffeePreference: string,
  alcoholPreference: string
): Promise<any> => {
  // Check if N8N integration is enabled
  if (!features.aiAnalysis || !N8N_ANALYZE_URL) {
    throw new Error('N8N analysis not configured')
  }

  try {
    // Create FormData to send binary image data
    const formData = new FormData()
    formData.append('image', imageBlob, 'capture.jpg')
    
    // Add all customer data
    formData.append('category', category)
    formData.append('name', name)
    formData.append('gender', gender)
    formData.append('coffeePreference', coffeePreference)
    formData.append('alcoholPreference', alcoholPreference)
    
    const response = await fetch(N8N_ANALYZE_URL, {
      method: 'POST',
      body: formData,
      // Add timeout for production reliability
      signal: AbortSignal.timeout(60000) // 60 second timeout for image analysis
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`N8N analysis failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    
    return result
    
  } catch (error) {
    throw error
  }
}

// Drink Menu Functions
export const getDrinkByName = async (name: string): Promise<DrinkMenu | null> => {
  try {
    const { data, error } = await supabase
      .from('drink_menu')
      .select('*')
      .ilike('name', name)
      .single()

    if (error) {
      return null
    }

    return data
  } catch (error) {
    return null
  }
}

// Fortune functions
export const getFortuneByMood = async (mood: string): Promise<Fortune | null> => {
  try {
    const { data, error } = await supabase
      .from('fortunes')
      .select('*')
      .ilike('mood', mood.toUpperCase())
      .order('id', { ascending: false })

    if (error || !data || data.length === 0) {
      return null
    }

    // Randomize the results and pick one
    const randomIndex = Math.floor(Math.random() * data.length)
    return data[randomIndex]
  } catch (error) {
    return null
  }
}

// Test Supabase connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .limit(1)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
} 