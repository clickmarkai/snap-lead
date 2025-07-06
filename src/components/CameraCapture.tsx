import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, RotateCcw, User, Brain, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createLead, analyzeImageWithN8N, getDrinkByName, DrinkMenu, base64ToBlob, sendToN8NWebhook } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CameraCaptureProps {
  onPhotoTaken?: (photoData: string) => void;
  onLeadSaved?: () => void;
}

interface PreCaptureFormData {
  name: string;
  gender: 'male' | 'female' | 'other' | '';
  coffeePreference: 'coffee' | 'non-coffee' | '';
  alcoholPreference: 'cocktail' | 'non-alcohol' | '';
}

interface LeadFormData {
  email: string;
  whatsapp: string;
}

export const CameraCapture = ({ onPhotoTaken, onLeadSaved }: CameraCaptureProps) => {
  const [isActive, setIsActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [drinkDetails, setDrinkDetails] = useState<DrinkMenu | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [preCaptureCompleted, setPreCaptureCompleted] = useState(false);
  const [preCaptureData, setPreCaptureData] = useState<PreCaptureFormData>({
    name: '',
    gender: '',
    coffeePreference: '',
    alcoholPreference: ''
  });
  const [leadFormData, setLeadFormData] = useState<LeadFormData>({
    email: '',
    whatsapp: ''
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Alert system state
  const [currentAlert, setCurrentAlert] = useState<{
    type: 'warning' | 'destructive' | 'default';
    title: string;
    description: string;
  } | null>(null);

  // Alert helper functions
  const showAlert = useCallback((type: 'warning' | 'destructive' | 'default', title: string, description: string) => {
    setCurrentAlert({ type, title, description });
    // Auto-hide alert after 5 seconds
    setTimeout(() => {
      setCurrentAlert(null);
    }, 5000);
  }, []);

  const hideAlert = useCallback(() => {
    setCurrentAlert(null);
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setIsActive(true); // Set active first to render video element
    setDebugInfo('Requesting camera access...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Prefer front camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setDebugInfo('Camera stream obtained, setting up video...');
      
      // Wait a bit for the video element to be rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            setDebugInfo('Video metadata loaded, camera should be active');
            setIsLoading(false);
          };
          
          // Add error handler for video element
          videoRef.current.onerror = (error) => {
            console.error('Video element error:', error);
            setDebugInfo('Video element error occurred');
            setIsLoading(false);
          };
        } else {
          setDebugInfo('Video ref is still null after timeout');
          setIsLoading(false);
          setIsActive(false);
        }
      }, 100); // Small delay to ensure video element is rendered
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      setDebugInfo(`Camera error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
      setIsActive(false);
      showAlert("destructive", "Camera Error", "Unable to access camera. Please check permissions.");
    }
  }, [showAlert]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setCapturedPhoto(null);
    setAnalysisResults(null);
    setDrinkDetails(null);
    setShowLeadForm(false);
    setShowThankYou(false);
    setPreCaptureCompleted(false);
    setPreCaptureData({
      name: '',
      gender: '',
      coffeePreference: '',
      alcoholPreference: ''
    });
  }, []);

  const retakePhoto = useCallback(async () => {
    setCapturedPhoto(null);
    setAnalysisResults(null);
    setDrinkDetails(null);
    setAnalysisFailed(false);
    setShowLeadForm(false);
    setIsActive(true); // Set active first to render video element
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Prefer front camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera during retake:', error);
      setIsActive(false); // Reset if error occurs
      showAlert("destructive", "Camera Error", "Unable to restart camera. Please try again.");
    }
  }, [showAlert]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to base64
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoData);
    onPhotoTaken?.(photoData);

    // Stop the camera stream after capturing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, [onPhotoTaken]);

  const validateAndCompletePreCapture = useCallback(() => {
    if (!preCaptureData.name || !preCaptureData.gender || !preCaptureData.coffeePreference || !preCaptureData.alcoholPreference) {
      showAlert("destructive", "Missing Information", "Please fill in all required fields: Name, Gender, Coffee and Drink preferences.");
      return;
    }
    
    setPreCaptureCompleted(true);
    showAlert("default", "Preferences Saved", "Now you can take a photo.");
  }, [preCaptureData.name, preCaptureData.gender, preCaptureData.coffeePreference, preCaptureData.alcoholPreference, showAlert]);

  const constructCategory = useCallback((coffeePreference: string, alcoholPreference: string): string => {
    if (coffeePreference === 'non-coffee' && alcoholPreference === 'non-alcohol') {
      return 'Non-Coffee Mocktail';
    } else if (coffeePreference === 'coffee' && alcoholPreference === 'non-alcohol') {
      return 'Coffee Mocktail';
    } else if (coffeePreference === 'coffee' && alcoholPreference === 'cocktail') {
      return 'Coffee Cocktail';
    } else if (coffeePreference === 'non-coffee' && alcoholPreference === 'cocktail') {
      return 'Non-Coffee Cocktail';
    }
    return 'Unknown Category'; // fallback
  }, []);

  const saveLead = useCallback(async () => {
    if (!capturedPhoto) {
      showAlert("destructive", "No Photo", "Please take a photo first.");
      return;
    }

    // Start analysis flow
    setIsAnalyzing(true);
    setAnalysisFailed(false);
    let analysisSuccessful = false;
    
    try {
      console.log('Starting image analysis...');
      
      // Convert base64 to Blob for N8N analysis
      const imageBlob = base64ToBlob(capturedPhoto, 'image/jpeg');
      
      // Construct category based on preferences
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      
      // Call N8N analysis webhook with category and customer data
      const analysisResults = await analyzeImageWithN8N(
        imageBlob, 
        category,
        preCaptureData.name,
        preCaptureData.gender,
        preCaptureData.coffeePreference,
        preCaptureData.alcoholPreference
      );
      
      if (analysisResults) {
        setAnalysisResults(analysisResults);
        analysisSuccessful = true;
        console.log('Analysis complete, proceeding to form...');
        
        // Fetch drink details if drink name is available
        if (analysisResults.drink) {
          try {
            const drinkInfo = await getDrinkByName(analysisResults.drink);
            setDrinkDetails(drinkInfo);
          } catch (error) {
            console.error('Error fetching drink details:', error);
            setDrinkDetails(null);
          }
        }
      } else {
        setAnalysisResults(null);
        setAnalysisFailed(true);
        console.log('Analysis returned empty result');
      }
      
    } catch (error) {
      console.error('Error during image analysis:', error);
      showAlert("destructive", "Analysis Failed", "Analysis failed. Please try again or proceed manually.");
      
      setAnalysisResults(null);
      setAnalysisFailed(true);
      analysisSuccessful = false;
    } finally {
      setIsAnalyzing(false);
      // Only proceed to lead form if analysis was successful
      if (analysisSuccessful) {
        setShowLeadForm(true);
      }
      // If analysis failed, stay on photo preview
    }
  }, [capturedPhoto, constructCategory, preCaptureData, showAlert]);

  const proceedToLeadForm = useCallback(() => {
    setAnalysisFailed(false);
    setShowLeadForm(true);
  }, []);

  const resetForNextCustomer = useCallback(() => {
    console.log('Resetting for next customer - returning to preferences page');
    // Reset everything for next customer
    setCapturedPhoto(null);
    setAnalysisResults(null);
    setDrinkDetails(null);
    setShowLeadForm(false);
    setShowThankYou(false);
    setPreCaptureCompleted(false);
    setPreCaptureData({
      name: '',
      gender: '',
      coffeePreference: '',
      alcoholPreference: ''
    });
    setLeadFormData({
      email: '',
      whatsapp: ''
    });
    console.log('Reset complete - should now show preferences page');
  }, []);

  // Auto-redirect after showing thank you screen
  useEffect(() => {
    if (showThankYou) {
      console.log('Thank you screen activated, redirecting in 5 seconds');
      
      // Simple 5-second timer
      const redirectTimer = setTimeout(() => {
        console.log('5 seconds elapsed, resetting for next customer');
        resetForNextCustomer();
      }, 5000);

      return () => clearTimeout(redirectTimer);
    }
  }, [showThankYou, resetForNextCustomer]);

  const saveLeadToDatabase = useCallback(async () => {
    if (!capturedPhoto) return;

    setIsProcessing(true);
    
    try {
      console.log('Processing customer data and sending to N8N...');
      
      // Convert base64 to Blob for N8N webhook
      const imageBlob = base64ToBlob(capturedPhoto, 'image/jpeg');
      
      // Construct category for database notes
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      
      // Create lead in database
      await createLead({
        email: leadFormData.email,
        whatsapp: leadFormData.whatsapp,
        status: 'new',
        source: 'Photo Capture',
        notes: `Category: ${category}
Name: ${preCaptureData.name}
Gender: ${preCaptureData.gender}
Coffee Preference: ${preCaptureData.coffeePreference}
Alcohol Preference: ${preCaptureData.alcoholPreference}`.trim(),
      });

      // Send all customer data to N8N webhook
      await sendToN8NWebhook(
        leadFormData.email,
        leadFormData.whatsapp,
        imageBlob,
        preCaptureData.name,
        preCaptureData.gender,
        preCaptureData.coffeePreference,
        preCaptureData.alcoholPreference,
        category,
        analysisResults,
        drinkDetails?.description || undefined
      );

      console.log('Data saved successfully, showing thank you screen');
      
      // Show thank you screen instead of resetting immediately
      setShowLeadForm(false);
      setShowThankYou(true);
      
      console.log('Thank you screen should now be visible, showThankYou=true');
      onLeadSaved?.();
      
    } catch (error) {
      console.error('Error saving customer data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showAlert("destructive", "Save Failed", `Failed to save your information: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedPhoto, leadFormData, showAlert, onLeadSaved]);

  return (
    <div className="space-y-8 lg:space-y-12">
      {/* Centralized Alert Container at the Top */}
      {(currentAlert || (showLeadForm && !analysisResults)) && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-auto px-4">
          <Alert 
            variant={currentAlert?.type || "warning"} 
            className="shadow-lg relative"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">
                {currentAlert?.title || "Analysis Unavailable"}
              </div>
              <div className="text-sm opacity-90">
                {currentAlert?.description || "The AI analysis could not be completed, but you can still save your information."}
              </div>
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={hideAlert}
              className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-transparent opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      )}
      
      <Card>
        <CardContent className="p-8 lg:p-12">
          <div className="space-y-4">

            {/* Pre-Capture Form - First Step */}
            {!preCaptureCompleted && !isActive && !capturedPhoto && !showLeadForm && !showThankYou && (
              <div className="max-w-4xl lg:max-w-6xl mx-auto space-y-6 px-4 lg:px-8">
                {/* Header inside card on the left */}
                <div className="text-left mb-6">
                  <h3 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">Your Preferences</h3>
                  <p className="text-sm lg:text-base text-muted-foreground">Fill in your preferences before taking your photo</p>
                </div>
                <div className="space-y-5 lg:space-y-6">
                  {/* Name and Gender - Same row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-2 lg:space-y-3">
                      <Label htmlFor="name" className="text-base lg:text-lg font-medium">Name *</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        value={preCaptureData.name}
                        onChange={(e) => setPreCaptureData(prev => ({ ...prev, name: e.target.value }))}
                        className="h-12 lg:h-14 text-base lg:text-lg rounded-xl border-2 focus:border-primary"
                        autoComplete="off"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2 lg:space-y-3">
                      <Label htmlFor="gender" className="text-base lg:text-lg font-medium">Gender *</Label>
                      <Select
                        value={preCaptureData.gender}
                        onValueChange={(value: 'male' | 'female' | 'other') => 
                          setPreCaptureData(prev => ({ ...prev, gender: value }))
                        }
                      >
                        <SelectTrigger className="h-12 lg:h-14 text-base lg:text-lg rounded-xl border-2 focus:border-primary">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="male" className="text-base lg:text-lg p-3">Male</SelectItem>
                          <SelectItem value="female" className="text-base lg:text-lg p-3">Female</SelectItem>
                          <SelectItem value="other" className="text-base lg:text-lg p-3">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Coffee and Drink Preferences - Same row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-2 lg:space-y-3">
                      <Label htmlFor="coffee" className="text-base lg:text-lg font-medium">Coffee Preference *</Label>
                      <Select
                        value={preCaptureData.coffeePreference}
                        onValueChange={(value: 'coffee' | 'non-coffee') => 
                          setPreCaptureData(prev => ({ ...prev, coffeePreference: value }))
                        }
                      >
                        <SelectTrigger className="h-12 lg:h-14 text-base lg:text-lg rounded-xl border-2 focus:border-primary">
                          <SelectValue placeholder="Coffee preference" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="coffee" className="text-base lg:text-lg p-3">Coffee</SelectItem>
                          <SelectItem value="non-coffee" className="text-base lg:text-lg p-3">Non-Coffee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2 lg:space-y-3">
                      <Label htmlFor="alcohol" className="text-base lg:text-lg font-medium">Drink Preference *</Label>
                      <Select
                        value={preCaptureData.alcoholPreference}
                        onValueChange={(value: 'cocktail' | 'non-alcohol') => 
                          setPreCaptureData(prev => ({ ...prev, alcoholPreference: value }))
                        }
                      >
                        <SelectTrigger className="h-12 lg:h-14 text-base lg:text-lg rounded-xl border-2 focus:border-primary">
                          <SelectValue placeholder="Drink preference" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="cocktail" className="text-base lg:text-lg p-3">Cocktail</SelectItem>
                          <SelectItem value="non-alcohol" className="text-base lg:text-lg p-3">Non-Alcohol</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="pt-6 lg:pt-8">
                  <Button
                    onClick={validateAndCompletePreCapture}
                    className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-lg lg:text-xl py-5 lg:py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <Camera className="mr-3 h-5 w-5 lg:h-6 lg:w-6" />
                    Continue to Camera
                  </Button>
                </div>
              </div>
            )}

            {/* Camera Ready - After Pre-Capture */}
            {preCaptureCompleted && !isActive && !capturedPhoto && !showLeadForm && !showThankYou && (
              <div className="text-center space-y-6 lg:space-y-8 px-4 lg:px-8">
                <div className="flex items-center justify-center gap-4 lg:gap-6">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center shadow-lg">
                    <Camera className="h-6 w-6 lg:h-8 lg:w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-semibold text-foreground">Ready to Capture</h3>
                </div>
                
                <div className="bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-3xl p-6 lg:p-8 border border-primary/20 max-w-3xl lg:max-w-5xl mx-auto">
                  
                  <div className="space-y-4 lg:space-y-6 mb-6 lg:mb-8">
                    <div className="text-center mb-4 lg:mb-6">
                      <span className="bg-primary text-primary-foreground px-6 py-3 lg:px-8 lg:py-4 rounded-full text-sm lg:text-base font-medium">
                        {constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4 text-sm lg:text-base">
                      <span><strong>Name:</strong> {preCaptureData.name}</span>
                      <span><strong>Gender:</strong> {preCaptureData.gender}</span>
                      <span><strong>Coffee:</strong> {preCaptureData.coffeePreference}</span>
                      <span><strong>Drink:</strong> {preCaptureData.alcoholPreference}</span>
                    </div>
                  </div>
                  
                  <p className="text-base lg:text-lg text-muted-foreground mb-6 lg:mb-8 max-w-2xl mx-auto">Take a photo to get your personalized drink recommendation</p>
                  
                  {debugInfo && (
                    <div className="text-xs text-muted-foreground mb-4 p-2 bg-muted rounded">
                      Debug: {debugInfo}
                    </div>
                  )}
                  
                  <div className="flex flex-col md:flex-row gap-4 lg:gap-6 justify-center max-w-3xl mx-auto">
                    <Button
                      onClick={() => setPreCaptureCompleted(false)}
                      variant="outline"
                      className="px-6 py-4 lg:px-8 lg:py-6 text-base lg:text-lg rounded-2xl border-2 hover:bg-muted/50"
                    >
                      Edit Preferences
                    </Button>
                    <Button
                      onClick={startCamera}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-lg lg:text-xl px-8 py-4 lg:px-10 lg:py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-white mr-3"></div>
                          Starting Camera...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-3 h-6 w-6 lg:h-8 lg:w-8" />
                          Start Camera
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Camera View - Full Screen */}
            {isActive && !showThankYou && (
              <div className="fixed inset-0 z-50 bg-black">
                <div className="relative w-full h-full flex flex-col">
                  {/* Video container - full screen */}
                  <div className="flex-1 relative bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Top header with close button */}
                  <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-6 lg:p-8">
                    <div className="flex justify-between items-center">
                      <div className="text-white font-medium text-xl lg:text-2xl">Camera</div>
                      <Button
                        onClick={stopCamera}
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 rounded-full h-14 w-14 lg:h-16 lg:w-16"
                      >
                        <X className="h-8 w-8 lg:h-10 lg:w-10" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Loading overlay */}
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="text-white text-lg">Setting up camera...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Camera controls - bottom */}
                  {!isLoading && (
                    <>
                      {/* Bottom gradient overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent h-40 pointer-events-none" />
                      
                      {/* Camera controls */}
                      <div className="absolute bottom-12 lg:bottom-16 left-0 right-0 z-10">
                        <div className="flex items-center justify-center">
                          {/* iPhone-style capture button - larger for tablets */}
                          <Button
                            onClick={capturePhoto}
                            variant="ghost"
                            className="h-24 w-24 lg:h-32 lg:w-32 rounded-full bg-white/90 border-4 lg:border-6 border-white hover:bg-white shadow-2xl transition-all duration-150 active:scale-90 p-0"
                          >
                            <div className="h-20 w-20 lg:h-26 lg:w-26 rounded-full bg-white shadow-inner"></div>
                          </Button>
                        </div>
                        
                        {/* Instructions text */}
                        <div className="text-center mt-6 lg:mt-8">
                          <p className="text-white/80 text-base lg:text-xl">Tap the circle to take a photo</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Captured Photo - Full Screen */}
            {capturedPhoto && !isAnalyzing && !showLeadForm && !showThankYou && (
              <div className="fixed inset-0 z-50 bg-black">
                <div className="relative w-full h-full flex flex-col">
                  {/* Photo container - full screen */}
                  <div className="flex-1 relative bg-black">
                    <img
                      src={capturedPhoto}
                      alt="Captured Photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Top header */}
                  <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-6 lg:p-8">
                    <div className="flex justify-between items-center">
                      <div className="text-white font-medium text-xl lg:text-2xl">Photo Preview</div>
                      <div className="flex items-center gap-4 lg:gap-6">
                        <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 lg:px-6 lg:py-3 rounded-full text-sm lg:text-base font-medium">
                          ✓ Captured
                        </div>
                        <Button 
                          onClick={stopCamera} 
                          variant="ghost" 
                          size="icon"
                          className="text-white hover:bg-white/20 rounded-full h-14 w-14 lg:h-16 lg:w-16"
                        >
                          <X className="h-8 w-8 lg:h-10 lg:w-10" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom controls */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                    <div className="p-8 lg:p-12">
                      {/* Action buttons */}
                      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-4xl mx-auto">
                        <Button
                          onClick={retakePhoto} 
                          variant="outline"
                          size="lg"
                          className="flex-1 text-lg lg:text-xl py-6 lg:py-8 rounded-2xl bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm min-h-[72px] lg:min-h-[80px]"
                        >
                          <RotateCcw className="h-6 w-6 lg:h-8 lg:w-8 mr-3" />
                          Retake
                        </Button>
                        
                        {analysisFailed ? (
                          <>
                            <Button
                              onClick={saveLead}
                              disabled={isProcessing}
                              size="lg"
                              variant="outline"
                              className="flex-1 text-lg lg:text-xl py-6 lg:py-8 rounded-2xl bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm min-h-[72px] lg:min-h-[80px]"
                            >
                              <RotateCcw className="h-6 w-6 lg:h-8 lg:w-8 mr-3" />
                              Try Again
                            </Button>
                            <Button
                              onClick={proceedToLeadForm}
                              size="lg"
                              className="flex-1 text-lg lg:text-xl py-6 lg:py-8 rounded-2xl shadow-lg min-h-[72px] lg:min-h-[80px] bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                            >
                              <ArrowRight className="h-6 w-6 lg:h-8 lg:w-8 mr-3" />
                              Proceed Anyway
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={saveLead}
                            disabled={isProcessing}
                            size="lg"
                            className="flex-1 text-lg lg:text-xl py-6 lg:py-8 rounded-2xl shadow-lg min-h-[72px] lg:min-h-[80px] bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
                          >
                            <ArrowRight className="h-6 w-6 lg:h-8 lg:w-8 mr-3" />
                            Analyze & Save
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Loading Screen */}
            {isAnalyzing && capturedPhoto && !showThankYou && (
              <div className="fixed inset-0 z-50 bg-black">
                <div className="relative w-full h-full flex flex-col">
                  {/* Photo container - full screen with overlay */}
                  <div className="flex-1 relative bg-black">
                    <img
                      src={capturedPhoto}
                      alt="Analyzing Photo"
                      className="w-full h-full object-cover opacity-50"
                    />
                    
                    {/* Analysis overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center bg-black/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 mx-6 lg:mx-8 border border-white/20 max-w-2xl">
                        <div className="mx-auto w-24 h-24 lg:w-32 lg:h-32 mb-8 lg:mb-10 relative">
                          <div className="absolute inset-0 rounded-full border-4 lg:border-6 border-primary/30"></div>
                          <div className="absolute inset-0 rounded-full border-4 lg:border-6 border-transparent border-t-primary animate-spin"></div>
                          <Brain className="absolute inset-4 lg:inset-6 h-16 w-16 lg:h-20 lg:w-20 text-primary" />
                        </div>
                        <h3 className="text-3xl lg:text-4xl font-semibold text-white mb-4 lg:mb-6">Analyzing Image</h3>
                        <p className="text-white/80 text-xl lg:text-2xl mb-6 lg:mb-8">AI is processing your photo...</p>
                        <div className="flex items-center justify-center space-x-2 lg:space-x-3">
                          <div className="w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            

            {/* Your Information Form - After Analysis */}
            {showLeadForm && capturedPhoto && !showThankYou && (
              <div className="max-w-4xl lg:max-w-6xl mx-auto space-y-6 px-4 lg:px-8">
                {/* Header with photo and description side by side */}
                <div className="flex flex-col md:flex-row items-center gap-4 lg:gap-6 mb-6">
                  {/* Photo preview thumbnail - Left side */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg flex items-center justify-center bg-muted/10">
                      <img
                        src={capturedPhoto}
                        alt="Captured photo thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Title and description - Right side */}
                  <div className="text-center md:text-left flex-1">
                    <h3 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">Your Information</h3>
                    <p className="text-sm lg:text-base text-muted-foreground">Enter your contact details to save your recommendation</p>
                  </div>
                </div>
                
                {/* Analysis Results */}
                {analysisResults && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-2xl p-4 lg:p-6 text-sm lg:text-base mb-6">
                      <div className="flex items-center space-x-2 lg:space-x-3 mb-3 lg:mb-4">
                        <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                        <p className="font-semibold text-foreground text-base lg:text-lg">Analysis Completed</p>
                      </div>
                      
                      {analysisResults.drink && (
                        <div className="bg-card rounded-xl p-3 lg:p-4 border border-primary/10 shadow-sm mb-3 lg:mb-4">
                          <div className="text-center">
                            <h3 className="text-lg lg:text-xl font-bold text-primary mb-2 lg:mb-3">Recommended Drink</h3>
                            <div className="bg-primary text-primary-foreground px-4 py-2 lg:px-6 lg:py-3 rounded-full inline-block text-sm lg:text-base font-medium mb-2 lg:mb-3">
                              {analysisResults.drink}
                            </div>
                            {drinkDetails && drinkDetails.description && (
                              <div className="bg-card rounded-lg p-2 lg:p-3 mt-2 lg:mt-3 border border-primary/10">
                                <p className="text-xs lg:text-sm font-medium text-muted-foreground mb-1 lg:mb-2">DESCRIPTION</p>
                                <p className="text-foreground text-sm lg:text-base leading-relaxed">
                                  {drinkDetails.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 lg:gap-3">
                        {analysisResults.mood && (
                          <div className="bg-card rounded-xl p-2 lg:p-3 border border-primary/10 shadow-sm">
                            <div className="text-center">
                              <p className="text-xs lg:text-sm font-medium text-muted-foreground mb-1">MOOD</p>
                              <p className="text-sm lg:text-base font-semibold text-foreground">{analysisResults.mood}</p>
                            </div>
                          </div>
                        )}
                        
                        {analysisResults.age && (
                          <div className="bg-card rounded-xl p-2 lg:p-3 border border-primary/10 shadow-sm">
                            <div className="text-center">
                              <p className="text-xs lg:text-sm font-medium text-muted-foreground mb-1">AGE</p>
                              <p className="text-sm lg:text-base font-semibold text-foreground">{analysisResults.age} years</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Show raw data as fallback if structure is different */}
                      {(!analysisResults.mood && !analysisResults.age && !analysisResults.drink) && (
                        <div className="bg-card rounded-xl p-2 lg:p-3 border border-primary/10">
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                            {typeof analysisResults === 'string' 
                              ? analysisResults 
                              : JSON.stringify(analysisResults, null, 2)
                            }
                          </pre>
                        </div>
                      )}
                  </div>
                )}



                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-3 lg:space-y-4">
                    <Label htmlFor="email" className="text-lg lg:text-xl font-medium">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@example.com"
                      value={leadFormData.email}
                      onChange={(e) => setLeadFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-14 lg:h-16 text-base lg:text-lg rounded-xl border-2 focus:border-primary"
                      autoComplete="off"
                    />
                  </div>
                  
                  <div className="space-y-3 lg:space-y-4">
                    <Label htmlFor="whatsapp" className="text-lg lg:text-xl font-medium">WhatsApp Number *</Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="+62 812-3456-7890"
                      value={leadFormData.whatsapp}
                      onChange={(e) => setLeadFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="h-14 lg:h-16 text-base lg:text-lg rounded-xl border-2 focus:border-primary"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (!leadFormData.email || !leadFormData.whatsapp) {
                      showAlert("destructive", "Missing Information", "Please fill in email and WhatsApp number.");
                      return;
                    }
                    saveLeadToDatabase();
                  }}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-lg lg:text-xl py-5 lg:py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-b-2 border-white mr-3"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-3 h-5 w-5 lg:h-6 lg:w-6" />
                      Done
                    </>
                  )}
                </Button>
              </div>
            )}

                        {/* Thank You Screen - Simple */}
            {showThankYou && (
              <div className="max-w-xl mx-auto px-4 lg:px-8">
                <div className="text-center space-y-6 lg:space-y-8">
                  {/* Simple Success Icon */}
                  <div className="mx-auto w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl">
                    <CheckCircle className="h-10 w-10 lg:h-12 lg:w-12 text-white" />
                  </div>
                  
                  {/* Simple Thank You Message */}
                  <div className="space-y-3 lg:space-y-4">
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                      Thank You!
                    </h2>
                    <p className="text-lg lg:text-xl text-muted-foreground">
                      Have a great day! ✨
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};