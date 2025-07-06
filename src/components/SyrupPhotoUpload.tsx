import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadSyrupPhoto, getSyrupPhotos, type SyrupPhoto } from '@/lib/supabase';
import { formatDateOnlyJakarta } from '@/lib/utils';

export const SyrupPhotoUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<SyrupPhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const { toast } = useToast();

  // Load recent photos
  const loadRecentPhotos = useCallback(async () => {
    setIsLoadingPhotos(true);
    try {
      const photos = await getSyrupPhotos(10); // Get last 10 photos
      setRecentPhotos(photos);
    } catch (error) {
      console.error('Error loading recent photos:', error);
      toast({
        title: "Error",
        description: "Failed to load recent photos.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [toast]);

  // Load photos on component mount
  React.useEffect(() => {
    loadRecentPhotos();
  }, [loadRecentPhotos]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a syrup bottle photo to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      await uploadSyrupPhoto(
        selectedFile,
        selectedFile.name,
        description || undefined,
        tags.length > 0 ? tags : undefined
      );

      toast({
        title: "Upload Successful",
        description: "Syrup bottle photo uploaded and recorded successfully!",
      });

      // Reset form
      removeFile();
      setDescription('');
      setTags([]);
      
      // Reload recent photos
      await loadRecentPhotos();

    } catch (error) {
      console.error('Error uploading syrup photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Upload Failed",
        description: `Failed to upload syrup photo: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Upload Syrup Bottle Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <Label>Syrup Bottle Photo *</Label>
            
            {!selectedFile ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Click to upload syrup bottle photo</p>
                  <p className="text-sm text-muted-foreground">Supports: JPG, PNG, WebP (max 10MB)</p>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={previewUrl!}
                    alt="Selected syrup bottle"
                    className="w-full h-64 object-cover"
                  />
                  <Button
                    onClick={removeFile}
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  File: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the syrup bottle (flavor, brand, size, etc.)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag (e.g., strawberry, chocolate)"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <Button onClick={addTag} variant="outline">Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
            size="lg"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Syrup Photo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Photos */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Syrup Bottle Photos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPhotos ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading recent photos...</p>
            </div>
          ) : recentPhotos.length === 0 ? (
            <div className="text-center py-8">
              <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No syrup photos uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentPhotos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  <div className="aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={photo.public_url}
                      alt={photo.original_name || photo.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium truncate">{photo.original_name || photo.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateOnlyJakarta(photo.created_at)}
                    </p>
                    {photo.tags && photo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {photo.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {photo.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{photo.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 