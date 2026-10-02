import React from 'react';
import { RAVEN_SVG } from '../assets/ravenData.ts';

interface RavenLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export const RavenLogo: React.FC<RavenLogoProps> = ({ className = 'max-h-[25rem] w-full', width = 1300, height = 1210 }) => {
  return (
    <figure className={`flex flex-col justify-center items-center relative ${className}`}>
      <div
        className="w-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: RAVEN_SVG }}
      />
      <figcaption className="w-full flex justify-between items-center mt-4 pt-3 border-t border-[#d6d6d0] text-xs text-[#5e5e59]">
        <span className="font-bold text-[#171717] tracking-widest uppercase">O Inconveniente</span>
        <span>Um olhar. Outra pergunta.</span>
      </figcaption>
    </figure>
  );
};
