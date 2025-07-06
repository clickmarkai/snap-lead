import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// TODO: Replace these with your actual DELIFRU project credentials from Supabase Dashboard → Settings → API
const supabaseUrl = 'https://wfbkmozimmfmoiwuopwj.supabase.co' // Replace with your Project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmttb3ppbW1mbW9pd3VvcHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MDE0OTEsImV4cCI6MjA2NzE3NzQ5MX0.abbtJtYhUrUXE5l5QssCifUujnOWboCU231iKN4tZrg' // Replace with your anon public key

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  console.log('Attempting to create lead with data:', leadData)
  
  const { data, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single()

  if (error) {
    console.error('Supabase error details:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    throw new Error(`Database error: ${error.message} (Code: ${error.code})`)
  }
  
  console.log('Lead created successfully:', data)
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
    console.log('Uploading image for lead:', leadId)
    
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
      console.error('Storage upload error:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    console.log('Image uploaded successfully:', data.path)

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('lead-images')
      .getPublicUrl(data.path)

    console.log('Public URL generated:', urlData.publicUrl)
    return urlData.publicUrl

  } catch (error) {
    console.error('Error uploading lead image:', error)
    throw error
  }
}

export const deleteLeadImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/')
    const filename = urlParts[urlParts.length - 1]
    
    console.log('Deleting image:', filename)

    const { error } = await supabase.storage
      .from('lead-images')
      .remove([filename])

    if (error) {
      console.error('Storage delete error:', error)
      throw new Error(`Failed to delete image: ${error.message}`)
    }

    console.log('Image deleted successfully')
  } catch (error) {
    console.error('Error deleting lead image:', error)
    throw error
  }
}

export const createLeadWithImage = async (
  leadData: Omit<Lead, 'id' | 'created_at' | 'image_url'>, 
  imageBlob?: Blob
): Promise<Lead> => {
  console.log('Creating lead with image data:', leadData)
  
  try {
    // First, create the lead without image
    const newLead = await createLead(leadData)
    
    let finalLead = newLead
    
    // If image is provided, upload it and update the lead
    if (imageBlob) {
      console.log('Uploading image for new lead:', newLead.id)
      const imageUrl = await uploadLeadImage(imageBlob, newLead.id)
      
      // Update lead with image URL
      finalLead = await updateLead(newLead.id, { image_url: imageUrl })
      
      // Send to N8N webhook after successful Supabase operations
      // Note: This function is deprecated in favor of calling sendToN8NWebhook directly from components
      // await sendToN8NWebhook(...) - moved to component level
    }
    
    return finalLead
  } catch (error) {
    console.error('Error creating lead with image:', error)
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
    console.log('Uploading syrup bottle photo...')
    
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
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload syrup photo: ${uploadError.message}`)
    }

    console.log('Syrup photo uploaded successfully:', uploadData.path)

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
      
      // Log comparison with working leads table
      console.log('For comparison, this works fine with leads table. Check policies!')
      
      throw new Error(`Failed to record syrup photo: ${dbError.message} (Code: ${dbError.code})`)
    }

    console.log('Syrup photo recorded in database:', dbData.id)
    return dbData

  } catch (error) {
    console.error('Error uploading syrup photo:', error)
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
      console.error('Error fetching syrup photos:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error getting syrup photos:', error)
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
      console.error('Error fetching syrup photo:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error getting syrup photo by ID:', error)
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
      console.error('Storage delete error:', storageError)
      throw new Error(`Failed to delete syrup photo from storage: ${storageError.message}`)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('syrup_photos')
      .delete()
      .eq('id', id)

    if (dbError) {
      console.error('Database delete error:', dbError)
      throw new Error(`Failed to delete syrup photo from database: ${dbError.message}`)
    }

    console.log('Syrup photo deleted successfully:', id)
  } catch (error) {
    console.error('Error deleting syrup photo:', error)
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
    console.error('Error getting syrup photos for N8N:', error)
    throw error
  }
}

// N8N Webhook Integration
const N8N_WEBHOOK_URL = 'https://primary-production-b68a.up.railway.app/webhook/gen-ai'
const N8N_ANALYZE_URL = 'https://primary-production-b68a.up.railway.app/webhook/analyze'

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
): Promise<void> => {
  try {
    console.log('Sending all customer data to N8N webhook...')
    
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
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`)
    }

    console.log('Successfully sent all customer data to N8N webhook')
    
  } catch (error) {
    console.error('Error sending to N8N webhook:', error)
    // Don't throw error - webhook failure shouldn't block lead creation
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
  try {
    console.log('Sending image for analysis to N8N...')
    
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
    })

    if (!response.ok) {
      throw new Error(`N8N analysis failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Successfully received analysis from N8N:', result)
    
    return result
    
  } catch (error) {
    console.error('Error analyzing image with N8N:', error)
    throw error
  }
}

// Drink Menu Functions
export const getDrinkByName = async (name: string): Promise<DrinkMenu | null> => {
  try {
    console.log('Fetching drink details for:', name)
    
    const { data, error } = await supabase
      .from('drink_menu')
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching drink details:', error)
      return null
    }

    console.log('Drink details found:', data)
    return data
  } catch (error) {
    console.error('Error getting drink by name:', error)
    return null
  }
}

// Test Supabase connection
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...')
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Connection test failed:', error)
      return { success: false, error: error.message }
    }

    console.log('Connection test successful - table exists and is accessible')
    return { success: true, data }
  } catch (error) {
    console.error('Connection test error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
} 