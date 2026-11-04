
import React from 'react';
import { Step } from '../types';
import { FileText, ListChecks, CheckCircle, Pencil, Download } from './icons';

interface StepperProps {
  currentStep: Step;
  setStep: (step: Step) => void;
}

const steps = [
  { id: Step.Input, name: 'Input', icon: <FileText className="w-5 h-5"/> },
  { id: Step.KisiKisi, name: 'Kisi-Kisi', icon: <ListChecks className="w-5 h-5"/> },
  { id: Step.Validation, name: 'Validasi', icon: <CheckCircle className="w-5 h-5"/> },
  { id: Step.Soal, name: 'Soal', icon: <Pencil className="w-5 h-5"/> },
  { id: Step.Export, name: 'Ekspor', icon: <Download className="w-5 h-5"/> },
];

const stepStyles = {
    [Step.Input]: {
        bg: 'bg-blue-600', hoverBg: 'hover:bg-blue-700', border: 'border-blue-600', text: 'text-blue-600', textCompleted: 'text-blue-700', ring: 'ring-blue-200',
    },
    [Step.KisiKisi]: {
        bg: 'bg-amber-500', hoverBg: 'hover:bg-amber-600', border: 'border-amber-500', text: 'text-amber-500', textCompleted: 'text-amber-600', ring: 'ring-amber-200',
    },
    [Step.Validation]: {
        bg: 'bg-teal-500', hoverBg: 'hover:bg-teal-600', border: 'border-teal-500', text: 'text-teal-500', textCompleted: 'text-teal-600', ring: 'ring-teal-200',
    },
    [Step.Soal]: {
        bg: 'bg-indigo-600', hoverBg: 'hover:bg-indigo-700', border: 'border-indigo-600', text: 'text-indigo-600', textCompleted: 'text-indigo-700', ring: 'ring-indigo-200',
    },
    [Step.Export]: {
        bg: 'bg-rose-600', hoverBg: 'hover:bg-rose-700', border: 'border-rose-600', text: 'text-rose-600', textCompleted: 'text-rose-700', ring: 'ring-rose-200',
    }
};


const Stepper: React.FC<StepperProps> = ({ currentStep, setStep }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center justify-center">
        {steps.map((step, stepIdx) => {
            const styles = stepStyles[step.id];
            return (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-12 sm:pr-24' : ''}`}>
            {currentStep > step.id ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className={`h-1 w-full ${styles.bg}`} />
                </div>
                <button
                  onClick={() => setStep(step.id)}
                  className={`relative w-10 h-10 flex items-center justify-center ${styles.bg} ${styles.hoverBg} rounded-full transform hover:scale-110 transition-all duration-300 ease-in-out shadow-md`}
                >
                  <span className="text-white">{step.icon}</span>
                  <span className="sr-only">{step.name}</span>
                </button>
              </>
            ) : currentStep === step.id ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-1 w-full bg-gray-200" />
                </div>
                <button
                  onClick={() => setStep(step.id)}
                  className={`relative w-10 h-10 flex items-center justify-center bg-white border-2 ${styles.border} rounded-full ring-4 ${styles.ring} ring-offset-1 transition-all duration-300 ease-in-out shadow-lg`}
                  aria-current="step"
                >
                  <span className={styles.text}>{step.icon}</span>
                  <span className="sr-only">{step.name}</span>
                </button>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-1 w-full bg-gray-200" />
                </div>
                <div
                  className="relative w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-full cursor-not-allowed shadow-sm"
                >
                  <span className="text-gray-400">{step.icon}</span>
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            )}
            <div className="absolute -bottom-7 text-center w-24 -left-7">
                <span className={`text-xs ${(currentStep >= step.id) ? `${styles.textCompleted} font-semibold` : 'text-gray-500'}`}>{step.name}</span>
            </div>
          </li>
        )})}
      </ol>
    </nav>
  );
};

export default Stepper;
