import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, RotateCcw, User, Brain, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createLead, analyzeImageWithN8N, getDrinkByName, DrinkMenu, base64ToBlob, sendToN8NWebhook, getFortuneByMood, Fortune } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import logo from '@/assets/logo.png';

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
  const [analysisResults, setAnalysisResults] = useState<{
    drink_recommendation?: string;
    drink_name?: string;
    description?: string;
    ingredients?: string[];
    instructions?: string[];
    mood?: string;
    age?: string;
    drink?: string;
    emotion?: string;
  } | null>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [drinkDetails, setDrinkDetails] = useState<DrinkMenu | null>(null);
  const [fortuneData, setFortuneData] = useState<Fortune | null>(null);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showProcessingScreen, setShowProcessingScreen] = useState(false);
  const [showResponseImage, setShowResponseImage] = useState(false);
  const [n8nResponseImage, setN8nResponseImage] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [preCaptureCompleted, setPreCaptureCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
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
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Prefer front camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      // Wait a bit for the video element to be rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            setIsLoading(false);
          };
          
          // Add error handler for video element
          videoRef.current.onerror = (error) => {
            setIsLoading(false);
            setIsActive(false);
          };
        } else {
          setIsLoading(false);
          setIsActive(false);
        }
      }, 100); // Small delay to ensure video element is rendered
      
    } catch (error) {
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
    setFortuneData(null);
    setShowAnalysisResults(false);
    setShowLeadForm(false);
    setShowProcessingScreen(false);
    setShowResponseImage(false);
    setN8nResponseImage(null);
    setShowThankYou(false);
    setPreCaptureCompleted(false);
    setCurrentStep(1);
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
    setFortuneData(null);
    setAnalysisFailed(false);
    setShowAnalysisResults(false);
    setShowLeadForm(false);
    setShowProcessingScreen(false);
    setShowResponseImage(false);
    setN8nResponseImage(null);
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
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    
    // Trigger callback
    onPhotoTaken?.(photoData);
  }, [onPhotoTaken]);

  const handleStepNext = useCallback(() => {
    if (currentStep === 1) {
      if (!preCaptureData.name.trim()) {
        showAlert("destructive", "Name Required", "Please enter your name.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!preCaptureData.gender) {
        showAlert("destructive", "Gender Required", "Please select your gender.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!preCaptureData.coffeePreference) {
        showAlert("destructive", "Coffee Preference Required", "Please select your coffee preference.");
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!preCaptureData.alcoholPreference) {
        showAlert("destructive", "Drink Preference Required", "Please select your drink preference.");
        return;
      }
      setPreCaptureCompleted(true);
      showAlert("default", "Preferences Saved", "Now you can take a photo.");
    }
  }, [currentStep, preCaptureData, showAlert]);

  const handleStepPrev = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const constructCategory = useCallback((coffeePreference: string, alcoholPreference: string) => {
    // Only allow these categories: 'Coffee Mocktail', 'Mocktail', 'Coffee Cocktail', 'Cocktail'
    if (coffeePreference === 'coffee' && alcoholPreference === 'cocktail') {
      return 'Coffee Cocktail';
    } else if (coffeePreference === 'coffee' && alcoholPreference === 'non-alcohol') {
      return 'Coffee Mocktail';
    } else if (coffeePreference === 'non-coffee' && alcoholPreference === 'cocktail') {
      return 'Cocktail';
    } else if (coffeePreference === 'non-coffee' && alcoholPreference === 'non-alcohol') {
      return 'Mocktail';
    }
    return 'Mocktail'; // fallback to most common case
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
        
        // Fetch drink details if drink name is available
        if (analysisResults.drink) {
          try {
            const drinkInfo = await getDrinkByName(analysisResults.drink);
            setDrinkDetails(drinkInfo);
          } catch (error) {
            setDrinkDetails(null);
          }
        }
        
        // Fetch fortune data if mood is available
        const mood = analysisResults.mood || analysisResults.emotion || analysisResults.feeling;
        if (mood) {
          try {
            const fortune = await getFortuneByMood(mood);
            setFortuneData(fortune);
          } catch (error) {
            setFortuneData(null);
          }
        }
      } else {
        setAnalysisResults(null);
        setAnalysisFailed(true);
      }
      
    } catch (error) {
      showAlert("destructive", "Analysis Failed", "Analysis failed. Please try again or proceed manually.");
      
      setAnalysisResults(null);
      setAnalysisFailed(true);
      analysisSuccessful = false;
    } finally {
      setIsAnalyzing(false);
      // Only proceed to show analysis results if analysis was successful
      if (analysisSuccessful) {
        setShowAnalysisResults(true);
      }
      // If analysis failed, stay on photo preview
    }
  }, [capturedPhoto, constructCategory, preCaptureData, showAlert]);

  const proceedToLeadForm = useCallback(() => {
    setAnalysisFailed(false);
    setShowAnalysisResults(false);
    setShowLeadForm(true);
  }, []);

  const sendImageToUser = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      // Construct category for the request
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      
      // Create FormData to send all data including the generated image
      const formData = new FormData();
      
      // Add core user information
      formData.append('email', leadFormData.email);
      formData.append('name', preCaptureData.name);
      formData.append('whatsapp', leadFormData.whatsapp);
      
      // Add user preferences
      formData.append('gender', preCaptureData.gender);
      formData.append('coffeePreference', preCaptureData.coffeePreference);
      formData.append('alcoholPreference', preCaptureData.alcoholPreference);
      formData.append('category', category);
      
      // Add analysis results if available
      if (analysisResults) {
        formData.append('analysisResults', JSON.stringify(analysisResults));
        if (analysisResults.mood) formData.append('mood', analysisResults.mood);
        if (analysisResults.age) formData.append('age', analysisResults.age);
        if (analysisResults.drink) formData.append('recommendedDrink', analysisResults.drink);
      }
      
      // Add timestamp
      formData.append('timestamp', new Date().toISOString());
      
      // Add the generated image
      if (n8nResponseImage) {
        if (n8nResponseImage.startsWith('data:')) {
          // Convert data URL to blob
          const response = await fetch(n8nResponseImage);
          const imageBlob = await response.blob();
          formData.append('generatedImage', imageBlob, 'generated-image.png');
        } else if (n8nResponseImage.startsWith('http')) {
          // If it's a URL, download and attach the image
          try {
            const imageResponse = await fetch(n8nResponseImage);
            if (imageResponse.ok) {
              const imageBlob = await imageResponse.blob();
              formData.append('generatedImage', imageBlob, 'generated-image.png');
            } else {
              // If download fails, just send the URL
              formData.append('generatedImageUrl', n8nResponseImage);
            }
          } catch (downloadError) {
            formData.append('generatedImageUrl', n8nResponseImage);
          }
        }
      }
      
      // Always add the generated image URL if present
      if (n8nResponseImage) {
        formData.append('imageUrl', n8nResponseImage);
      }
      
      // Send to webhook with FormData
      const response = await fetch('https://primary-production-b68a.up.railway.app/webhook/send', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
      
      // Proceed to thank you screen
      setShowResponseImage(false);
      setShowThankYou(true);
      onLeadSaved?.();
      
    } catch (error) {
      showAlert("destructive", "Send Failed", "Failed to send your information. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [leadFormData, preCaptureData, analysisResults, n8nResponseImage, constructCategory, showAlert, onLeadSaved]);

  const resetForNextCustomer = useCallback(() => {
    // Reset everything for next customer
    setCapturedPhoto(null);
    setAnalysisResults(null);
    setDrinkDetails(null);
    setFortuneData(null);
    setShowAnalysisResults(false);
    setShowLeadForm(false);
    setShowProcessingScreen(false);
    setShowResponseImage(false);
    setN8nResponseImage(null);
    setShowThankYou(false);
    setPreCaptureCompleted(false);
    setCurrentStep(1);
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
  }, []);

  // Auto-redirect after showing thank you screen
  useEffect(() => {
    if (showThankYou) {
      // Simple 5-second timer
      const redirectTimer = setTimeout(() => {
        resetForNextCustomer();
      }, 5000);

      return () => clearTimeout(redirectTimer);
    }
  }, [showThankYou, resetForNextCustomer]);

  const saveLeadToDatabase = useCallback(async () => {
    if (!capturedPhoto) return;

    // Show processing screen immediately
    setShowLeadForm(false);
    setShowProcessingScreen(true);
    setIsProcessing(true);
    
    try {
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
      
      // Send all customer data to N8N webhook and wait for response
      try {
        const responseImage = await sendToN8NWebhook(
          leadFormData.email,
          leadFormData.whatsapp,
          imageBlob,
          preCaptureData.name,
          preCaptureData.gender,
          preCaptureData.coffeePreference,
          preCaptureData.alcoholPreference,
          category,
          analysisResults,
          undefined // Removed drinkDetails?.description
        );
        
        // Hide processing screen
        setShowProcessingScreen(false);
        
        // If we received an image response, show it
        if (responseImage) {
          setN8nResponseImage(responseImage);
          setShowResponseImage(true);
          // Note: No auto-advance, waiting for user confirmation
        } else {
          setShowThankYou(true);
          onLeadSaved?.();
        }
      } catch (webhookError) {
        // Hide processing screen and proceed to thank you screen even if webhook fails
        setShowProcessingScreen(false);
        setShowThankYou(true);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showAlert("destructive", "Save Failed", `Failed to save your information: ${errorMessage}`);
      
      // Hide processing screen and return to lead form on error
      setShowProcessingScreen(false);
      setShowLeadForm(true);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedPhoto, leadFormData, showAlert, onLeadSaved, preCaptureData, analysisResults, constructCategory]);

  // Add a new state for re-generating loading
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Add a function to re-generate the personalized image
  const reGenerateImage = useCallback(async () => {
    if (!capturedPhoto) return;
    setIsRegenerating(true);
    setShowProcessingScreen(true);
    try {
      const imageBlob = base64ToBlob(capturedPhoto, 'image/jpeg');
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      // Always call the generate webhook again to get a new image
      const responseImage = await sendToN8NWebhook(
        leadFormData.email,
        leadFormData.whatsapp,
        imageBlob,
        preCaptureData.name,
        preCaptureData.gender,
        preCaptureData.coffeePreference,
        preCaptureData.alcoholPreference,
        category,
        analysisResults,
        undefined // No drink description
      );
      setShowProcessingScreen(false);
      if (responseImage) {
        setN8nResponseImage(responseImage);
        setShowResponseImage(true);
      } else {
        setShowThankYou(true);
        onLeadSaved?.();
      }
    } catch (error) {
      setShowProcessingScreen(false);
      showAlert("destructive", "Re-generate Failed", "Failed to re-generate your image. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  }, [capturedPhoto, leadFormData, preCaptureData, analysisResults, constructCategory, showAlert, onLeadSaved]);

  // Add email and phone validation helpers at the top of the component
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  const validatePhone = (phone: string) => {
    // Accepts 081200000000 or 81200000000, 10-15 digits, may start with 0
    return /^(0?\d{10,15})$/.test(phone.replace(/\D/g, ''));
  };

  return (
    <div className="space-y-8 lg:space-y-12">
      {/* Centralized Alert Container at the Top */}
      {currentAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-auto px-4">
          <Alert 
            variant={currentAlert.type} 
            className="bg-white shadow-lg rounded-xl relative"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">
                {currentAlert.title}
              </div>
              <div className="text-sm opacity-90">
                {currentAlert.description}
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

            {/* Pre-Capture Form - Step by Step */}
            {!preCaptureCompleted && !isActive && !capturedPhoto && !showLeadForm && !showThankYou && !showProcessingScreen && !showResponseImage && (
              <div className="max-w-4xl lg:max-w-6xl mx-auto space-y-6 px-4 lg:px-8 animate-fade-in">
                {/* Progress indicator */}
                <div className="text-left mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl lg:text-2xl font-semibold text-foreground">Your Preferences</h3>
                    <span className="text-sm lg:text-base text-muted-foreground">
                      Step {currentStep} of 4
                    </span>
                  </div>
                                          <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full progress-animate animate-pulse-glow"
                      style={{ width: `${(currentStep / 4) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Step 1: Name */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <h4 className="text-2xl lg:text-3xl font-bold text-foreground">What's your name?</h4>
                      <p className="text-base lg:text-lg text-muted-foreground">Let's start with your name</p>
                    </div>
                    
                    <div className="max-w-md mx-auto space-y-4">
                      <Input
                        type="text"
                        placeholder="Enter your name"
                        value={preCaptureData.name}
                        onChange={(e) => setPreCaptureData(prev => ({ ...prev, name: e.target.value }))}
                        className="h-14 lg:h-16 text-lg lg:text-xl text-center rounded-xl border-2 focus:border-primary input-animate bg-white"
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Gender */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <h4 className="text-2xl lg:text-3xl font-bold text-foreground">What's your gender?</h4>
                      <p className="text-base lg:text-lg text-muted-foreground">This helps us personalize your experience</p>
                    </div>
                    
                    <div className="max-w-md mx-auto">
                      <RadioGroup
                        value={preCaptureData.gender}
                        onValueChange={(value: 'male' | 'female' | 'other') => 
                          setPreCaptureData(prev => ({ ...prev, gender: value }))
                        }
                        className="space-y-4"
                      >
                        <div className="flex items-center space-x-4 p-4 rounded-xl border-2 hover:border-primary/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md animate-slide-up">
                          <RadioGroupItem value="male" id="male" className="h-5 w-5" />
                          <Label htmlFor="male" className="text-lg lg:text-xl cursor-pointer flex-1">Male</Label>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-xl border-2 hover:border-primary/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
                          <RadioGroupItem value="female" id="female" className="h-5 w-5" />
                          <Label htmlFor="female" className="text-lg lg:text-xl cursor-pointer flex-1">Female</Label>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-xl border-2 hover:border-primary/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md animate-slide-up" style={{ animationDelay: '0.2s' }}>
                          <RadioGroupItem value="other" id="other" className="h-5 w-5" />
                          <Label htmlFor="other" className="text-lg lg:text-xl cursor-pointer flex-1">Other</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Step 3: Coffee Preference */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <h4 className="text-2xl lg:text-3xl font-bold text-foreground">Do you like coffee?</h4>
                      <p className="text-base lg:text-lg text-muted-foreground">Choose your coffee preference</p>
                    </div>
                    
                    <div className="max-w-md mx-auto">
                      <RadioGroup
                        value={preCaptureData.coffeePreference}
                        onValueChange={(value: 'coffee' | 'non-coffee') => 
                          setPreCaptureData(prev => ({ ...prev, coffeePreference: value }))
                        }
                        className="space-y-4"
                      >
                        <div className="flex items-center space-x-4 p-4 rounded-xl border-2 hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="coffee" id="coffee" className="h-5 w-5" />
                          <Label htmlFor="coffee" className="text-lg lg:text-xl cursor-pointer flex-1">Yes, I love coffee ☕</Label>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-xl border-2 hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="non-coffee" id="non-coffee" className="h-5 w-5" />
                          <Label htmlFor="non-coffee" className="text-lg lg:text-xl cursor-pointer flex-1">No, I prefer non-coffee drinks 🥤</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Step 4: Alcohol Preference */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <h4 className="text-2xl lg:text-3xl font-bold text-foreground">Alcohol preference?</h4>
                      <p className="text-base lg:text-lg text-muted-foreground">Choose your drink type</p>
                    </div>
                    
                    <div className="max-w-md mx-auto">
                      <RadioGroup
                        value={preCaptureData.alcoholPreference}
                        onValueChange={(value: 'cocktail' | 'non-alcohol') => 
                          setPreCaptureData(prev => ({ ...prev, alcoholPreference: value }))
                        }
                        className="space-y-4"
                      >
                        <div className="flex items-center space-x-4 p-4 rounded-xl border-2 hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="cocktail" id="cocktail" className="h-5 w-5" />
                          <Label htmlFor="cocktail" className="text-lg lg:text-xl cursor-pointer flex-1">Cocktail/Alcohol 🍸</Label>
                        </div>
                        <div className="flex items-center space-x-4 p-4 rounded-xl border-2 hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="non-alcohol" id="non-alcohol" className="h-5 w-5" />
                          <Label htmlFor="non-alcohol" className="text-lg lg:text-xl cursor-pointer flex-1">Non-Alcoholic 🥤</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="pt-6 lg:pt-8">
                  <div className="max-w-md mx-auto animate-fade-in">
                    {currentStep === 1 ? (
                      <Button
                        onClick={handleStepNext}
                        className="w-full btn-primary-enhanced animate-scale-in"
                      >
                        Next
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={handleStepPrev}
                          className="btn-outline-enhanced animate-slide-up"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleStepNext}
                          className="btn-primary-enhanced animate-slide-up"
                        >
                          {currentStep === 4 ? (
                            <>
                              <Camera className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
                              Continue
                            </>
                          ) : (
                            <>
                              Next
                              <ArrowRight className="ml-2 h-4 w-4 lg:h-5 lg:w-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Camera Ready - After Pre-Capture */}
            {preCaptureCompleted && !isActive && !capturedPhoto && !showLeadForm && !showThankYou && !showProcessingScreen && !showResponseImage && (
              <div className="text-center space-y-6 lg:space-y-8 px-4 lg:px-8 animate-scale-in">
                <div className="flex items-center justify-center gap-4 lg:gap-6">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center shadow-lg animate-float">
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
                  
                  {/* Updated button layout for always-vertical, mobile-friendly, uniform buttons */}
                  <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
                    <Button
                      onClick={() => setPreCaptureCompleted(false)}
                      variant="outline"
                      className="w-full text-lg lg:text-xl py-4 lg:py-6 rounded-xl border-2 border-primary font-semibold bg-white text-primary hover:bg-primary/10 focus:bg-primary/10"
                    >
                      Edit Preferences
                    </Button>
                    <Button
                      onClick={startCamera}
                      disabled={isLoading}
                      variant="default"
                      className="w-full text-lg lg:text-xl py-4 lg:py-6 rounded-xl font-semibold"
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
            {isActive && !showThankYou && !showProcessingScreen && !showResponseImage && (
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
            {capturedPhoto && !isAnalyzing && !showAnalysisResults && !showLeadForm && !showThankYou && !showProcessingScreen && !showResponseImage && (
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
                            className="flex-1 text-lg lg:text-xl py-6 lg:py-8 rounded-full bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm min-h-[72px] lg:min-h-[80px] transition-all duration-300 transform hover:scale-105 active:scale-95"
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
                              className="flex-1 text-lg lg:text-xl py-6 lg:py-8 rounded-full bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm min-h-[72px] lg:min-h-[80px] transition-all duration-300 transform hover:scale-105 active:scale-95"
                            >
                              <RotateCcw className="h-6 w-6 lg:h-8 lg:w-8 mr-3" />
                              Try Again
                            </Button>
                            <Button
                              onClick={proceedToLeadForm}
                              size="lg"
                              className="flex-1 text-lg lg:text-xl py-6 lg:py-8 rounded-2xl shadow-lg min-h-[72px] lg:min-h-[80px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-300 transform hover:scale-105 animate-pulse-glow"
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
                            className="flex-1 text-lg lg:text-xl py-6 lg:py-8 rounded-full shadow-lg min-h-[72px] lg:min-h-[80px] bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all duration-300 transform hover:scale-105 active:scale-95 animate-pulse-glow"
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
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-lg">
                <div className="relative w-full h-full flex flex-col">
                  {/* Photo container - full screen with overlay */}
                  <div className="flex-1 relative">
                    <img
                      src={capturedPhoto}
                      alt="Analyzing Photo"
                      className="w-full h-full object-cover opacity-30"
                    />
                    
                    {/* Analysis overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center bg-white/10 backdrop-blur-md rounded-3xl p-12 lg:p-16 mx-6 lg:mx-8 border border-white/30 max-w-2xl">
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

            {/* Analysis Results Screen */}
            {showAnalysisResults && capturedPhoto && !showThankYou && !showProcessingScreen && !showResponseImage && (
              <div className="w-full max-w-lg mx-auto space-y-4 px-2 sm:px-4">
                {/* Header with photo and text in a card */}
                <div className="bg-card rounded-xl border border-primary/10 shadow-sm p-4 flex flex-col sm:flex-row items-center gap-4 mb-2">
                  <div className="flex-shrink-0">
                    {/* <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mx-auto">
                      <img
                        src={capturedPhoto}
                        alt="Your photo"
                        className="w-full h-full object-cover"
                      />
                    </div> */}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold text-foreground mb-1">Your Personalized Results</h3>
                    <p className="text-sm text-muted-foreground">Here's what we found for you!</p>
                  </div>
                </div>
                
                {/* Analysis Results - Only show drink name, mood, age, and fortune */}
                {analysisResults && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <p className="font-semibold text-foreground text-base">Analysis Complete!</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      {analysisResults.mood && (
                        <div className="bg-card rounded-lg p-3 border border-primary/10 shadow-sm text-center">
                          <span className="text-xs font-medium text-muted-foreground block mb-1">YOUR MOOD</span>
                          <span className="text-sm font-bold text-foreground">{analysisResults.mood}</span>
                        </div>
                      )}
                      {analysisResults.age && (
                        <div className="bg-card rounded-lg p-3 border border-primary/10 shadow-sm text-center">
                          <span className="text-xs font-medium text-muted-foreground block mb-1">ESTIMATED AGE</span>
                          <span className="text-sm font-bold text-foreground">{analysisResults.age} years</span>
                        </div>
                      )}
                    </div>
                    {/* Fortune Display */}
                    {fortuneData && (analysisResults?.mood || analysisResults?.emotion) && (
                      <div className="bg-card rounded-lg p-3 border border-primary/10 shadow-sm mb-2">
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-primary mb-3">🔮 Your Fortune</h3>
                          <div className="space-y-3">
                            <p className="text-sm font-bold text-foreground">{fortuneData.gimmick}</p>
                            <div className="border-t border-primary/10 pt-3">
                              <p className="text-sm text-black leading-relaxed text-left">
                                {fortuneData.fortune_story}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Drink Display - Moved below fortune */}
                    {analysisResults.drink && (
                      <div className="bg-card rounded-lg p-3 border border-primary/10 shadow-sm mb-2">
                        <div className="flex items-center gap-4">
                          {/* Drink Image */}
                          {drinkDetails?.image_url && (
                            <div className="flex-shrink-0">
                              <img
                                src={drinkDetails.image_url}
                                alt={analysisResults.drink}
                                className="w-24 h-24 lg:w-32 lg:h-32 rounded-xl object-cover border-2 border-primary/30 shadow-lg animate-pulse-glow"
                                style={{
                                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)',
                                  filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))'
                                }}
                                onError={(e) => {
                                  // Hide image if it fails to load
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          {/* Drink Name */}
                          <div className="flex-1 text-left">
                            <span className="text-xs font-medium text-muted-foreground block mb-1">YOUR DRINK</span>
                            <span className="text-base font-bold text-primary">{analysisResults.drink}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Continue Button */}
                <div className="text-center pt-3">
                  <Button
                    onClick={proceedToLeadForm}
                    className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-base py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Your Information Form - After Analysis */}
            {showLeadForm && capturedPhoto && !showProcessingScreen && !showResponseImage && !showThankYou && (
              <div className="max-w-md mx-auto space-y-6 px-4 lg:px-8">
                {/* Header */}
                <div className="text-center space-y-4 mb-8">
                  <h3 className="text-2xl lg:text-3xl font-bold text-foreground">Almost Done!</h3>
                  <p className="text-base lg:text-lg text-muted-foreground">Enter your contact details to save your personalized recommendation</p>
                </div>

                {/* Stacked input fields */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-lg lg:text-xl font-medium">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@example.com"
                      value={leadFormData.email}
                      onChange={(e) => setLeadFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-14 lg:h-16 text-base lg:text-lg rounded-xl border-2 focus:border-primary w-full bg-white"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-lg lg:text-xl font-medium">WhatsApp Number *</Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="+62 812-3456-7890"
                      value={leadFormData.whatsapp}
                      onChange={(e) => setLeadFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="h-14 lg:h-16 text-base lg:text-lg rounded-xl border-2 focus:border-primary w-full bg-white"
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
                    if (!validateEmail(leadFormData.email)) {
                      showAlert("destructive", "Invalid Email", "Please enter a valid email address.");
                      return;
                    }
                    if (!validatePhone(leadFormData.whatsapp)) {
                      showAlert("destructive", "Invalid Phone Number", "Please enter a valid phone number (e.g. 081200000000 or 81200000000).");
                      return;
                    }
                    saveLeadToDatabase();
                  }}
                  disabled={isProcessing}
                  className="w-full btn-primary-enhanced text-lg lg:text-xl py-5 lg:py-6 animate-bounce-soft"
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

            {/* Processing Screen */}
            {showProcessingScreen && (
              <div className="fixed inset-0 z-50">
                <div className="relative w-full h-full flex flex-col">
                  {/* Blurred photo background if available */}
                  {capturedPhoto ? (
                    <div
                      className="absolute inset-0 w-full h-full"
                      style={{
                        backgroundImage: `url(${capturedPhoto})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(8px)',
                        opacity: 0.4,
                        zIndex: 1,
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-lg z-1" />
                  )}
                  {/* Overlay loading card */}
                  <div className="relative flex-1 flex items-center justify-center z-10">
                    <div className="text-center bg-transparent backdrop-blur-sm rounded-3xl p-12 lg:p-16 mx-6 lg:mx-8 border border-white/30 max-w-2xl">
                      <div className="mx-auto w-24 h-24 lg:w-32 lg:h-32 mb-8 lg:mb-10 relative animate-scale-in">
                        <div className="absolute inset-0 rounded-full border-4 lg:border-6 border-primary/30"></div>
                        <div className="absolute inset-0 rounded-full border-4 lg:border-6 border-transparent border-t-primary spinner-glow"></div>
                        <CheckCircle className="absolute inset-4 lg:inset-6 h-16 w-16 lg:h-20 lg:w-20 text-primary animate-float" />
                      </div>
                      <h3 className="text-3xl lg:text-4xl font-semibold text-white mb-4 lg:mb-6">Processing</h3>
                      <p className="text-white/80 text-xl lg:text-2xl mb-6 lg:mb-8">Creating your personalized image...</p>
                      <div className="flex items-center justify-center space-x-2 lg:space-x-3">
                        <div className="w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Response Image Screen */}
            {showResponseImage && n8nResponseImage && !showProcessingScreen && !showThankYou && (
              <div className="max-w-2xl mx-auto space-y-6 px-4">
                <div className="text-center space-y-4">
                  <h3 className="text-2xl lg:text-3xl font-bold text-foreground">🎉 Your Personalized Image</h3>
                  <p className="text-base lg:text-lg text-muted-foreground">Here's your custom creation!</p>
                </div>
                
                <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-xl p-4">
                  <div className="bg-card rounded-lg p-4 border border-primary/10 shadow-sm">
                    <img
                      src={n8nResponseImage}
                      alt="Your personalized image"
                      className="w-full h-auto rounded-lg shadow-lg"
                      onLoad={() => {
                      }}
                      onError={(e) => {
                        // If image fails to load, skip to thank you screen
                        showAlert("default", "Image Ready", "Your personalized image is being prepared and will be sent to you shortly!");
                        setShowResponseImage(false);
                        setShowThankYou(true);
                        onLeadSaved?.();
                      }}
                    />
                  </div>
                </div>

                {/* Drink Image */}
                {analysisResults?.drink && drinkDetails?.image_url && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-xl p-4">
                    <div className="bg-card rounded-lg p-4 border border-primary/10 shadow-sm">
                      <img
                        src={drinkDetails.image_url}
                        alt={analysisResults.drink}
                        className="w-full h-auto rounded-lg shadow-lg"
                        onError={(e) => {
                          // Hide image if it fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Send to Me and Re-generate Buttons */}
                <div className="text-center pt-3 flex flex-col gap-3 w-full max-w-md mx-auto">
                  <Button
                    onClick={sendImageToUser}
                    disabled={isProcessing || isRegenerating}
                    className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-base py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 font-semibold"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>Send to Me</>
                    )}
                  </Button>
                  <Button
                    onClick={reGenerateImage}
                    disabled={isRegenerating || isProcessing}
                    variant="outline"
                    className="w-full bg-white text-primary border-primary border-2 text-base py-3 px-6 rounded-xl font-semibold hover:bg-primary/10 transition-all duration-200 transform hover:scale-105"
                  >
                    {isRegenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Re-generating...
                      </>
                    ) : (
                      <>
                        Give Me a Different Look
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Thank You Screen - Thank you message in a white card */}
            {showThankYou && (
              <div className="fixed inset-0 min-h-screen w-full flex flex-col items-center justify-start bg-[#0A1B36] py-8 px-0 z-50">
                {/* Thank you card */}
                <div className="w-80 max-w-md bg-white rounded-3xl shadow-lg mx-11 mt-12 mb-8 p-2 flex flex-col items-center">
                  <div className="mb-4">
                    <CheckCircle className="h-12 w-12 text-[#0A1B36]" />
                  </div>
                  <h1 className="text-lg font-bold text-[#0A1B36] mb-2">Thank You!</h1>
                  <p className="text-m text-[#0A1B36]">Have a great day!</p>
                </div>
                {/* DELIFRU logo and tagline */}
                <div className="flex flex-col items-center mb-10">
                  <img src={logo} alt="DELIFRU Logo" className="w-32 h-auto mb-1" />
                </div>
                {/* Socialize with Us section */}
                <div className="flex flex-col items-center mb-8 w-full">
                  <span className="text-lg font-bold text-white mb-4">Socialize with Us</span>
                  <div className="flex flex-col items-center gap-2 text-white text-base">
                    <span className="flex items-center gap-2">
                      <span role="img" aria-label="web">🌐</span>
                      www.delifru.co.id
                    </span>
                    <span className="flex items-center gap-2">
                      <span role="img" aria-label="ig">📷</span>
                      @delifru.id
                    </span>
                    <span className="flex items-center gap-2">
                      <span role="img" aria-label="ig">📷</span>
                      @indeljens.id
                    </span>
                    <span className="flex items-center gap-2">
                      <span role="img" aria-label="ig">📷</span>
                      @bubuqu.id
                    </span>
                  </div>
                </div>
                {/* Address section */}
                <div className="flex flex-col items-center text-center text-white text-sm font-medium">
                  <span className="mb-1">Jl. Kedoya Pesing No.24, RT.2/RW.2, Kedoya Sel.,</span>
                  <span>Kec. Kb. Jeruk, Jakarta Barat, Jakarta 11520</span>
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