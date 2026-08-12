import React, { useState } from "react";
import { Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import CapstoneSection from "../CapstoneSection";

export default function VisualSection({ topic, images = [], capstoneData }) {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  const defaultVisualCards = [
    {
      title: `${topic || "Concept"} Visual Architecture Map`,
      description: "Visual breakdown mapping core entities, APIs, and data flows.",
      image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Interactive Mind Map & Schema",
      description: "Structural layout connecting beginner foundations to advanced topics.",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Portfolio Prototype Storyboard",
      description: "UI/UX and workflow storyboard for your capstone project.",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    },
  ];

  const galleryImages = images.length > 0
    ? images.map((imgUrl, i) => ({
        title: `${topic} Visual Reference ${i + 1}`,
        description: `Agent-curated visual diagram and reference image for ${topic}`,
        image: imgUrl,
      }))
    : defaultVisualCards;

  const nextSlide = () => {
    setCurrentImgIdx((prev) => (prev + 1) % galleryImages.length);
  };

  const prevSlide = () => {
    setCurrentImgIdx((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit">
            <ImageIcon size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Visual & Project-Based Path</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Visual Diagrams & Image Gallery</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Leverage visual references, diagrams, and project-based storyboards generated for {topic}.
          </p>
        </div>

        {/* Visual Image Carousel */}
        <div className="flex flex-col gap-4">
          <div className="relative w-full aspect-video md:aspect-[21/9] rounded-3xl overflow-hidden bg-slate-900 group">
            <img
              src={galleryImages[currentImgIdx].image}
              alt={galleryImages[currentImgIdx].title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
              onError={(e) => {
                e.target.src = defaultVisualCards[0].image;
              }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent pointer-events-none" />
            
            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-10 pointer-events-none">
              <h4 className="text-xl md:text-2xl font-bold text-white mb-2">{galleryImages[currentImgIdx].title}</h4>
              <p className="text-sm md:text-base text-slate-300 max-w-2xl">{galleryImages[currentImgIdx].description}</p>
            </div>

            {galleryImages.length > 1 && (
              <>
                <button 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  onClick={prevSlide}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  onClick={nextSlide}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {galleryImages.map((item, idx) => (
                <div
                  key={idx}
                  className={`relative w-24 h-16 rounded-xl overflow-hidden cursor-pointer shrink-0 transition-all ${
                    idx === currentImgIdx ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 opacity-100" : "opacity-50 hover:opacity-100"
                  }`}
                  onClick={() => setCurrentImgIdx(idx)}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = defaultVisualCards[0].image;
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Capstone Project Card */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <CapstoneSection topic={topic} capstoneData={capstoneData} />
      </div>
    </div>
  );
}
