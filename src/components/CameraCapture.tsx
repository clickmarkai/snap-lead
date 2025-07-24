import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, RotateCcw, User, Brain, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createLead, analyzeImageWithN8N, getDrinkByName, getRandomDrink, DrinkMenu, base64ToBlob, sendToN8NWebhook, sendToGenIngredientsWebhook, sendToSendWebhook, sendToFinalMessageWebhook, getFortuneByMood, Fortune, generateCreativeFortune } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';
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
  // Simple completion tracking - DECLARE THESE FIRST TO AVOID INITIALIZATION ERRORS
  const [genAiDone, setGenAiDone] = useState(false);
  const [genIngredientsDone, setGenIngredientsDone] = useState(false);
  const [webhookSent, setWebhookSent] = useState(false);

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

  // Background generation state
  const [isBackgroundGenerating, setIsBackgroundGenerating] = useState(false);
  const [backgroundGeneratedImage, setBackgroundGeneratedImage] = useState<string | null>(null);
  const [backgroundGenerationError, setBackgroundGenerationError] = useState(false);

  // Processing state management
  const [isActuallyProcessing, setIsActuallyProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [finalResponseImage, setFinalResponseImage] = useState<string | null>(null);

  // Refs to track current state for async functions
  const backgroundGeneratingRef = useRef(false);
  const backgroundImageRef = useRef<string | null>(null);
  const backgroundErrorRef = useRef(false);
  const backgroundCompletedRef = useRef(false); // Track if background generation has completed
  const backgroundPromiseRef = useRef<Promise<string | null> | null>(null);
  const backgroundResolveRef = useRef<((value: string | null) => void) | null>(null);

  // Typing animation for fortune gimmick - creates engaging letter-by-letter reveal
  const fortuneGimmickAnimation = useTypingAnimation({
    text: fortuneData?.gimmick || '',
    speed: 30, // Fast typing - 30ms per character for smooth but quick animation
    startDelay: 500 // Small delay before starting to let user focus on the fortune section
  });

  // Calculate static delay for story based on gimmick duration
  const gimmickDuration = (fortuneData?.gimmick?.length || 0) * 30; // 30ms per character
  const storyStartDelay = 500 + gimmickDuration + 800; // Initial delay + gimmick duration + extra pause

  // Typing animation for fortune story - starts after gimmick completes
  const fortuneStoryAnimation = useTypingAnimation({
    text: fortuneData?.fortune_story || '',
    speed: 25, // Slightly faster for longer text
    startDelay: storyStartDelay // Static delay that doesn't change
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

    // Flip the canvas horizontally to correct the mirrored video display
    context.save();
    context.scale(-1, 1);
    context.translate(-canvas.width, 0);
    
    // Draw the video frame to canvas (now flipped back to correct orientation)
    context.drawImage(video, 0, 0);
    
    // Restore the canvas context
    context.restore();

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
        
        // Get a random drink from the database instead of using webhook response
        try {
          const randomDrink = await getRandomDrink();
          if (randomDrink) {
            setDrinkDetails(randomDrink);
            // Update the analysis results with the random drink name
            setAnalysisResults(prev => ({
              ...prev,
              drink: randomDrink.name
            }));
          } else {
            setDrinkDetails(null);
          }
        } catch (error) {
          setDrinkDetails(null);
        }
        
        // Fetch fortune data if mood is available
        const mood = analysisResults.mood || analysisResults.emotion || analysisResults.feeling;
        if (mood) {
          try {
            const fortune = await getFortuneByMood(mood);
            if (fortune) {
              // Generate creative fortune (both gimmick and story) using OpenAI
              const creativeFortune = await generateCreativeFortune(mood, fortune.gimmick, fortune.fortune_story);
              // Update the fortune with the AI-generated creative content
              const enhancedFortune = {
                ...fortune,
                gimmick: creativeFortune.gimmick,
                fortune_story: creativeFortune.fortune_story
              };
              setFortuneData(enhancedFortune);
            } else {
              setFortuneData(null);
            }
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

  // Background generation function
  const startBackgroundGeneration = useCallback(async () => {
    if (!capturedPhoto || backgroundGeneratingRef.current || backgroundImageRef.current || backgroundCompletedRef.current) {
      console.log('⏭️ Skipping gen-ai generation:', {
        hasPhoto: !!capturedPhoto,
        isGenerating: backgroundGeneratingRef.current,
        hasImage: !!backgroundImageRef.current,
        isCompleted: backgroundCompletedRef.current
      });
      return; // Don't start if already generating, already have result, or already completed
    }

    console.log('🚀 Starting gen-ai background generation');
    
    // Create a promise that will resolve when generation completes
    const promise = new Promise<string | null>((resolve) => {
      backgroundResolveRef.current = resolve;
    });
    backgroundPromiseRef.current = promise;

    backgroundGeneratingRef.current = true;
    backgroundErrorRef.current = false;
    backgroundCompletedRef.current = false;
    setIsBackgroundGenerating(true);
    setBackgroundGenerationError(false);

    try {
      const imageBlob = base64ToBlob(capturedPhoto, 'image/jpeg');
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      
      // Use placeholder email/phone for background generation
      // Use the random drink from drinkDetails instead of analysisResults
      const updatedAnalysisResults = drinkDetails ? {
        ...analysisResults,
        drink: drinkDetails.name
      } : analysisResults;
      
      const responseImage = await sendToN8NWebhook(
        'placeholder@email.com', // Will be replaced when user submits
        '+1234567890', // Will be replaced when user submits
        imageBlob,
        preCaptureData.name,
        preCaptureData.gender,
        preCaptureData.coffeePreference,
        preCaptureData.alcoholPreference,
        category,
        updatedAnalysisResults,
        undefined
      );
      
      if (responseImage) {
        console.log('✅ GEN-AI DONE! Setting image and marking complete');
        backgroundImageRef.current = responseImage;
        setBackgroundGeneratedImage(responseImage);
        backgroundResolveRef.current?.(responseImage);
        setGenAiDone(true); // SIMPLE FLAG: GEN-AI IS DONE
      } else {
        console.log('❌ Gen-ai generation completed but no image received');
        backgroundResolveRef.current?.(null);
        setGenAiDone(true); // Mark as done even if failed
      }
    } catch (error) {
      console.error('❌ Background generation failed:', error);
      backgroundErrorRef.current = true;
      setBackgroundGenerationError(true);
      backgroundResolveRef.current?.(null);
    } finally {
      console.log('🔄 Background generation finished, setting isBackgroundGenerating to false');
      backgroundGeneratingRef.current = false;
      // Don't mark as completed here - only mark as completed after successful send
      setIsBackgroundGenerating(false);
    }
  }, [capturedPhoto, preCaptureData, analysisResults, drinkDetails, constructCategory]);

  // Auto-send gen-ai image to webhook/send
  const autoSendGenAiImage = useCallback(async (genAiImageUrl: string) => {
    console.log('🔥 autoSendGenAiImage called with:', {
      imageUrl: genAiImageUrl?.substring(0, 50) + '...',
      email: leadFormData.email,
      whatsapp: leadFormData.whatsapp
    });
    
    try {
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      
      // Create FormData same as sendImageToUser
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
      
      // Add analysis results if available, using random drink instead of webhook response
      if (analysisResults) {
        const updatedAnalysisResults = drinkDetails ? {
          ...analysisResults,
          drink: drinkDetails.name
        } : analysisResults;
        
        formData.append('analysisResults', JSON.stringify(updatedAnalysisResults));
        if (updatedAnalysisResults.mood) formData.append('mood', updatedAnalysisResults.mood);
        if (updatedAnalysisResults.age) formData.append('age', updatedAnalysisResults.age);
        if (updatedAnalysisResults.drink) formData.append('recommendedDrink', updatedAnalysisResults.drink);
      }
      
      // Add timestamp
      formData.append('timestamp', new Date().toISOString());
      
      // Add the gen-ai image
      if (genAiImageUrl.startsWith('data:')) {
        // Convert data URL to blob
        const response = await fetch(genAiImageUrl);
        const imageBlob = await response.blob();
        formData.append('generatedImage', imageBlob, 'gen-ai-image.png');
      } else if (genAiImageUrl.startsWith('http')) {
        // If it's a URL, download and attach the image
        try {
          const imageResponse = await fetch(genAiImageUrl);
          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob();
            formData.append('generatedImage', imageBlob, 'gen-ai-image.png');
          } else {
            formData.append('generatedImageUrl', genAiImageUrl);
          }
        } catch (downloadError) {
          formData.append('generatedImageUrl', genAiImageUrl);
        }
      }
      
      // Always add the image URL
      formData.append('imageUrl', genAiImageUrl);
      
      console.log('📤 CALLING sendToSendWebhook for gen-ai image...');
      console.log('📊 FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
      
      await sendToSendWebhook(formData);
    } catch (error) {
      console.error('❌ Auto-send gen-ai failed:', error);
    }
  }, [leadFormData, preCaptureData, analysisResults, drinkDetails, constructCategory]);

  // Auto-send gen-ingredients image to webhook/send
  const autoSendGenIngredientsImage = useCallback(async (genIngredientsImageUrl: string) => {
    console.log('🔥 autoSendGenIngredientsImage called with:', {
      imageUrl: genIngredientsImageUrl?.substring(0, 50) + '...',
      email: leadFormData.email,
      whatsapp: leadFormData.whatsapp
    });
    
    try {
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      
      // Create FormData same as sendImageToUser
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
      
      // Add analysis results if available, using random drink instead of webhook response
      if (analysisResults) {
        const updatedAnalysisResults = drinkDetails ? {
          ...analysisResults,
          drink: drinkDetails.name
        } : analysisResults;
        
        formData.append('analysisResults', JSON.stringify(updatedAnalysisResults));
        if (updatedAnalysisResults.mood) formData.append('mood', updatedAnalysisResults.mood);
        if (updatedAnalysisResults.age) formData.append('age', updatedAnalysisResults.age);
        if (updatedAnalysisResults.drink) formData.append('recommendedDrink', updatedAnalysisResults.drink);
      }
      
      // Add timestamp
      formData.append('timestamp', new Date().toISOString());
      
      // Add the gen-ingredients image
      if (genIngredientsImageUrl.startsWith('data:')) {
        // Convert data URL to blob
        const response = await fetch(genIngredientsImageUrl);
        const imageBlob = await response.blob();
        formData.append('generatedImage', imageBlob, 'gen-ingredients-image.png');
      } else if (genIngredientsImageUrl.startsWith('http')) {
        // If it's a URL, download and attach the image
        try {
          const imageResponse = await fetch(genIngredientsImageUrl);
          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob();
            formData.append('generatedImage', imageBlob, 'gen-ingredients-image.png');
          } else {
            formData.append('generatedImageUrl', genIngredientsImageUrl);
          }
        } catch (downloadError) {
          formData.append('generatedImageUrl', genIngredientsImageUrl);
        }
      }
      
      // Always add the image URL
      formData.append('imageUrl', genIngredientsImageUrl);
      
      const sendSuccess = await sendToSendWebhook(formData);
      console.log('📤 sendToSendWebhook result:', sendSuccess);
      
      if (sendSuccess) {
        console.log('✅ Gen-ingredients image sent successfully to webhook/send');
        // Wait 2 seconds before sending final_message
        console.log('⏰ Waiting 2 seconds before sending final_message...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('📞 SENDING FINAL_MESSAGE after 2 second delay');
        const finalMessageSuccess = await sendToFinalMessageWebhook(formData);
        console.log('✅ Final message sent for gen-ingredients');
      } else {
        console.log('❌ Failed to send gen-ingredients image to webhook/send');
      }
    } catch (error) {
      console.error('❌ Auto-send gen-ingredients failed:', error);
    }
  }, [leadFormData, preCaptureData, analysisResults, drinkDetails, constructCategory]);

  // Gen-ingredients background generation function
  const startGenIngredientsGeneration = useCallback(async () => {
    if (!capturedPhoto || genIngredientsGeneratingRef.current || genIngredientsImageRef.current || genIngredientsCompletedRef.current) {
      console.log('⏭️ Skipping gen-ingredients generation:', {
        hasPhoto: !!capturedPhoto,
        isGenerating: genIngredientsGeneratingRef.current,
        hasImage: !!genIngredientsImageRef.current,
        isCompleted: genIngredientsCompletedRef.current
      });
      return; // Don't start if already generating, already have result, or already completed
    }

    console.log('🧪 Starting gen-ingredients background generation');
    
    // Create a promise that will resolve when generation completes
    const promise = new Promise<string | null>((resolve) => {
      genIngredientsResolveRef.current = resolve;
    });
    genIngredientsPromiseRef.current = promise;

    genIngredientsGeneratingRef.current = true;
    genIngredientsErrorRef.current = false;
    genIngredientsCompletedRef.current = false;
    setIsGenIngredientsGenerating(true);
    setGenIngredientsError(false);

    try {
      const imageBlob = base64ToBlob(capturedPhoto, 'image/jpeg');
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      
      // Use placeholder email/phone for background generation
      // Use the random drink from drinkDetails instead of analysisResults
      const updatedAnalysisResults = drinkDetails ? {
        ...analysisResults,
        drink: drinkDetails.name
      } : analysisResults;
      
      const responseImage = await sendToGenIngredientsWebhook(
        'placeholder@email.com', // Will be replaced when user submits
        '+1234567890', // Will be replaced when user submits
        imageBlob,
        preCaptureData.name,
        preCaptureData.gender,
        preCaptureData.coffeePreference,
        preCaptureData.alcoholPreference,
        category,
        updatedAnalysisResults,
        undefined
      );
      
      if (responseImage) {
        console.log('✅ GEN-INGREDIENTS DONE! Setting image and marking complete');
        genIngredientsImageRef.current = responseImage;
        setGenIngredientsImage(responseImage);
        genIngredientsResolveRef.current?.(responseImage);
        setGenIngredientsDone(true); // SIMPLE FLAG: GEN-INGREDIENTS IS DONE
      } else {
        console.log('❌ Gen-ingredients generation completed but no image received');
        genIngredientsResolveRef.current?.(null);
        setGenIngredientsDone(true); // Mark as done even if failed
      }
    } catch (error) {
      console.error('❌ Gen-ingredients generation failed:', error);
      genIngredientsErrorRef.current = true;
      setGenIngredientsError(true);
      genIngredientsResolveRef.current?.(null);
    } finally {
      console.log('🔄 Gen-ingredients generation finished, setting isGenIngredientsGenerating to false');
      genIngredientsGeneratingRef.current = false;
      // Don't mark as completed here - only mark as completed after successful send
      setIsGenIngredientsGenerating(false);
    }
  }, [capturedPhoto, preCaptureData, analysisResults, drinkDetails, constructCategory]);

  const proceedToLeadForm = useCallback(() => {
    console.log('🚪 proceedToLeadForm called - showing lead form and starting background generations');
    setAnalysisFailed(false);
    setShowAnalysisResults(false);
    setShowLeadForm(true);
    
    // Start both background generations when showing lead form
    console.log('🚀 Calling startBackgroundGeneration...');
    startBackgroundGeneration();
    console.log('🧪 Calling startGenIngredientsGeneration...');
    startGenIngredientsGeneration();
    console.log('✅ Both background generations initiated');
  }, [startBackgroundGeneration, startGenIngredientsGeneration]);

  const sendImageToUser = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      // Note: Images are already auto-sent to webhook/send when background generation completes
      // This function now only handles transitioning to thank you screen
      console.log('📝 Finishing process - images already sent automatically');
      
      // Proceed directly to thank you screen
      setShowResponseImage(false);
      setShowThankYou(true);
      onLeadSaved?.();
      
    } catch (error) {
      showAlert("destructive", "Process Failed", "Failed to complete the process. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [showAlert, onLeadSaved]);

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
    
    // Reset background generation state
    setIsBackgroundGenerating(false);
    setBackgroundGeneratedImage(null);
    setBackgroundGenerationError(false);
    
    // Reset processing state
    setIsActuallyProcessing(false);
    setProcessingComplete(false);
    setFinalResponseImage(null);
    
    // Reset style selection state
    setShowStyleSelector(false);
    setSelectedStyle('');
    setIsRegenerating(false);
    setHasRegenerated(false);
    
    // Reset gen-ingredients state
    setIsGenIngredientsGenerating(false);
    setGenIngredientsImage(null);
    setGenIngredientsError(false);
    
    // Reset completion flags
    setGenAiDone(false);
    setGenIngredientsDone(false);
    setWebhookSent(false);
    
    // Reset refs
    backgroundGeneratingRef.current = false;
    backgroundImageRef.current = null;
    backgroundErrorRef.current = false;
    backgroundCompletedRef.current = false; // Reset the sent flag
    backgroundPromiseRef.current = null;
    backgroundResolveRef.current = null;
    
    // Reset gen-ingredients refs
    genIngredientsGeneratingRef.current = false;
    genIngredientsImageRef.current = null;
    genIngredientsErrorRef.current = false;
    genIngredientsCompletedRef.current = false; // Reset the sent flag
    genIngredientsPromiseRef.current = null;
    genIngredientsResolveRef.current = null;
  }, []);

  // Listen for processing completion
  useEffect(() => {
    console.log('👀 Processing state changed:', {
      processingComplete,
      isActuallyProcessing,
      hasFinalImage: !!finalResponseImage,
      showThankYou,
      showResponseImage,
      showProcessingScreen
    });

    if (processingComplete && !showThankYou && !showResponseImage) {
      console.log('🎯 Processing completed, determining next action...');
      
      // Hide processing screen
      setShowProcessingScreen(false);
      
      if (finalResponseImage) {
        console.log('🖼️ Showing final response image');
        setN8nResponseImage(finalResponseImage);
        setShowResponseImage(true);
      }
      
      // Reset processing state
      setIsActuallyProcessing(false);
      setProcessingComplete(false);
      setFinalResponseImage(null);
    }
  }, [processingComplete, isActuallyProcessing, finalResponseImage, showThankYou, showResponseImage, showProcessingScreen, onLeadSaved]);

  // SIMPLE LOGIC: WHEN BOTH ARE DONE, SEND WEBHOOK IMMEDIATELY
  useEffect(() => {
    const sendWebhookWhenBothDone = async () => {
      console.log('🔍 CHECKING BOTH DONE:', {
        genAiDone,
        genIngredientsDone,
        webhookSent,
        hasEmail: !!leadFormData.email,
        hasWhatsApp: !!leadFormData.whatsapp
      });

      // BOTH DONE + HAVE EMAIL/WHATSAPP + NOT SENT YET = SEND NOW!
      if (genAiDone && genIngredientsDone && !webhookSent && leadFormData.email && leadFormData.whatsapp) {
        console.log('🚀🚀🚀 BOTH DONE! SENDING WEBHOOK/SEND NOW!');
        setWebhookSent(true); // Prevent multiple sends
        
        // Send gen-ai image first
        if (backgroundImageRef.current) {
          console.log('📤 SENDING GEN-AI IMAGE TO WEBHOOK/SEND');
          await autoSendGenAiImage(backgroundImageRef.current);
        }
        
        // Send gen-ingredients image second
        if (genIngredientsImageRef.current) {
          console.log('📤 SENDING GEN-INGREDIENTS IMAGE TO WEBHOOK/SEND');
          await autoSendGenIngredientsImage(genIngredientsImageRef.current);
        }
        
        console.log('✅ ALL WEBHOOKS SENT!');
      }
    };

    sendWebhookWhenBothDone();
  }, [genAiDone, genIngredientsDone, webhookSent, leadFormData.email, leadFormData.whatsapp, autoSendGenAiImage, autoSendGenIngredientsImage]);

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

    // Show processing screen immediately and start actual processing
    setShowLeadForm(false);
    setShowProcessingScreen(true);
    setIsProcessing(true);
    setIsActuallyProcessing(true);
    setProcessingComplete(false);
    setFinalResponseImage(null);
    
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
      
      // Check if we can use background generated image or wait for it
      let responseImage = backgroundImageRef.current;
      console.log('📊 Background generation state at submit:', {
        hasBackgroundImage: !!backgroundImageRef.current,
        isGenerating: backgroundGeneratingRef.current,
        hasCompleted: backgroundCompletedRef.current,
        hasError: backgroundErrorRef.current,
        hasPromise: !!backgroundPromiseRef.current
      });

      // CRITICAL: If background generation is still running, we MUST wait for it
      if (backgroundGeneratingRef.current || (!backgroundCompletedRef.current && backgroundPromiseRef.current)) {
        console.log('🚨 CRITICAL: Background generation is still active, forcing wait...');
      }
      
      // If there's a background promise (regardless of completion status), wait for it
      if (backgroundPromiseRef.current) {
        console.log('⏳ Background generation still in progress, waiting for it to complete...');
        console.log('📊 Current refs state:', {
          backgroundCompleted: backgroundCompletedRef.current,
          hasBackgroundImage: !!backgroundImageRef.current,
          isGenerating: backgroundGeneratingRef.current,
          hasPromise: !!backgroundPromiseRef.current
        });
        
        try {
          console.log('⏳ Waiting for background promise to resolve (no timeout - allowing full generation time)...');
          const result = await backgroundPromiseRef.current;
          responseImage = result;
          console.log('✅ Background generation promise resolved with result:', !!result);
          // Clear the promise since it's resolved
          backgroundPromiseRef.current = null;
        } catch (error) {
          console.log('❌ Background generation failed:', error);
          backgroundCompletedRef.current = true;
          backgroundPromiseRef.current = null;
        }
      } else {
        console.log('📋 Background generation state:', {
          completed: backgroundCompletedRef.current,
          hasImage: !!backgroundImageRef.current,
          hasPromise: !!backgroundPromiseRef.current
        });
      }
      
      // Set final response and mark processing as complete
      console.log('🎯 ALL PROCESSING COMPLETE - Setting final response and marking as done');
      console.log('📊 Final result:', {
        hasImage: !!responseImage,
        imageSource: responseImage === backgroundImageRef.current ? 'background' : 'fresh-webhook'
      });
      
      setFinalResponseImage(responseImage);
      setProcessingComplete(true);
      // Note: useEffect will handle hiding processing screen and showing next screen
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showAlert("destructive", "Save Failed", `Failed to save your information: ${errorMessage}`);
      
      // Hide processing screen and return to lead form on error
      setShowProcessingScreen(false);
      setShowLeadForm(true);
      
      // Reset processing state on error
      setIsActuallyProcessing(false);
      setProcessingComplete(false);
      setFinalResponseImage(null);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedPhoto, leadFormData, showAlert, onLeadSaved, preCaptureData, analysisResults, constructCategory]);

  // Add a new state for re-generating loading
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Style selection state
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string>('');

  // Regeneration control
  const [hasRegenerated, setHasRegenerated] = useState(false);

  // Gen-ingredients background generation state
  const [isGenIngredientsGenerating, setIsGenIngredientsGenerating] = useState(false);
  const [genIngredientsImage, setGenIngredientsImage] = useState<string | null>(null);
  const [genIngredientsError, setGenIngredientsError] = useState(false);

  // Refs for gen-ingredients
  const genIngredientsGeneratingRef = useRef(false);
  const genIngredientsImageRef = useRef<string | null>(null);
  const genIngredientsErrorRef = useRef(false);
  const genIngredientsCompletedRef = useRef(false);
  const genIngredientsPromiseRef = useRef<Promise<string | null> | null>(null);
  const genIngredientsResolveRef = useRef<((value: string | null) => void) | null>(null);

  // Style options for regeneration
  const styleOptions = [
    { id: 'dragonball', name: 'Dragon Ball', emoji: '🐉' },
    { id: 'sailormoon', name: 'Sailor Moon', emoji: '🌙' },
    { id: 'disney-princess', name: 'Disney Princess', emoji: '👸' },
    { id: 'pixar', name: 'Pixar Style', emoji: '🎬' },
    { id: 'ghibli', name: 'Studio Ghibli', emoji: '🌿' },
    { id: 'naruto', name: 'Naruto', emoji: '🍥' },
    { id: 'one-piece', name: 'One Piece', emoji: '⚓' },
    { id: 'pokemon', name: 'Pokemon', emoji: '⚡' },
    { id: 'attack-on-titan', name: 'Attack on Titan', emoji: '⚔️' },
    { id: 'my-hero-academia', name: 'My Hero Academia', emoji: '🦸' },
    { id: 'demon-slayer', name: 'Demon Slayer', emoji: '🗡️' },
    { id: 'jujutsu-kaisen', name: 'Jujutsu Kaisen', emoji: '👻' },
    { id: 'marvel', name: 'Marvel Comics', emoji: '🦸‍♂️' },
    { id: 'dc-comics', name: 'DC Comics', emoji: '🦇' },
    { id: 'cartoon-network', name: 'Cartoon Network', emoji: '📺' },
    { id: 'anime-chibi', name: 'Anime Chibi', emoji: '🥰' },
    { id: 'cyberpunk', name: 'Cyberpunk', emoji: '🤖' },
    { id: 'fantasy', name: 'Fantasy Art', emoji: '🧙‍♂️' },
    { id: 'watercolor', name: 'Watercolor', emoji: '🎨' },
    { id: 'vintage-poster', name: 'Vintage Poster', emoji: '📜' }
  ];

  // Handle style selection
  const handleStyleSelection = useCallback(() => {
    setShowStyleSelector(true);
  }, []);

  const handleStyleConfirm = useCallback(async () => {
    if (!selectedStyle || !capturedPhoto || hasRegenerated) return;
    
    console.log('🎨 REGENERATING WITH STYLE USING GEN-AI API');
    
    // Close style selector and start regeneration with gen-ai
    setShowStyleSelector(false);
    setIsRegenerating(true);
    setIsActuallyProcessing(true); // Enable processing animation
    setShowResponseImage(false); // Hide current image
    setShowProcessingScreen(true);
    setHasRegenerated(true); // Mark as regenerated to prevent future regenerations
    
    const selectedStyleName = styleOptions.find(style => style.id === selectedStyle)?.name || selectedStyle;
    console.log('🎨 Calling GEN-AI API with style:', selectedStyleName);
    
    try {
      const imageBlob = base64ToBlob(capturedPhoto, 'image/jpeg');
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      
      // Call GEN-AI webhook with the selected style (NOT gen-ingredients)
      // Use the random drink from drinkDetails instead of analysisResults
      const updatedAnalysisResults = drinkDetails ? {
        ...analysisResults,
        drink: drinkDetails.name
      } : analysisResults;
      
      const responseImage = await sendToN8NWebhook(
        leadFormData.email,
        leadFormData.whatsapp,
        imageBlob,
        preCaptureData.name,
        preCaptureData.gender,
        preCaptureData.coffeePreference,
        preCaptureData.alcoholPreference,
        category,
        updatedAnalysisResults,
        selectedStyleName // Pass the selected style as drinkDescription parameter
      );
      
      setShowProcessingScreen(false);
      setIsActuallyProcessing(false); // Stop processing animation
      console.log('✅ GEN-AI style regeneration completed');
      
      if (responseImage) {
        // Set the new gen-ai regenerated image as the response
        setN8nResponseImage(responseImage);
        setShowResponseImage(true);
        
        // Send the regenerated image to webhook/send
        console.log('📤 SENDING REGENERATED GEN-AI IMAGE TO WEBHOOK/SEND');
        await autoSendGenAiImage(responseImage);
      } else {
        setShowThankYou(true);
        onLeadSaved?.();
      }
    } catch (error) {
      setShowProcessingScreen(false);
      setIsActuallyProcessing(false); // Stop processing animation on error
      setShowResponseImage(true); // Show previous image on error
      console.log('❌ GEN-AI style regeneration failed');
      showAlert("destructive", "Style Regeneration Failed", "Failed to regenerate with the selected style. Please try again.");
    } finally {
      setIsRegenerating(false);
      setSelectedStyle(''); // Reset selection
    }
  }, [selectedStyle, capturedPhoto, hasRegenerated, styleOptions, showAlert, onLeadSaved, leadFormData, preCaptureData, analysisResults, drinkDetails, constructCategory, autoSendGenAiImage]);

  // Add a function to re-generate the personalized image (keep original for backward compatibility)
  const reGenerateImage = useCallback(async () => {
    if (!capturedPhoto) return;
    setIsRegenerating(true);
    setIsActuallyProcessing(true); // Enable processing animation
    setShowProcessingScreen(true);
    try {
      const imageBlob = base64ToBlob(capturedPhoto, 'image/jpeg');
      const category = constructCategory(preCaptureData.coffeePreference, preCaptureData.alcoholPreference);
      // Always call the generate webhook again to get a new image
      // Use the random drink from drinkDetails instead of analysisResults
      const updatedAnalysisResults = drinkDetails ? {
        ...analysisResults,
        drink: drinkDetails.name
      } : analysisResults;
      
      const responseImage = await sendToN8NWebhook(
        leadFormData.email,
        leadFormData.whatsapp,
        imageBlob,
        preCaptureData.name,
        preCaptureData.gender,
        preCaptureData.coffeePreference,
        preCaptureData.alcoholPreference,
        category,
        updatedAnalysisResults,
        undefined // No drink description
      );
      setShowProcessingScreen(false);
      setIsActuallyProcessing(false); // Stop processing animation
      if (responseImage) {
        setN8nResponseImage(responseImage);
        setShowResponseImage(true);
      } else {
        setShowThankYou(true);
        onLeadSaved?.();
      }
    } catch (error) {
      setShowProcessingScreen(false);
      setIsActuallyProcessing(false); // Stop processing animation on error
      showAlert("destructive", "Re-generate Failed", "Failed to re-generate your image. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  }, [capturedPhoto, leadFormData, preCaptureData, analysisResults, drinkDetails, constructCategory, showAlert, onLeadSaved]);

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
      
      <Card className={showProcessingScreen ? "bg-transparent border-transparent" : ""}>
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
                      style={{ transform: 'scaleX(-1)' }} // Mirror video for natural camera view
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
              <div className="w-full mx-auto space-y-4 px-2 sm:px-4">
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
                            <p className="text-lg font-bold text-foreground min-h-[3rem] flex items-center justify-center">
                              <span className="text-center">
                                {fortuneGimmickAnimation.displayText}
                                {fortuneGimmickAnimation.hasStarted && !fortuneGimmickAnimation.isComplete && (
                                  <span className="typing-cursor text-primary">|</span>
                                )}
                              </span>
                            </p>
                            <div className="border-t border-primary/10 pt-3">
                              <p className="text-base text-black leading-relaxed text-left min-h-[2.5rem]">
                                {fortuneStoryAnimation.displayText}
                                {fortuneStoryAnimation.hasStarted && !fortuneStoryAnimation.isComplete && (
                                  <span className="typing-cursor text-primary">|</span>
                                )}
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
                  
                  {/* Background generation indicator */}
                  {isBackgroundGenerating && (
                    <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-xl p-3 mt-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-primary font-medium">Preparing your personalized image...</span>
                      </div>
                    </div>
                  )}
                  
                  {backgroundGeneratedImage && !isBackgroundGenerating && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-3 mt-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 text-green-600">✓</div>
                        <span className="text-sm text-green-700 font-medium">Your personalized image is ready!</span>
                      </div>
                    </div>
                  )}
                  
                  {genIngredientsImage && !isGenIngredientsGenerating && (
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-3 mt-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 text-purple-600">🎨</div>
                        <span className="text-sm text-purple-700 font-medium">Style regeneration options ready!</span>
                      </div>
                    </div>
                  )}
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
                      onChange={(e) => {
                        console.log('📧 Email changed to:', e.target.value);
                        setLeadFormData(prev => ({ ...prev, email: e.target.value }));
                      }}
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
                      onChange={(e) => {
                        // Only allow numbers and plus symbol
                        const value = e.target.value.replace(/[^0-9+]/g, '');
                        console.log('📱 WhatsApp changed to:', value);
                        setLeadFormData(prev => ({ ...prev, whatsapp: value }));
                      }}
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

            {/* Processing Screen - Only show when actually processing */}
            {showProcessingScreen && isActuallyProcessing && (
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
                    <div className="text-center bg-black/20 rounded-3xl p-12 lg:p-16 mx-6 lg:mx-8 border border-white/20 max-w-2xl">
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
                
                {/* Images Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Generated Image */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-xl p-2">
                    <div className="bg-card rounded-lg border border-primary/10 shadow-sm">
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
                    <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-xl p-2">
                      <div className="bg-card rounded-lg border border-primary/10 shadow-sm">
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
                </div>

                {/* Indonesian Content Below Images */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 text-center">
                  <p className="text-lg text-blue-900 font-medium mb-4">
                    Untuk resep minumannya juga kita kirimkan ke Kakak!
                    Bisa dicek di WhatsApp kakak ya!
                  </p>
                  
                  <p className="text-base text-blue-800 mb-4">
                    Kurang cocok hasilnya, Kak? Tenang aja, kita bisa regenerate gambarnya sesuai tema 
                    yang Kakak mau misalnya <strong>Dragon Ball</strong>, <strong>Sailor Moon</strong>, atau lainnya.
                  </p>
                  
                  <p className="text-sm text-blue-700 font-medium">
                    Tinggal regenerate image di bawah ya!
                  </p>
                </div>

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
                      <>Finish</>
                    )}
                  </Button>
                  <Button
                    onClick={handleStyleSelection}
                    disabled={isRegenerating || isProcessing || hasRegenerated}
                    variant="outline"
                    className={`w-full text-base py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                      hasRegenerated 
                        ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' 
                        : 'bg-white text-primary border-primary border-2 hover:bg-primary/10'
                    }`}
                  >
                    {hasRegenerated ? 'Already Regenerated' : 'Give Me a Different Look'}
                  </Button>
                </div>

                {/* Style Selector Modal */}
                <Dialog open={showStyleSelector} onOpenChange={setShowStyleSelector}>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-center mb-4">
                        🎨 Choose Your Style
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <p className="text-center text-muted-foreground mb-6">
                        Pilih gaya yang kamu inginkan untuk gambar personalmu!
                      </p>
                      
                      {/* Style Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {styleOptions.map((style) => (
                          <button
                            key={style.id}
                            onClick={() => setSelectedStyle(style.id)}
                            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-105 ${
                              selectedStyle === style.id
                                ? 'border-primary bg-primary/10 shadow-lg'
                                : 'border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                            }`}
                          >
                            <div className="text-2xl mb-2">{style.emoji}</div>
                            <div className="font-medium text-sm">{style.name}</div>
                          </button>
                        ))}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-6">
                        <Button
                          onClick={() => setShowStyleSelector(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleStyleConfirm}
                          disabled={!selectedStyle || isRegenerating}
                          className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
                        >
                          {isRegenerating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Regenerating...
                            </>
                          ) : (
                            <>
                              🎨 Regenerate
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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