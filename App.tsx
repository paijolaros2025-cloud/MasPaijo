
import React, { useState } from 'react';
import { AppState, Step, UserInput, KisiKisiItem, Soal, ValidationResult } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import Stepper from './components/Stepper';
import Step1InputForm from './components/steps/Step1_InputForm';
import Step2KisiKisi from './components/steps/Step2_KisiKisi';
import Step3Validation from './components/steps/Step3_Validation';
import Step4Soal from './components/steps/Step4_Soal';
import Step5Export from './components/steps/Step5_Export';
import ImageGeneratorModal from './components/ImageGeneratorModal';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    currentStep: Step.Input,
    userInput: null,
    kisiKisi: [],
    validationResults: [],
    soal: null,
    isLoading: false,
    error: null,
  });
  const [isImageGeneratorOpen, setIsImageGeneratorOpen] = useState(false);

  const { currentStep, userInput, kisiKisi, validationResults, soal, isLoading, error } = appState;

  const goToStep = (step: Step) => {
    setAppState(prev => ({ ...prev, currentStep: step, error: null }));
  };
  
  const handleNext = () => {
    const nextStep = currentStep + 1;
    if (nextStep <= Step.Export) {
        goToStep(nextStep as Step);
    }
  };

  const handleBack = () => {
    const prevStep = currentStep - 1;
    if (prevStep >= Step.Input) {
        goToStep(prevStep as Step);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case Step.Input:
        return <Step1InputForm setAppState={setAppState} handleNext={handleNext} />;
      case Step.KisiKisi:
        return <Step2KisiKisi appState={appState} setAppState={setAppState} handleNext={handleNext} handleBack={handleBack} />;
      case Step.Validation:
        return <Step3Validation appState={appState} setAppState={setAppState} handleNext={handleNext} handleBack={handleBack} />;
      case Step.Soal:
        return <Step4Soal appState={appState} setAppState={setAppState} handleNext={handleNext} handleBack={handleBack} />;
      case Step.Export:
        return <Step5Export appState={appState} handleBack={handleBack} />;
      default:
        return <div>Tahap tidak valid</div>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-green-50 to-green-200 text-gray-800 font-sans">
      <Header onOpenImageGenerator={() => setIsImageGeneratorOpen(true)} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Stepper currentStep={currentStep} setStep={goToStep} />
        <div className="mt-8">
            {renderStep()}
        </div>
      </main>
      <Footer />
      {isImageGeneratorOpen && (
        <ImageGeneratorModal onClose={() => setIsImageGeneratorOpen(false)} />
      )}
    </div>
  );
};

export default App;
