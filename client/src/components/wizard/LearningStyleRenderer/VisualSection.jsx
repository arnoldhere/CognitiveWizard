import React, { useState } from "react";
import ImageIcon from "@mui/icons-material/Image";
import CollectionsIcon from "@mui/icons-material/Collections";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
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
    <div className="learning-style-section visual-section-root">
      <div className="section-header">
        <div className="header-icon-pill visual-pill">
          <CollectionsIcon sx={{ fontSize: 20 }} />
          <span>Visual & Project-Based Path</span>
        </div>
        <h2>Visual Diagrams & Image Gallery</h2>
        <p>
          Leverage visual references, diagrams, and project-based storyboards generated for {topic}.
        </p>
      </div>

      {/* Visual Image Carousel */}
      <div className="visual-carousel-container">
        <div className="carousel-main-slide">
          <img
            src={galleryImages[currentImgIdx].image}
            alt={galleryImages[currentImgIdx].title}
            className="carousel-img"
            onError={(e) => {
              e.target.src = defaultVisualCards[0].image;
            }}
          />
          <div className="carousel-slide-overlay">
            <h4>{galleryImages[currentImgIdx].title}</h4>
            <p>{galleryImages[currentImgIdx].description}</p>
          </div>

          {galleryImages.length > 1 && (
            <>
              <button className="carousel-nav-btn prev" onClick={prevSlide}>
                <ArrowBackIosNewIcon fontSize="small" />
              </button>
              <button className="carousel-nav-btn next" onClick={nextSlide}>
                <ArrowForwardIosIcon fontSize="small" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {galleryImages.length > 1 && (
          <div className="carousel-thumbnails">
            {galleryImages.map((item, idx) => (
              <div
                key={idx}
                className={`thumb-item ${idx === currentImgIdx ? "active" : ""}`}
                onClick={() => setCurrentImgIdx(idx)}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  onError={(e) => {
                    e.target.src = defaultVisualCards[0].image;
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Capstone Project Card */}
      <CapstoneSection topic={topic} capstoneData={capstoneData} />
    </div>
  );
}
