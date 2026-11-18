import React, { useState, useEffect, useRef } from "react";
import ButtonPrimary from "./ButtonPrimary";
import { useGlobalAudio } from "@/app/hooks/useGlobalAudio"; // Import hook yang baru kita buat

const PodcastAudioPlayer = ({
  audioUrl,
  title,
  image,
  subtitle,
  description,
  isPlaying,
  setIsPlaying,
}) => {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showMobileExpanded, setShowMobileExpanded] = useState(false);
  const [hasLoadedPodcast, setHasLoadedPodcast] = useState(false);

  // Gunakan hook untuk mendapatkan referensi audio yang terjamin ada
  const audioRef = useGlobalAudio();
  // Use a ref to track external pause
  const externalPauseRef = useRef(false);

  // Efek utama untuk mengontrol audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioUrl) {
      // Always show player when audioUrl is provided
      setShowPlayer(true);
      setHasLoadedPodcast(true);
      const fullUrl = audioUrl.startsWith("/")
        ? audioUrl
        : `/api/proxy-audio?key=${encodeURIComponent(audioUrl)}`;

      if (audio.src !== window.location.origin + fullUrl) {
        audio.src = fullUrl;
        audio.load();
      }

      if (isPlaying) {
        audio.play().catch((e) => {
          console.error("Audio play error:", e);
          setIsPlaying(false);
        });
      } else {
        audio.pause();
      }
    } else {
      // Only hide player when no audioUrl is provided
      setShowPlayer(false);
      setHasLoadedPodcast(false);
      setIsPlaying(false);
    }
  }, [audioUrl, isPlaying, audioRef, setIsPlaying]);

  // Efek untuk sinkronisasi dengan radio dan update UI
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Pause podcast if radio starts
    const handleRadioPlay = () => {
      setIsPlaying(false);
      externalPauseRef.current = true;
    };
    window.addEventListener("radioPlayRequested", handleRadioPlay);

    // When podcast starts playing, pause radio
    if (isPlaying) {
      window.dispatchEvent(new CustomEvent("podcastPlayRequested"));
    }

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      window.removeEventListener("radioPlayRequested", handleRadioPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [audioRef, setIsPlaying, isPlaying]);

  // Separate effect for handling audio ended with current repeat state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch((e) => {
          console.error("Audio repeat play error:", e);
          setIsPlaying(false);
        });
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioRef, isRepeat, setIsPlaying]);

  // This effect must be at the top level, not inside another useEffect
  useEffect(() => {
    // Only hide player if pause was external (radio play) AND no podcast has been loaded
    if (!isPlaying && externalPauseRef.current && !hasLoadedPodcast) {
      setShowPlayer(false);
      externalPauseRef.current = false;
    }
    // If pause was user-initiated, keep player visible
    // If podcast has been loaded, keep player visible even when paused
  }, [isPlaying, hasLoadedPodcast]);

  // Efek untuk volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = muted ? 0 : volume;
    }
  }, [volume, muted, audioRef]);

  const togglePlay = () => setIsPlaying((p) => !p);
  const handleVolumeChange = (e) => setVolume(parseFloat(e.target.value));
  const toggleMute = () => setMuted((p) => !p);
  const handleSeek = (e) => {
    if (audioRef.current)
      audioRef.current.currentTime = parseFloat(e.target.value);
  };
  
  // Skip functionality
  const skipBackward = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      audioRef.current.currentTime = newTime;
    }
  };
  
  const skipForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
      audioRef.current.currentTime = newTime;
    }
  };
  
  const toggleRepeat = () => setIsRepeat((r) => !r);
  const toggleMobileExpanded = () => setShowMobileExpanded((prev) => !prev);
  
  // Function to clear podcast state (can be called from parent component)
  const clearPodcast = () => {
    setShowPlayer(false);
    setHasLoadedPodcast(false);
    setIsPlaying(false);
    setShowMobileExpanded(false);
    setProgress(0);
    setDuration(0);
  };
  
  const formatTime = (sec) => {
    if (isNaN(sec) || !isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!showPlayer) return null;

  return (
    <>
      {/* Mobile Expanded Overlay */}
      <div 
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ease-out ${
          showMobileExpanded 
            ? 'bg-black/50 pointer-events-auto' 
            : 'bg-transparent pointer-events-none'
        }`} 
        onClick={toggleMobileExpanded}
      >
        <div 
          className={`absolute bottom-0 left-0 right-0 mb-4 bg-white rounded-t-4xl p-6 transition-all duration-300 ease-out ${
            showMobileExpanded 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-full opacity-0'
          }`} 
          onClick={(e) => e.stopPropagation()}
        >
            {/* Close button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={toggleMobileExpanded}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            {/* Podcast Info */}
            <div className={`flex items-center gap-4 mb-6 transition-all duration-500 delay-100 ${
              showMobileExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                <img
                  src={image || "/8eh-real.svg"}
                  alt="cover"
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-gray-800 text-base mb-1">{title}</h3>
                {subtitle && <p className="font-body text-gray-500 text-sm">{subtitle}</p>}
              </div>
            </div>

            {/* Progress Bar */}
            <div className={`mb-6 transition-all duration-500 delay-200 ${
              showMobileExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="flex font-body items-center gap-3 text-xs text-gray-500 mb-2">
                <span>{formatTime(progress)}</span>
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-red-700"
                    style={{
                      background: `linear-gradient(to right, #EA4A30 0%, #EA4A30 ${(progress / (duration || 1)) * 100}%, #e5e7eb ${(progress / (duration || 1)) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={skipBackward}
                className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
                title="Skip backward 10 seconds"
              >
                <img src="/fb.svg" alt="Skip backward" className="w-6 h-6" />
              </button>
              
              <ButtonPrimary
                onClick={togglePlay}
                className="bg-[#D83232] hover:bg-[#B72929] text-white px-4 py-2 rounded-full font-body font-medium transition-colors cursor-pointer items-center gap-2 !w-12 !h-12 !p-0 !rounded-full flex items-center justify-center flex-shrink-0"
                
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                )}
              </ButtonPrimary>
              
              <button
                onClick={skipForward}
                className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
                title="Skip forward 10 seconds"
              >
                <img src="/ff.svg" alt="Skip forward" className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

      {/* Main Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-7/8 md:w-2/3 mb-1 mx-auto rounded-full">
        <div className="bg-white/95 backdrop-blur-sm shadow-md max-w-full mx-auto pl-2 pr-4 py-1 md:py-2 flex flex-col md:flex-row items-center gap-2 md:gap-4 rounded-full border border-zinc-200">
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto md:flex-shrink-0">
            {/* Play button moved here for mobile */}
            <button
              onClick={togglePlay}
              className="md:hidden w-8 h-8 rounded-full ring-1 ring-gray-300 hover:ring-gray-900 text-gray-800 flex items-center justify-center text-xl transition-all flex-shrink-0"
            >
              {isPlaying ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M8 5v14l11-7z"></path>
                </svg>
              )}
            </button>
            <div className="w-10 h-10 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gray-200 rounded-full relative overflow-hidden shadow-sm flex-shrink-0 ">
              <img
                src={image || "/8eh-real.svg"}
                alt="cover"
                className="object-cover w-full h-full"
              />
            </div>
            <div className="text-sm min-w-0 w-48 md:w-60 flex-shrink-0 overflow-hidden">
              <p className="font-heading font-bold text-gray-800 truncate text-xs md:text-sm">{title}</p>
              {subtitle && <p className="font-body text-gray-500 truncate text-xs md:text-sm">{subtitle}</p>}
              {description && (
                <p className="font-body text-gray-400 truncate max-w-xs hidden md:block">
                  {description}
                </p>
              )}
            </div>
            
            {/* Mobile Expand Button */}
            <button
              onClick={toggleMobileExpanded}
              className="md:hidden w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200 flex-shrink-0"
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${showMobileExpanded ? 'rotate-180' : ''}`}
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
            </button>
          </div>
          {/* Controls & Progress - Desktop only */}
          <div className="hidden md:flex flex-1 flex-col items-center justify-center mx-2 min-w-0">
            <div className="flex items-center justify-center w-full gap-6">
              <button
                onClick={skipBackward}
                className="text-gray-500 hover:text-black disabled:opacity-40 text-xl transition-all duration-200 hover:scale-110"
                title="Skip backward 10 seconds"
              >
                <img
                  src="/fb.svg"
                  alt="Skip backward"
                  className="w-5 h-5"
                />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full ring-1 ring-gray-300 hover:ring-gray-900 text-gray-800 flex items-center justify-center text-xl transition-all"
              >
                {isPlaying ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                )}
              </button>
              <button
                onClick={skipForward}
                className="text-gray-500 hover:text-black disabled:opacity-40 text-xl transition-all duration-200 hover:scale-110"
                title="Skip forward 10 seconds"
              >
                <img
                  src="/ff.svg"
                  alt="Skip forward"
                  className="w-5 h-5"
                />
              </button>
              <button
                onClick={toggleRepeat}
                className={`text-xl transition-colors ${
                  isRepeat 
                    ? "text-blue-600 hover:text-blue-700" 
                    : "text-gray-500 hover:text-black"
                }`}
                title={isRepeat ? "Repeat: On" : "Repeat: Off"}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                </svg>
              </button>
            </div>
            <div className="w-full flex items-center gap-2 text-[10px] text-gray-500 mt-2 min-w-0">
              <span className="font-body w-8 text-right flex-shrink-0">
                {formatTime(progress)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={progress}
                onChange={handleSeek}
                className="flex-grow h-3 bg-gray-200 rounded-full relative min-w-0 accent-red-600"
              />
              <span className="font-body w-8 text-left flex-shrink-0">
                {formatTime(duration)}
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 w-32 justify-center">
            <button
              type="button"
              onClick={toggleMute}
              className="text-gray-600 hover:text-black focus:outline-none cursor-pointer"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                  alt="Mute"
                >
                  <path
                    d="M16.5 12a6.5 6.5 0 0 0-6.5-6.5v2A4.5 4.5 0 0 1 14.5 12h2z"
                    fill="#d1d5db"
                  />
                  <path d="M3 9v6h4l5 5V4L7 9H3zm16.5 3a6.5 6.5 0 0 0-6.5-6.5v2A4.5 4.5 0 0 1 17.5 12h2z" />
                  <line
                    x1="19"
                    y1="5"
                    x2="5"
                    y2="19"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 md:w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default PodcastAudioPlayer;
