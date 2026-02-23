/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Sparkles, 
  RefreshCw, 
  ChevronRight, 
  Image as ImageIcon, 
  Loader2, 
  ArrowLeft,
  Download,
  ExternalLink
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppState, Suggestion, AnalysisResult } from './types';
import { analyzeImage, generatePrompt, generateImage } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [image, setImage] = useState<{ file: File; preview: string; base64: string } | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImage({
        file,
        preview: URL.createObjectURL(file),
        base64
      });
      setState('idle');
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] as string[] },
    multiple: false
  });

  const handleAnalyze = async () => {
    if (!image) return;
    setState('analyzing');
    setError(null);
    try {
      const result = await analyzeImage(image.base64, image.file.type, userPrompt);
      setAnalysis(result);
      setState('suggesting');
    } catch (err) {
      console.error(err);
      setError("Failed to analyze image. Please try again.");
      setState('idle');
    }
  };

  const handleReroll = async () => {
    handleAnalyze();
  };

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setState('generating');
    setError(null);

    try {
      const prompt = await generatePrompt(suggestion, analysis?.imageDescription || "");
      const generatedUrl = await generateImage(prompt, image?.base64, image?.file.type);
      setResultImage(generatedUrl);
      setState('result');
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key issue. Please re-select your key.");
        setHasKey(false);
      } else {
        setError("Failed to generate image. Please try again.");
      }
      setState('suggesting');
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setSelectedSuggestion(null);
    setResultImage(null);
    setUserPrompt('');
    setState('idle');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={reset} style={{ cursor: 'pointer' }}>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">VisionCraft</h1>
          </div>
          {state !== 'idle' && (
            <button 
              onClick={reset}
              className="text-xs uppercase tracking-widest font-semibold opacity-50 hover:opacity-100 transition-opacity"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-light tracking-tight">What shall we <span className="italic text-emerald-400">reimagine</span>?</h2>
                <p className="text-zinc-400">Upload an image and guide the AI's creative process.</p>
              </div>

              {/* User Prompt Input */}
              <div className="space-y-2">
                <label htmlFor="user-prompt" className="text-sm font-medium text-zinc-300">
                  AI Guidance (optional)
                </label>
                <textarea
                  id="user-prompt"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Describe what you want to achieve... e.g., 'Make it look like a vintage oil painting with warm tones'"
                  className="w-full h-24 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none text-sm"
                />
                <p className="text-xs text-zinc-500">
                  Guide the AI's thinking and web search for more tailored suggestions
                </p>
              </div>

              <div
                {...getRootProps()}
                className={cn(
                  "relative aspect-square rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden",
                  isDragActive ? "border-emerald-500 bg-emerald-500/5" : "border-white/10 hover:border-white/20 bg-white/5",
                  image ? "border-none" : ""
                )}
              >
                <input {...getInputProps()} />
                {image ? (
                  <>
                    <img src={image.preview} className="w-full h-full object-cover" alt="Preview" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-sm font-medium">Click to change image</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-zinc-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Drop your image here</p>
                      <p className="text-xs text-zinc-500 mt-1">or click to browse</p>
                    </div>
                  </>
                )}
              </div>

              {image && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleAnalyze}
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors"
                >
                  Analyze & Ideate
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              )}
            </motion.div>
          )}

          {state === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              <div className="relative">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-medium">Analyzing Vision...</h3>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                  {userPrompt ? `Guided by: "${userPrompt}"` : 'Analyzing image content...'}
                </p>
                <p className="text-xs text-zinc-600">
                  AI is searching the web for creative inspiration and trends.
                </p>
              </div>
            </motion.div>
          )}

          {state === 'suggesting' && analysis && (
            <motion.div
              key="suggesting"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-medium">Creative Paths</h2>
                <button 
                  onClick={handleReroll}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  title="Reroll suggestions"
                >
                  <RefreshCw className="w-5 h-5 text-emerald-400" />
                </button>
              </div>

              <div className="grid gap-4">
                {analysis.suggestions.map((suggestion, idx) => (
                  <motion.button
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="group text-left p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg group-hover:text-emerald-400 transition-colors">{suggestion.title}</h4>
                        <p className="text-sm text-zinc-400 leading-relaxed">{suggestion.description}</p>
                      </div>
                      <div className="mt-1 p-1 rounded-full bg-white/5 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-600 group-hover:text-emerald-500/50">Reasoning</p>
                      <p className="text-xs text-zinc-500 mt-1 italic line-clamp-2">{suggestion.reasoning}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {state === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-8"
            >
              <div className="w-full aspect-square rounded-3xl bg-white/5 border border-white/10 overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-sm font-mono text-zinc-500 animate-pulse">GENERATING PIXELS...</p>
                  </div>
                </div>
                {/* Skeleton shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              </div>
              
              <div className="text-center space-y-3">
                <h3 className="text-xl font-medium">Crafting your masterpiece</h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                  Translating "<span className="text-emerald-400">{selectedSuggestion?.title}</span>" into a high-fidelity prompt for Nano Banana Pro.
                </p>
                <div className="pt-4 flex flex-col items-center gap-2">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Model: gemini-3-pro-image-preview</p>
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-500/50 hover:text-emerald-500 flex items-center gap-1"
                  >
                    Billing Info <ExternalLink className="w-2 h-2" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'result' && resultImage && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Behold.</h2>
                <p className="text-zinc-400">Your vision, reimagined through the lens of <span className="text-emerald-400">{selectedSuggestion?.title}</span>.</p>
              </div>

              <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-emerald-500/10">
                <img src={resultImage} className="w-full h-auto" alt="Generated result" />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setState('suggesting')}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Try Another Path
                </button>
                <a 
                  href={resultImage} 
                  download="visioncraft-result.png"
                  className="p-4 bg-emerald-500 text-black rounded-2xl font-bold flex items-center justify-center hover:bg-emerald-400 transition-colors"
                >
                  <Download className="w-6 h-6" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </main>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
